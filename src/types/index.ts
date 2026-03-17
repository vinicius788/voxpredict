export interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  endDate: string;
  resolvedAt?: string | null;
  totalVolume: number;
  totalYes?: number;
  totalNo?: number;
  yesPool?: number;
  noPool?: number;
  contractAddress?: string;
  onChainId?: number | null;
  totalBettors: number;
  simOdds: number;
  naoOdds: number;
  yesOdds?: number;
  noOdds?: number;
  simProbability: number;
  naoProbability: number;
  yesProbability?: number;
  noProbability?: number;
  status: 'active' | 'closed' | 'resolved';
  outcome?: 'YES' | 'NO' | 'CANCELLED' | string | null;
  token?: string;
  createdAt?: string;
  tags?: string[];
  estimatedVolume?: number;
}

export interface User {
  id: string;
  address: string;
  username?: string;
  totalPredictions: number;
  successRate: number;
  totalVolume: number;
  roi: number;
}

export interface Notification {
  id: string;
  type: 'market_ending' | 'volume_spike' | 'achievement' | 'result';
  title: string;
  message: string;
  createdAt?: string;
  timestamp?: Date;
  read: boolean;
}

export interface VolumePoint {
  date: string;
  volume: number;
  simProbability: number;
  naoProbability: number;
}
