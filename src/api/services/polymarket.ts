const GAMMA_API = 'https://gamma-api.polymarket.com';
const DATA_API = 'https://data-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface PolymarketEventSummary {
  id: string;
  slug: string;
  title: string;
  volume: number;
  volume24hr: number;
  commentCount: number;
}

export interface PolymarketMarket {
  id?: string;
  question: string;
  slug?: string;
  conditionId?: string;
  description?: string;
  outcomePrices?: string | string[] | null;
  clobTokenIds?: string | string[] | null;
  volume?: number | string | null;
  volumeNum?: number;
  volume24hr?: number | string | null;
  active?: boolean;
  closed?: boolean;
  endDate?: string;
  bestBid?: number;
  bestAsk?: number;
  events?: PolymarketEventSummary[];
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  volume: number;
  volume24hr: number;
  liquidity: number;
  commentCount: number;
  markets: PolymarketMarket[];
}

export interface PolymarketPricePoint {
  t: number;
  p: number;
}

export interface PolymarketComment {
  id: string;
  content: string;
  createdAt: string;
  userName: string | null;
  userAddress: string | null;
}

export interface PolymarketLiveVolume {
  total: number;
  markets: Array<{
    market: string;
    value: number;
  }>;
}

export interface PolymarketLeaderboardEntry {
  rank: number;
  proxyWalletAddress: string;
  userName: string | null;
  pnl: number;
  volume: number;
  percentPositive: number;
  verifiedBadge: boolean;
}

export interface PolymarketProfile {
  name: string | null;
  pseudonym: string | null;
  proxyWalletAddress: string;
  verifiedBadge: boolean;
  marketsTraded: number;
  currentValue: number;
  recentClosedCount: number;
  winRate: number;
  estimatedVolume: number;
  realizedPnl: number;
}

type PublicSearchResponse = {
  events?: JsonValue[];
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const clampProbability = (value: number) => {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
};

const parseJsonArray = (input: unknown): unknown[] => {
  if (Array.isArray(input)) return input;

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const normalizeEventSummary = (value: unknown): PolymarketEventSummary | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const title = String(candidate.title || '').trim();
  const slug = String(candidate.slug || '').trim();
  if (!title || !slug) return null;

  return {
    id: String(candidate.id || slug),
    slug,
    title,
    volume: toNumber(candidate.volume),
    volume24hr: toNumber(candidate.volume24hr),
    commentCount: Math.max(0, Math.floor(toNumber(candidate.commentCount))),
  };
};

const normalizeMarket = (value: unknown): PolymarketMarket | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const question = String(candidate.question || '').trim();
  if (!question) return null;

  const events = Array.isArray(candidate.events)
    ? candidate.events
        .map(normalizeEventSummary)
        .filter((event): event is PolymarketEventSummary => Boolean(event))
    : [];

  return {
    id: candidate.id ? String(candidate.id) : undefined,
    question,
    slug: candidate.slug ? String(candidate.slug) : undefined,
    conditionId: candidate.conditionId ? String(candidate.conditionId) : undefined,
    description: candidate.description ? String(candidate.description) : undefined,
    outcomePrices:
      typeof candidate.outcomePrices === 'string' || Array.isArray(candidate.outcomePrices)
        ? (candidate.outcomePrices as string | string[])
        : null,
    clobTokenIds:
      typeof candidate.clobTokenIds === 'string' || Array.isArray(candidate.clobTokenIds)
        ? (candidate.clobTokenIds as string | string[])
        : null,
    volume: typeof candidate.volume === 'string' || typeof candidate.volume === 'number' ? candidate.volume : 0,
    volumeNum: toNumber(candidate.volumeNum ?? candidate.volume),
    volume24hr:
      typeof candidate.volume24hr === 'string' || typeof candidate.volume24hr === 'number'
        ? candidate.volume24hr
        : 0,
    active: candidate.active === undefined ? true : Boolean(candidate.active),
    closed: Boolean(candidate.closed),
    endDate: candidate.endDate ? String(candidate.endDate) : undefined,
    bestBid: toNumber(candidate.bestBid),
    bestAsk: toNumber(candidate.bestAsk),
    events,
  };
};

const normalizeEvent = (value: unknown): PolymarketEvent | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const title = String(candidate.title || '').trim();
  const slug = String(candidate.slug || '').trim();

  if (!title || !slug) return null;

  const markets = Array.isArray(candidate.markets)
    ? candidate.markets.map(normalizeMarket).filter((market): market is PolymarketMarket => Boolean(market))
    : [];

  return {
    id: String(candidate.id || slug),
    title,
    slug,
    volume: toNumber(candidate.volume),
    volume24hr: toNumber(candidate.volume24hr),
    liquidity: toNumber(candidate.liquidity),
    commentCount: Math.max(0, Math.floor(toNumber(candidate.commentCount))),
    markets,
  };
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const normalizeMarketList = (payload: unknown) => {
  if (!Array.isArray(payload)) return [];
  return payload
    .map(normalizeMarket)
    .filter((market): market is PolymarketMarket => Boolean(market));
};

const intervalForDays = (days: number) => {
  if (days <= 1) return '1d';
  if (days <= 7) return '1w';
  if (days <= 30) return '1m';
  return 'max';
};

const isHexWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

export async function searchPolymarketEvents(query: string, limit = 5) {
  const cleaned = query.trim();
  if (!cleaned) return [];

  const url =
    `${GAMMA_API}/public-search?` +
    `q=${encodeURIComponent(cleaned)}&` +
    `events_status=active&` +
    `limit_per_type=${Math.max(1, Math.min(limit, 20))}`;

  const payload = await fetchJson<PublicSearchResponse>(url);
  if (!payload?.events?.length) return [];

  return payload.events
    .map(normalizeEvent)
    .filter((event): event is PolymarketEvent => Boolean(event))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

export async function getTrendingPolymarketEvents(limit = 10) {
  const url =
    `${GAMMA_API}/events?` +
    `limit=${Math.max(1, Math.min(limit, 100))}&` +
    'active=true&closed=false&order=volume&ascending=false';

  const payload = await fetchJson<JsonValue[]>(url);
  if (!Array.isArray(payload)) return [];

  return payload
    .map(normalizeEvent)
    .filter((event): event is PolymarketEvent => Boolean(event))
    .slice(0, limit);
}

export async function searchPolymarketMarkets(query: string, limit = 5) {
  const cleaned = query.trim();
  if (!cleaned) return [];

  const payload = await fetchJson<JsonValue[]>(
    `${GAMMA_API}/markets?search=${encodeURIComponent(cleaned)}&limit=${Math.max(1, Math.min(limit * 4, 25))}&active=true`,
  );

  const markets = normalizeMarketList(payload)
    .filter((market) => market.active !== false && market.closed !== true)
    .sort((a, b) => (b.volumeNum || 0) - (a.volumeNum || 0));

  if (markets.length > 0) {
    return markets.slice(0, limit);
  }

  const eventMatches = await searchPolymarketEvents(cleaned, limit);
  return eventMatches
    .flatMap((event) =>
      event.markets.map((market) => ({
        ...market,
        events: [
          {
            id: event.id,
            slug: event.slug,
            title: event.title,
            volume: event.volume,
            volume24hr: event.volume24hr,
            commentCount: event.commentCount,
          },
        ],
      })),
    )
    .filter((market) => market.active !== false)
    .slice(0, limit);
}

export async function getPolymarketMidpoint(tokenId: string) {
  const cleaned = tokenId.trim();
  if (!cleaned) return null;

  const payload = await fetchJson<{ mid?: string | number }>(`${CLOB_API}/midpoint?token_id=${encodeURIComponent(cleaned)}`);
  if (!payload?.mid) return null;

  const midpoint = toNumber(payload.mid);
  return midpoint > 0 && midpoint < 1 ? midpoint : null;
}

export async function getPolymarketPriceHistory(tokenId: string, days = 30): Promise<PolymarketPricePoint[]> {
  const cleaned = tokenId.trim();
  if (!cleaned) return [];

  const interval = intervalForDays(days);
  const payload = await fetchJson<{ history?: Array<{ t?: number; p?: number }>; error?: string }>(
    `${CLOB_API}/prices-history?market=${encodeURIComponent(cleaned)}&interval=${interval}&fidelity=60`,
  );

  if (!payload?.history?.length) return [];

  return payload.history
    .map((point) => ({
      t: Math.floor(toNumber(point.t)),
      p: clampProbability(toNumber(point.p)),
    }))
    .filter((point) => point.t > 0);
}

export async function getEventLiveVolume(eventId: string | number): Promise<PolymarketLiveVolume | null> {
  const cleaned = String(eventId).trim();
  if (!cleaned) return null;

  const payload = await fetchJson<Array<{ total?: number; markets?: Array<{ market?: string; value?: number }> }>>(
    `${DATA_API}/live-volume?id=${encodeURIComponent(cleaned)}`,
  );

  const first = Array.isArray(payload) ? payload[0] : null;
  if (!first) return null;

  return {
    total: toNumber(first.total),
    markets: Array.isArray(first.markets)
      ? first.markets
          .map((item) => ({
            market: String(item.market || ''),
            value: toNumber(item.value),
          }))
          .filter((item) => Boolean(item.market))
      : [],
  };
}

export async function getPolymarketComments(eventId: string | number, limit = 5): Promise<PolymarketComment[]> {
  const cleaned = String(eventId).trim();
  if (!cleaned) return [];

  const payload = await fetchJson<
    Array<{
      id?: string;
      body?: string | null;
      createdAt?: string | null;
      userAddress?: string | null;
      profile?: { name?: string | null; pseudonym?: string | null } | null;
    }>
  >(
    `${GAMMA_API}/comments?parent_entity_type=Event&parent_entity_id=${encodeURIComponent(cleaned)}&limit=${Math.max(
      1,
      Math.min(limit, 20),
    )}&order=createdAt&ascending=false`,
  );

  if (!Array.isArray(payload)) return [];

  return payload
    .map((comment) => ({
      id: String(comment.id || ''),
      content: String(comment.body || '').trim(),
      createdAt: String(comment.createdAt || ''),
      userName: comment.profile?.name || comment.profile?.pseudonym || null,
      userAddress: comment.userAddress || null,
    }))
    .filter((comment) => comment.id && comment.content && comment.createdAt)
    .slice(0, limit);
}

export async function getPolymarketLeaderboard(limit = 10): Promise<PolymarketLeaderboardEntry[]> {
  const payload = await fetchJson<
    Array<{
      rank?: number | string;
      proxyWallet?: string;
      userName?: string | null;
      pnl?: number | string;
      vol?: number | string;
      percentPositive?: number | string;
      verifiedBadge?: boolean;
    }>
  >(
    `${DATA_API}/v1/leaderboard?limit=${Math.max(1, Math.min(limit, 100))}&timePeriod=ALL&orderBy=PNL`,
  );

  if (!Array.isArray(payload)) return [];

  return payload.map((entry, index) => ({
    rank: Math.max(1, Math.floor(toNumber(entry.rank) || index + 1)),
    proxyWalletAddress: String(entry.proxyWallet || ''),
    userName: entry.userName || null,
    pnl: toNumber(entry.pnl),
    volume: toNumber(entry.vol),
    percentPositive: clampProbability(toNumber(entry.percentPositive)),
    verifiedBadge: Boolean(entry.verifiedBadge),
  }));
}

export async function getPolymarketProfile(walletAddress: string): Promise<PolymarketProfile | null> {
  const normalizedAddress = walletAddress.trim().toLowerCase();
  if (!isHexWallet(normalizedAddress)) return null;

  const [profilePayload, tradedPayload, valuePayload, closedPositionsPayload] = await Promise.all([
    fetchJson<{ name?: string | null; pseudonym?: string | null; proxyWallet?: string | null; verifiedBadge?: boolean }>(
      `${GAMMA_API}/public-profile?address=${encodeURIComponent(normalizedAddress)}`,
    ),
    fetchJson<Array<{ user?: string; traded?: number }>>(`${DATA_API}/traded?user=${encodeURIComponent(normalizedAddress)}`),
    fetchJson<Array<{ user?: string; value?: number }>>(`${DATA_API}/value?user=${encodeURIComponent(normalizedAddress)}`),
    fetchJson<Array<{ realizedPnl?: number | string | null; totalBought?: number | string | null }>>(
      `${DATA_API}/closed-positions?user=${encodeURIComponent(normalizedAddress)}&limit=50`,
    ),
  ]);

  const closedPositions = Array.isArray(closedPositionsPayload) ? closedPositionsPayload : [];
  const winningClosedPositions = closedPositions.filter((position) => toNumber(position.realizedPnl) > 0).length;
  const recentClosedCount = closedPositions.length;

  const marketsTraded = Array.isArray(tradedPayload) ? Math.floor(toNumber(tradedPayload[0]?.traded)) : 0;
  const currentValue = Array.isArray(valuePayload) ? toNumber(valuePayload[0]?.value) : 0;
  const estimatedVolume = closedPositions.reduce((sum, position) => sum + toNumber(position.totalBought), 0);
  const realizedPnl = closedPositions.reduce((sum, position) => sum + toNumber(position.realizedPnl), 0);
  const winRate = recentClosedCount > 0 ? winningClosedPositions / recentClosedCount : 0;

  if (!profilePayload && marketsTraded === 0 && recentClosedCount === 0 && currentValue <= 0) {
    return null;
  }

  return {
    name: profilePayload?.name || null,
    pseudonym: profilePayload?.pseudonym || null,
    proxyWalletAddress: String(profilePayload?.proxyWallet || normalizedAddress),
    verifiedBadge: Boolean(profilePayload?.verifiedBadge),
    marketsTraded,
    currentValue,
    recentClosedCount,
    winRate,
    estimatedVolume,
    realizedPnl,
  };
}

export function parseOutcomePrices(pricesJson: string | string[] | null | undefined): { yes: number; no: number } {
  const prices = parseJsonArray(pricesJson);
  const yes = clampProbability(toNumber(prices[0]));
  const no = clampProbability(toNumber(prices[1]));

  if (yes === 0 && no === 0) {
    return { yes: 0.5, no: 0.5 };
  }

  if (yes > 0 && no > 0) {
    const total = yes + no;
    return {
      yes: clampProbability(yes / total),
      no: clampProbability(no / total),
    };
  }

  return {
    yes,
    no: clampProbability(1 - yes),
  };
}

export function parseClobTokenIds(tokenIdsJson: string | string[] | null | undefined) {
  return parseJsonArray(tokenIdsJson)
    .map((tokenId) => String(tokenId).trim())
    .filter(Boolean);
}
