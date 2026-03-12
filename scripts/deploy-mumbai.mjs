import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const MUMBAI_TOKENS = {
  USDT: "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832",
  USDC: "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62",
  DAI: "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6f",
};

const rpcUrl = process.env.MUMBAI_RPC_URL || process.env.VITE_MUMBAI_RPC_URL;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

if (!rpcUrl) {
  throw new Error("MUMBAI_RPC_URL não configurada.");
}

if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  throw new Error("DEPLOYER_PRIVATE_KEY inválida ou ausente.");
}

const artifactPath = path.resolve(
  process.cwd(),
  "artifacts/src/contracts-p2/PredictionMarket.sol/PredictionMarket.json",
);

if (!fs.existsSync(artifactPath)) {
  throw new Error("Artifact do contrato não encontrado. Rode `npm run hardhat:compile` primeiro.");
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const treasuryAddress = process.env.TREASURY_ADDRESS || wallet.address;

const main = async () => {
  const balance = await wallet.getBalance();
  console.log("Deploying with:", wallet.address);
  console.log("Balance:", ethers.utils.formatEther(balance), "MATIC");

  if (balance.isZero()) {
    throw new Error("Wallet sem MATIC na Mumbai.");
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(treasuryAddress);
  await contract.deployed();

  console.log("PredictionMarket deployed to:", contract.address);
  console.log("Configurando tokens permitidos...");

  await (await contract.setAllowedToken(MUMBAI_TOKENS.USDT, true)).wait();
  await (await contract.setAllowedToken(MUMBAI_TOKENS.USDC, true)).wait();
  await (await contract.setAllowedToken(MUMBAI_TOKENS.DAI, true)).wait();

  console.log("Tokens configurados com sucesso.");
  console.log("\nAtualize o .env com:");
  console.log(`VITE_CONTRACT_ADDRESS=${contract.address}`);
  console.log(`CONTRACT_ADDRESS=${contract.address}`);
  console.log(`TREASURY_ADDRESS=${treasuryAddress}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

