// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ArtworkRegistry is Ownable, ReentrancyGuard {
    struct Artwork {
        string imageHash;
        address owner;
        uint256 timestamp;
        string metadata;
        bool isActive;
    }

    // Mapping from artwork ID to Artwork struct
    mapping(uint256 => Artwork) public artworks;
    
    // Mapping from image hash to artwork ID
    mapping(string => uint256) public hashToArtworkId;
    
    // Counter for artwork IDs
    uint256 private _artworkCounter;
    
    // Events
    event ArtworkRegistered(
        uint256 indexed artworkId,
        string imageHash,
        address indexed owner,
        uint256 timestamp
    );
    
    event ArtworkTransferred(
        uint256 indexed artworkId,
        address indexed previousOwner,
        address indexed newOwner
    );
    
    event ArtworkDeactivated(
        uint256 indexed artworkId,
        address indexed owner
    );

    constructor() {}


    /**
     * @dev Register a new artwork
     * @param _imageHash The hash of the artwork image
     * @param _metadata Additional metadata about the artwork
     */
    function registerArtwork(
        string memory _imageHash,
        string memory _metadata
    ) external nonReentrant {
        require(bytes(_imageHash).length > 0, "Image hash cannot be empty");
        require(hashToArtworkId[_imageHash] == 0, "Artwork already registered");

        _artworkCounter++;
        uint256 newArtworkId = _artworkCounter;

        artworks[newArtworkId] = Artwork({
            imageHash: _imageHash,
            owner: msg.sender,
            timestamp: block.timestamp,
            metadata: _metadata,
            isActive: true
        });

        hashToArtworkId[_imageHash] = newArtworkId;

        emit ArtworkRegistered(
            newArtworkId,
            _imageHash,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Transfer artwork ownership to a new address
     * @param _artworkId The ID of the artwork to transfer
     * @param _newOwner The address of the new owner
     */
    function transferArtwork(
        uint256 _artworkId,
        address _newOwner
    ) external nonReentrant {
        require(_newOwner != address(0), "New owner cannot be zero address");
        require(artworks[_artworkId].isActive, "Artwork is not active");
        require(
            artworks[_artworkId].owner == msg.sender,
            "Only owner can transfer artwork"
        );

        address previousOwner = artworks[_artworkId].owner;
        artworks[_artworkId].owner = _newOwner;

        emit ArtworkTransferred(_artworkId, previousOwner, _newOwner);
    }

    /**
     * @dev Deactivate an artwork
     * @param _artworkId The ID of the artwork to deactivate
     */
    function deactivateArtwork(uint256 _artworkId) external nonReentrant {
        require(artworks[_artworkId].isActive, "Artwork is already inactive");
        require(
            artworks[_artworkId].owner == msg.sender || msg.sender == owner(),
            "Only owner or contract owner can deactivate artwork"
        );

        artworks[_artworkId].isActive = false;

        emit ArtworkDeactivated(_artworkId, artworks[_artworkId].owner);
    }

    /**
     * @dev Get artwork details by ID
     * @param _artworkId The ID of the artwork
     */
    function getArtwork(uint256 _artworkId)
        external
        view
        returns (
            string memory imageHash,
            address owner,
            uint256 timestamp,
            string memory metadata,
            bool isActive
        )
    {
        Artwork memory artwork = artworks[_artworkId];
        return (
            artwork.imageHash,
            artwork.owner,
            artwork.timestamp,
            artwork.metadata,
            artwork.isActive
        );
    }

    /**
     * @dev Get artwork ID by image hash
     * @param _imageHash The hash of the artwork image
     */
    function getArtworkIdByHash(string memory _imageHash)
        external
        view
        returns (uint256)
    {
        return hashToArtworkId[_imageHash];
    }
} 