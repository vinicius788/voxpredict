import hre from "hardhat";

const MUMBAI_TOKENS = {
  USDT: "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832",
  USDC: "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62",
  DAI: "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6f",
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);

  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    throw new Error("Deployer com saldo zero. Abasteça MATIC na Mumbai antes do deploy.");
  }

  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const ContractFactory = await hre.ethers.getContractFactory("PredictionMarket");
  const contract = await ContractFactory.deploy(treasuryAddress);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("PredictionMarket deployed to:", contractAddress);

  console.log("Configurando tokens permitidos...");
  await (await contract.setAllowedToken(MUMBAI_TOKENS.USDT, true)).wait();
  await (await contract.setAllowedToken(MUMBAI_TOKENS.USDC, true)).wait();
  await (await contract.setAllowedToken(MUMBAI_TOKENS.DAI, true)).wait();
  console.log("Tokens configurados com sucesso.");

  console.log("\nAtualize o .env com:");
  console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`TREASURY_ADDRESS=${treasuryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

