const express = require('express');
const router = express.Router();
const tf = require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, '../data.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

let model = null;

// Load the MobileNet model
async function loadModel() {
  if (!model) {
    model = await mobilenet.load();
  }
  return model;
}

// Preprocess image for MobileNet
async function preprocessImage(imagePath) {
  const imageBuffer = await sharp(imagePath)
    .resize(224, 224)
    .toBuffer();
  return tf.node.decodeImage(imageBuffer);
}

// Calculate cosine similarity between two feature vectors
function cosineSimilarity(vec1, vec2) {
  const dotProduct = tf.sum(vec1.mul(vec2));
  const norm1 = tf.sqrt(tf.sum(vec1.square()));
  const norm2 = tf.sqrt(tf.sum(vec2.square()));
  return dotProduct.div(norm1.mul(norm2));
}

// Get image features using MobileNet
async function getImageFeatures(imagePath) {
  const model = await loadModel();
  const image = await preprocessImage(imagePath);
  const features = await model.infer(image, { embedding: true });
  image.dispose();
  return features;
}

// Compare two images and return similarity score
router.post('/compare', async (req, res) => {
  try {
    const { image1, image2 } = req.body;
    
    if (!image1 || !image2) {
      return res.status(400).json({ error: 'Both image paths are required' });
    }

    const image1Path = path.join(UPLOADS_DIR, image1);
    const image2Path = path.join(UPLOADS_DIR, image2);

    if (!fs.existsSync(image1Path) || !fs.existsSync(image2Path)) {
      return res.status(404).json({ error: 'One or both images not found' });
    }

    const features1 = await getImageFeatures(image1Path);
    const features2 = await getImageFeatures(image2Path);

    const similarity = await cosineSimilarity(features1, features2);
    const similarityScore = await similarity.data();

    features1.dispose();
    features2.dispose();
    similarity.dispose();

    res.json({
      similarity: similarityScore[0],
      isSimilar: similarityScore[0] > 0.85 // Threshold can be adjusted
    });
  } catch (error) {
    console.error('Similarity check error:', error);
    res.status(500).json({ error: 'Error processing similarity check' });
  }
});

// Check for similar images in the database
router.post('/check-database', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const imagePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Read existing data
    let existingData = [];
    if (fs.existsSync(DATA_FILE)) {
      existingData = JSON.parse(fs.readFileSync(DATA_FILE));
    }

    const targetFeatures = await getImageFeatures(imagePath);
    const similarImages = [];

    for (const item of existingData) {
      if (item.filename === filename) continue;

      const comparePath = path.join(UPLOADS_DIR, item.filename);
      if (!fs.existsSync(comparePath)) continue;

      const compareFeatures = await getImageFeatures(comparePath);
      const similarity = await cosineSimilarity(targetFeatures, compareFeatures);
      const similarityScore = await similarity.data();

      compareFeatures.dispose();
      similarity.dispose();

      if (similarityScore[0] > 0.85) {
        similarImages.push({
          filename: item.filename,
          similarity: similarityScore[0],
          owner: item.owner,
          timestamp: item.timestamp
        });
      }
    }

    targetFeatures.dispose();

    res.json({
      matches: similarImages,
      totalMatches: similarImages.length
    });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({ error: 'Error checking database for similar images' });
  }
});

module.exports = router; 