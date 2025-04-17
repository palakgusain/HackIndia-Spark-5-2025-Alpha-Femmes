const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x88581f1A6aC30D222FA438F6E27964607dE4a864";
const ABI_PATH = path.join(__dirname, "../artifacts/contracts/ArtworkRegistry.sol/ArtworkRegistry.json");

const abi = JSON.parse(fs.readFileSync(ABI_PATH)).abi;

class BlockchainService {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC);
    }

    connectWallet(privateKey) {
        return new ethers.Wallet(privateKey, this.provider);
    }

    async getContract(privateKey) {
        const wallet = this.connectWallet(privateKey);
        return new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    }

    async registerArtwork(imageHash, metadata, privateKey) {
        try {
            const contract = await this.getContract(privateKey);
            const tx = await contract.registerArtwork(imageHash, metadata);
            const receipt = await tx.wait();

            const artworkId = receipt.events[0].args.artworkId.toString();

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                artworkId
            };
        } catch (error) {
            console.error("Error registering artwork:", error);
            return { success: false, error: error.message };
        }
    }

    async getArtworkIdByHash(imageHash) {
        try {
            const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, this.provider);
            const artworkId = await contract.getArtworkIdByHash(imageHash);
            return { success: true, artworkId: artworkId.toString() };
        } catch (error) {
            console.error("Error getting artwork ID:", error);
            return { success: false, error: error.message };
        }
    }

    async getArtwork(artworkId) {
        try {
            const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, this.provider);
            const [imageHash, owner, timestamp, metadata, isActive] = await contract.getArtwork(artworkId);
            return {
                success: true,
                data: {
                    imageHash,
                    owner,
                    timestamp: timestamp.toString(),
                    metadata,
                    isActive
                }
            };
        } catch (error) {
            console.error("Error getting artwork:", error);
            return { success: false, error: error.message };
        }
    }

    async transferArtwork(artworkId, newOwner, privateKey) {
        try {
            const contract = await this.getContract(privateKey);
            const tx = await contract.transferArtwork(artworkId, newOwner);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                from: tx.from,
                to: newOwner
            };
        } catch (error) {
            console.error("Error transferring artwork:", error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new BlockchainService();
