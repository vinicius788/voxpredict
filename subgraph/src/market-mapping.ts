import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts";
import {
  BetPlaced,
  MarketResolved,
  Withdrawal
} from "../generated/templates/VoxPredictMarket/VoxPredictMarket";
import { Market, Bet, User, MarketDailySnapshot, PlatformStat } from "../generated/schema";

export function handleBetPlaced(event: BetPlaced): void {
  // Carregar mercado
  let marketAddress = event.address.toHexString();
  let market = Market.load(marketAddress);
  if (market == null) return;
  
  // Atualizar volume total do mercado
  market.totalVolume = market.totalVolume.plus(event.params.amount);
  
  // Criar aposta
  let betId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let bet = new Bet(betId);
  bet.user = event.params.user;
  bet.market = marketAddress;
  bet.option = event.params.option;
  bet.amount = event.params.amount;
  bet.timestamp = event.params.timestamp;
  
  // Carregar ou criar usuário
  let userId = event.params.user.toHexString();
  let user = User.load(userId);
  if (user == null) {
    user = new User(userId);
    user.address = event.params.user;
    user.totalBets = 0;
    user.totalVolume = BigInt.fromI32(0);
    user.winCount = 0;
    user.lossCount = 0;
  }
  
  // Atualizar estatísticas do usuário
  user.totalBets += 1;
  user.totalVolume = user.totalVolume.plus(event.params.amount);
  
  // Verificar se é um novo apostador para este mercado
  let isNewBettor = true;
  let bets = Bet.load(marketAddress + "-" + userId);
  if (bets != null) {
    isNewBettor = false;
  }
  
  if (isNewBettor) {
    market.totalBettors += 1;
  }
  
  // Criar ou atualizar snapshot diário
  let day = event.block.timestamp.toI32() / 86400;
  let dayId = marketAddress + "-" + day.toString();
  let snapshot = MarketDailySnapshot.load(dayId);
  
  if (snapshot == null) {
    snapshot = new MarketDailySnapshot(dayId);
    snapshot.market = marketAddress;
    snapshot.date = new Date(day * 86400 * 1000).toISOString().split('T')[0];
    snapshot.volume = BigInt.fromI32(0);
    snapshot.bettorCount = 0;
    snapshot.simProbability = BigInt.fromI32(5000); // 50.00%
    snapshot.naoProbability = BigInt.fromI32(5000); // 50.00%
  }
  
  snapshot.volume = snapshot.volume.plus(event.params.amount);
  if (isNewBettor) {
    snapshot.bettorCount += 1;
  }
  
  // Atualizar probabilidades
  let marketContract = VoxPredictMarket.bind(event.address);
  let probabilities = marketContract.getProbabilities();
  snapshot.simProbability = probabilities[0];
  snapshot.naoProbability = probabilities[1];
  
  // Salvar entidades
  bet.save();
  user.save();
  market.save();
  snapshot.save();
  
  // Atualizar estatísticas da plataforma
  let stats = PlatformStat.load("1");
  if (stats != null) {
    stats.totalVolume = stats.totalVolume.plus(event.params.amount);
    if (isNewBettor) {
      stats.totalBettors += 1;
    }
    stats.lastUpdated = event.block.timestamp;
    stats.save();
  }
}

export function handleMarketResolved(event: MarketResolved): void {
  // Carregar mercado
  let marketAddress = event.address.toHexString();
  let market = Market.load(marketAddress);
  if (market == null) return;
  
  // Atualizar estado do mercado
  market.isActive = false;
  market.isResolved = true;
  market.winningOption = event.params.winningOption;
  market.resolvedAt = event.params.timestamp;
  
  // Salvar mercado
  market.save();
  
  // Atualizar estatísticas da plataforma
  let stats = PlatformStat.load("1");
  if (stats != null) {
    stats.activeMarkets -= 1;
    
    // Calcular taxa da plataforma (3% das apostas perdedoras)
    let totalWinningBets = BigInt.fromI32(0);
    let totalLosingBets = BigInt.fromI32(0);
    
    // Lógica simplificada - em produção seria mais complexo
    if (event.params.winningOption.equals(BigInt.fromI32(0))) {
      // SIM ganhou
      totalWinningBets = market.totalVolume.times(BigInt.fromI32(market.options.length - 1)).div(BigInt.fromI32(market.options.length));
      totalLosingBets = market.totalVolume.minus(totalWinningBets);
    } else {
      // NÃO ganhou
      totalLosingBets = market.totalVolume.times(BigInt.fromI32(market.options.length - 1)).div(BigInt.fromI32(market.options.length));
      totalWinningBets = market.totalVolume.minus(totalLosingBets);
    }
    
    let fee = totalLosingBets.times(BigInt.fromI32(300)).div(BigInt.fromI32(10000)); // 3%
    stats.totalFees = stats.totalFees.plus(fee);
    stats.lastUpdated = event.block.timestamp;
    stats.save();
  }
}

export function handleWithdrawal(event: Withdrawal): void {
  // Carregar usuário
  let userId = event.params.user.toHexString();
  let user = User.load(userId);
  if (user == null) return;
  
  // Carregar mercado
  let marketAddress = event.address.toHexString();
  let market = Market.load(marketAddress);
  if (market == null) return;
  
  // Atualizar estatísticas do usuário
  if (market.isResolved) {
    // Verificar se o usuário apostou na opção vencedora
    let wonBet = false;
    let bets = Bet.load(marketAddress + "-" + userId);
    if (bets != null && bets.option.equals(market.winningOption as BigInt)) {
      wonBet = true;
      user.winCount += 1;
    } else {
      user.lossCount += 1;
    }
    
    user.save();
  }
}