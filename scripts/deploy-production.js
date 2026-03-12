const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment to", network.name);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy USDT Mock (only on testnets)
  let usdtAddress;
  if (network.name === "mumbai" || network.name === "sepolia") {
    console.log("Deploying MockUSDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.deployed();
    usdtAddress = mockUSDT.address;
    console.log("MockUSDT deployed to:", usdtAddress);
  } else if (network.name === "polygon") {
    usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // Polygon USDT
  } else if (network.name === "base") {
    usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Base USDT
  } else if (network.name === "mainnet") {
    usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Ethereum USDT
  } else {
    throw new Error("Network not supported or USDT address not defined");
  }
  
  // Deploy Treasury
  console.log("Deploying VoxPredictTreasury...");
  const Treasury = await ethers.getContractFactory("VoxPredictTreasury");
  const treasury = await Treasury.deploy(usdtAddress);
  await treasury.deployed();
  console.log("VoxPredictTreasury deployed to:", treasury.address);
  
  // Deploy Market Factory
  console.log("Deploying VoxPredictMarketFactory...");
  const MarketFactory = await ethers.getContractFactory("VoxPredictMarketFactory");
  const marketFactory = await MarketFactory.deploy(usdtAddress, treasury.address);
  await marketFactory.deployed();
  console.log("VoxPredictMarketFactory deployed to:", marketFactory.address);
  
  // Deploy Vault
  console.log("Deploying VoxPredictVault...");
  const Vault = await ethers.getContractFactory("VoxPredictVault");
  const vault = await Vault.deploy(usdtAddress, treasury.address);
  await vault.deployed();
  console.log("VoxPredictVault deployed to:", vault.address);
  
  // Authorize Market Factory in Treasury
  console.log("Authorizing Market Factory in Treasury...");
  await treasury.authorizeMarket(marketFactory.address);
  console.log("Market Factory authorized in Treasury");
  
  // Update contract addresses
  const addresses = {
    USDT: usdtAddress,
    VoxPredictTreasury: treasury.address,
    VoxPredictVault: vault.address,
    VoxPredictMarketFactory: marketFactory.address
  };
  
  // Save addresses to file
  const addressesPath = path.join(__dirname, "../src/contracts/addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Contract addresses saved to:", addressesPath);
  
  console.log("Deployment completed successfully!");
  console.log("------------------------------------");
  console.log("USDT:", usdtAddress);
  console.log("VoxPredictTreasury:", treasury.address);
  console.log("VoxPredictVault:", vault.address);
  console.log("VoxPredictMarketFactory:", marketFactory.address);
  console.log("------------------------------------");
  
  // Wait for block confirmations for verification
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds
  
  // Verify contracts on Etherscan/Polygonscan/Basescan
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Verifying contracts on explorer...");
    
    try {
      await hre.run("verify:verify", {
        address: treasury.address,
        constructorArguments: [usdtAddress],
        contract: "src/contracts/VoxPredictTreasury.sol:VoxPredictTreasury"
      });
      console.log("Treasury verified successfully");
    } catch (error) {
      console.error("Error verifying Treasury:", error);
    }
    
    try {
      await hre.run("verify:verify", {
        address: marketFactory.address,
        constructorArguments: [usdtAddress, treasury.address],
        contract: "src/contracts/VoxPredictMarketFactory.sol:VoxPredictMarketFactory"
      });
      console.log("Market Factory verified successfully");
    } catch (error) {
      console.error("Error verifying Market Factory:", error);
    }
    
    try {
      await hre.run("verify:verify", {
        address: vault.address,
        constructorArguments: [usdtAddress, treasury.address],
        contract: "src/contracts/VoxPredictVault.sol:VoxPredictVault"
      });
      console.log("Vault verified successfully");
    } catch (error) {
      console.error("Error verifying Vault:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });