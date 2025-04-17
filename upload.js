const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const blockchainService = require('../services/blockchain');

const DATA_FILE = path.join(__dirname, '../data.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Set up multer for file upload with file type validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const metadata = JSON.stringify({
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      description: req.body.description || '',
      tags: req.body.tags ? req.body.tags.split(',') : []
    });

    const blockchainResult = await blockchainService.registerArtwork(
      hash,
      metadata,
      req.body.privateKey || '0x0000000000000000000000000000000000000000000000000000000000000000'
    );

    const fileData = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      timestamp: new Date().toISOString(),
      hash: hash,
      size: req.file.size,
      mimetype: req.file.mimetype,
      owner: req.body.owner || 'anonymous',
      description: req.body.description || '',
      tags: req.body.tags ? req.body.tags.split(',') : [],
      status: 'active',
      blockchainTx: blockchainResult.transactionHash
    };

    let existingData = [];
    if (fs.existsSync(DATA_FILE)) {
      existingData = JSON.parse(fs.readFileSync(DATA_FILE));
    }

    const isDuplicate = existingData.some(item => item.hash === hash);
    if (isDuplicate) fileData.status = 'duplicate';

    existingData.push(fileData);
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));

    res.status(200).json({
      message: 'File uploaded and recorded successfully!',
      data: fileData,
      blockchain: blockchainResult
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error processing file upload' });
  }
});

// Get all uploaded files
router.get('/', (req, res) => {
  try {
    let existingData = [];
    if (fs.existsSync(DATA_FILE)) {
      existingData = JSON.parse(fs.readFileSync(DATA_FILE));
    }
    res.json(existingData);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving files' });
  }
});

// Get artwork details from blockchain
router.get('/:filename/blockchain', async (req, res) => {
  try {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const blockchainResult = await blockchainService.getArtworkIdByHash(hash);
    if (!blockchainResult.success) {
      return res.status(404).json({ error: 'Artwork not found on blockchain' });
    }

    const artworkDetails = await blockchainService.getArtwork(blockchainResult.artworkId);
    res.json(artworkDetails);
  } catch (error) {
    console.error('Blockchain query error:', error);
    res.status(500).json({ error: 'Error querying blockchain' });
  }
});

// ✅ THIS IS THE FIXED PART — was app.get before
router.get('/uploads', (req, res) => {
  const filePath = path.join(__dirname, '../data.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Could not read upload data' });

    const uploads = JSON.parse(data);
    res.json(uploads);
  });
});

module.exports = router;
