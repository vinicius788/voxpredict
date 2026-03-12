export const PREDICTION_MARKET_ABI = [
  {
    name: 'createMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_question', type: 'string' },
      { name: '_description', type: 'string' },
      { name: '_category', type: 'string' },
      { name: '_endTime', type: 'uint256' },
      { name: '_token', type: 'address' },
      { name: '_minBet', type: 'uint256' },
      { name: '_maxBet', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'placeBet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_marketId', type: 'uint256' },
      { name: '_isYes', type: 'bool' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claimWinnings',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_marketId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claimRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_marketId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'resolveMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_marketId', type: 'uint256' },
      { name: '_outcome', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'getOdds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_marketId', type: 'uint256' }],
    outputs: [
      { name: 'yesOdds', type: 'uint256' },
      { name: 'noOdds', type: 'uint256' },
    ],
  },
  {
    name: 'calculateWinnings',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_marketId', type: 'uint256' },
      { name: '_user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'positions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [
      { name: 'yesAmount', type: 'uint256' },
      { name: 'noAmount', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
    ],
  },
  {
    name: 'markets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'question', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'totalYesAmount', type: 'uint256' },
      { name: 'totalNoAmount', type: 'uint256' },
      { name: 'outcome', type: 'uint8' },
      { name: 'resolved', type: 'bool' },
      { name: 'token', type: 'address' },
    ],
  },
  {
    name: 'BetPlaced',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'isYes', type: 'bool', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MarketResolved',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'outcome', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'WinningsClaimed',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;
