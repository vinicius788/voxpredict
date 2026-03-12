// Script para verificar contratos no Etherscan/Polygonscan/Basescan
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Iniciando verificação dos contratos...");
  
  // Carregar endereços dos contratos
  const addressesPath = path.join(__dirname, "../src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  // Obter a rede atual
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Rede: ${network.name} (${network.chainId})`);
  
  // Verificar VoxPredictTreasury
  console.log("Verificando VoxPredictTreasury...");
  try {
    await hre.run("verify:verify", {
      address: addresses.VoxPredictTreasury,
      constructorArguments: [addresses.USDT],
    });
    console.log("VoxPredictTreasury verificado com sucesso!");
  } catch (error) {
    console.error("Erro ao verificar VoxPredictTreasury:", error.message);
  }
  
  // Verificar VoxPredictMarketFactory
  console.log("Verificando VoxPredictMarketFactory...");
  try {
    await hre.run("verify:verify", {
      address: addresses.VoxPredictMarketFactory,
      constructorArguments: [addresses.USDT, addresses.VoxPredictTreasury],
    });
    console.log("VoxPredictMarketFactory verificado com sucesso!");
  } catch (error) {
    console.error("Erro ao verificar VoxPredictMarketFactory:", error.message);
  }
  
  // Verificar VoxPredictVault
  console.log("Verificando VoxPredictVault...");
  try {
    await hre.run("verify:verify", {
      address: addresses.VoxPredictVault,
      constructorArguments: [addresses.USDT, addresses.VoxPredictTreasury],
    });
    console.log("VoxPredictVault verificado com sucesso!");
  } catch (error) {
    console.error("Erro ao verificar VoxPredictVault:", error.message);
  }
  
  console.log("Processo de verificação concluído!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });