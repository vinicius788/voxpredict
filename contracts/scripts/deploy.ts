import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import hre from "hardhat";
import { ethers } from "ethers";

dotenv.config();

const networkName = (hre.network?.name || process.env.HARDHAT_NETWORK || "amoy").toLowerCase();
const isMainnet = networkName === "polygon" || networkName === "mainnet";

const rpcUrl = isMainnet
  ? (process.env.POLYGON_MAINNET_RPC_URL || process.env.POLYGON_RPC_URL)
  : (process.env.POLYGON_AMOY_RPC_URL || process.env.MUMBAI_RPC_URL || process.env.POLYGON_RPC_URL);
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const treasuryAddress = process.env.TREASURY_ADDRESS;

const MAINNET_TOKENS: Record<string, string> = {
  USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
};

const AMOY_TOKENS: Record<string, string> = {
  USDT: "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832",
  USDC: "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62",
  DAI: "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6f",
};

const selectedTokens = isMainnet ? MAINNET_TOKENS : AMOY_TOKENS;

if (!rpcUrl) {
  throw new Error(
    isMainnet
      ? "POLYGON_MAINNET_RPC_URL/POLYGON_RPC_URL não configurada."
      : "POLYGON_AMOY_RPC_URL/MUMBAI_RPC_URL não configurada.",
  );
}

if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  throw new Error("DEPLOYER_PRIVATE_KEY inválida ou ausente.");
}

if (!treasuryAddress || !ethers.utils.isAddress(treasuryAddress)) {
  throw new Error("TREASURY_ADDRESS inválido ou ausente.");
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

const main = async () => {
  const balance = await wallet.getBalance();
  console.log("Deploying with:", wallet.address);
  console.log("Balance:", ethers.utils.formatEther(balance), "MATIC");
  console.log("Network:", isMainnet ? "Polygon Mainnet (137)" : "Polygon Amoy (80002)");
  console.log("Treasury:", treasuryAddress);

  if (balance.isZero()) {
    throw new Error("Wallet sem MATIC para deploy.");
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const maxPriorityFeePerGas = ethers.utils.parseUnits(isMainnet ? "35" : "25", "gwei");
  const maxFeePerGas = ethers.utils.parseUnits(isMainnet ? "50" : "26", "gwei");

  console.log("Gas config:", {
    maxPriorityFeePerGas: `${ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei")} gwei`,
    maxFeePerGas: `${ethers.utils.formatUnits(maxFeePerGas, "gwei")} gwei`,
  });

  const contract = await factory.deploy(treasuryAddress, {
    maxPriorityFeePerGas,
    maxFeePerGas,
  });
  await contract.deployed();

  for (const [symbol, tokenAddress] of Object.entries(selectedTokens)) {
    if (!ethers.utils.isAddress(tokenAddress)) continue;
    const tx = await contract.setAllowedToken(tokenAddress, true, {
      maxPriorityFeePerGas,
      maxFeePerGas,
    });
    await tx.wait();
    console.log(`Token ${symbol} permitido: ${tokenAddress}`);
  }

  console.log("PredictionMarket deployed to:", contract.address);
  console.log("Network:", isMainnet ? "Polygon Mainnet (137)" : "Polygon Amoy (80002)");
  console.log("Treasury:", treasuryAddress);
  console.log("\nAtualize o .env com:");
  console.log(`VITE_CONTRACT_ADDRESS=${contract.address}`);
  console.log(`CONTRACT_ADDRESS=${contract.address}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
