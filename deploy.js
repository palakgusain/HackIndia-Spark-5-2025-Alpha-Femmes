const hre = require("hardhat");

async function main() {
  console.log("Deploying ArtworkRegistry contract...");

  const ArtworkRegistry = await hre.ethers.getContractFactory("ArtworkRegistry");
  const artworkRegistry = await ArtworkRegistry.deploy();

  await artworkRegistry.deployed();

  console.log("ArtworkRegistry deployed to:", artworkRegistry.address);
  console.log("Transaction hash:", artworkRegistry.deployTransaction.hash);

  // Wait for a few block confirmations
  await artworkRegistry.deployTransaction.wait(5);

  console.log("Contract deployment confirmed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 