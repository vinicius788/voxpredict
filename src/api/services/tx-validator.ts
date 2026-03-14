import { BigNumber, ethers } from 'ethers';
import { PREDICTION_MARKET_ABI } from '../../lib/abis/PredictionMarket.abi';

export interface BetValidation {
  valid: boolean;
  marketId?: number;
  user?: string;
  amount?: BigNumber;
  side?: boolean;
  error?: string;
}

export interface ClaimValidation {
  valid: boolean;
  amount?: BigNumber;
  error?: string;
}

const getRpcUrl = () =>
  process.env.POLYGON_RPC_URL ||
  process.env.MUMBAI_RPC_URL ||
  process.env.VITE_POLYGON_RPC_URL ||
  process.env.VITE_MUMBAI_RPC_URL ||
  '';

const getContractAddress = () =>
  (process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS || '').toLowerCase();

const getProvider = () => {
  const rpcUrl = getRpcUrl();
  if (!rpcUrl) {
    throw new Error('RPC URL nao configurada (POLYGON_RPC_URL/MUMBAI_RPC_URL).');
  }
  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

const getContract = (provider: ethers.providers.JsonRpcProvider) => {
  const contractAddress = getContractAddress();
  if (!contractAddress || !ethers.utils.isAddress(contractAddress)) {
    throw new Error('CONTRACT_ADDRESS invalido ou nao configurado.');
  }

  return new ethers.Contract(contractAddress, PREDICTION_MARKET_ABI as any, provider);
};

const findEventLog = (
  receipt: ethers.providers.TransactionReceipt,
  contract: ethers.Contract,
  eventName: string,
) => {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === eventName) {
        return parsed;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  return null;
};

export async function validateBetTx(
  txHash: string,
  expectedUser: string,
  expectedMarketId: number,
  expectedAmount: BigNumber,
  expectedSide: boolean,
): Promise<BetValidation> {
  try {
    const provider = getProvider();
    const contract = getContract(provider);
    const expectedContract = getContractAddress();

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return { valid: false, error: 'Transacao nao encontrada' };
    if (receipt.status !== 1) return { valid: false, error: 'Transacao falhou' };

    if (!receipt.to || receipt.to.toLowerCase() !== expectedContract) {
      return { valid: false, error: 'Transacao nao foi para o contrato correto' };
    }

    const tx = await provider.getTransaction(txHash);
    if (!tx?.from || tx.from.toLowerCase() !== expectedUser.toLowerCase()) {
      return { valid: false, error: 'Transacao nao enviada pela carteira esperada' };
    }

    const betLog = findEventLog(receipt, contract, 'BetPlaced');
    if (!betLog) {
      return { valid: false, error: 'Evento BetPlaced nao encontrado' };
    }

    const marketId = Number((betLog.args.marketId as BigNumber).toString());
    const user = String(betLog.args.user).toLowerCase();
    const amount = betLog.args.amount as BigNumber;
    const side = Boolean(betLog.args.isYes);

    if (marketId !== expectedMarketId) {
      return { valid: false, error: 'marketId nao confere' };
    }

    if (user !== expectedUser.toLowerCase()) {
      return { valid: false, error: 'usuario nao confere' };
    }

    if (!amount.eq(expectedAmount)) {
      return { valid: false, error: 'amount nao confere' };
    }

    if (side !== expectedSide) {
      return { valid: false, error: 'side nao confere' };
    }

    return { valid: true, marketId, user, amount, side };
  } catch (err) {
    return { valid: false, error: `Erro ao validar bet tx: ${String(err)}` };
  }
}

export async function validateClaimTx(
  txHash: string,
  expectedUser: string,
  expectedMarketId: number,
): Promise<ClaimValidation> {
  try {
    const provider = getProvider();
    const contract = getContract(provider);
    const expectedContract = getContractAddress();

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return { valid: false, error: 'Transacao nao encontrada' };
    if (receipt.status !== 1) return { valid: false, error: 'Transacao falhou' };

    if (!receipt.to || receipt.to.toLowerCase() !== expectedContract) {
      return { valid: false, error: 'Transacao nao foi para o contrato correto' };
    }

    const tx = await provider.getTransaction(txHash);
    if (!tx?.from || tx.from.toLowerCase() !== expectedUser.toLowerCase()) {
      return { valid: false, error: 'Transacao nao enviada pela carteira esperada' };
    }

    const claimLog = findEventLog(receipt, contract, 'WinningsClaimed');
    if (!claimLog) {
      return { valid: false, error: 'Evento WinningsClaimed nao encontrado' };
    }

    const marketId = Number((claimLog.args.marketId as BigNumber).toString());
    const user = String(claimLog.args.user).toLowerCase();
    const amount = claimLog.args.amount as BigNumber;

    if (marketId !== expectedMarketId) {
      return { valid: false, error: 'marketId nao confere' };
    }

    if (user !== expectedUser.toLowerCase()) {
      return { valid: false, error: 'usuario nao confere' };
    }

    return { valid: true, amount };
  } catch (err) {
    return { valid: false, error: `Erro ao validar claim tx: ${String(err)}` };
  }
}
