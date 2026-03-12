import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  MarketCreated
} from "../generated/VoxPredictMarketFactory/VoxPredictMarketFactory";
import { VoxPredictMarket } from "../generated/templates";
import { Market, PlatformStat } from "../generated/schema";

export function handleMarketCreated(event: MarketCreated): void {
  // Carregar ou criar estatísticas da plataforma
  let stats = PlatformStat.load("1");
  if (stats == null) {
    stats = new PlatformStat("1");
    stats.totalMarkets = 0;
    stats.activeMarkets = 0;
    stats.totalVolume = BigInt.fromI32(0);
    stats.totalBettors = 0;
    stats.totalFees = BigInt.fromI32(0);
    stats.lastUpdated = BigInt.fromI32(0);
  }
  
  // Criar novo mercado
  let market = new Market(event.params.marketAddress.toHexString());
  market.address = event.params.marketAddress;
  
  // Carregar dados do contrato
  let marketContract = VoxPredictMarket.bind(event.params.marketAddress);
  
  // Obter informações básicas
  let marketInfo = marketContract.getMarketInfo();
  market.question = marketInfo.value0;
  market.description = marketInfo.value1;
  market.options = marketInfo.value2;
  market.endTime = marketInfo.value3;
  market.totalVolume = BigInt.fromI32(0);
  market.totalBettors = 0;
  
  // Obter informações adicionais
  let category = marketContract.try_category();
  market.category = category.reverted ? "geral" : category.value;
  
  let tags = marketContract.try_getTags();
  market.tags = tags.reverted ? [] : tags.value;
  
  let minBet = marketContract.try_minBet();
  market.minBet = minBet.reverted ? BigInt.fromI32(5000000) : minBet.value; // Default 5 USDT
  
  let maxBet = marketContract.try_maxBet();
  market.maxBet = maxBet.reverted ? BigInt.fromI32(1000000000) : maxBet.value; // Default 1000 USDT
  
  market.creator = event.params.creator;
  market.isActive = true;
  market.isResolved = false;
  market.createdAt = event.block.timestamp;
  
  // Salvar mercado
  market.save();
  
  // Iniciar template para monitorar eventos do mercado
  VoxPredictMarket.create(event.params.marketAddress);
  
  // Atualizar estatísticas da plataforma
  stats.totalMarkets += 1;
  stats.activeMarkets += 1;
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}