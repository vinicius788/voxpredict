const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface PolymarketMarket {
  id?: string;
  question: string;
  conditionId?: string;
  outcomePrices?: string | string[] | null;
  clobTokenIds?: string | string[] | null;
  volume?: number | string | null;
  active?: boolean;
  endDate?: string;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  markets: PolymarketMarket[];
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

const normalizeMarket = (value: unknown): PolymarketMarket | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const question = String(candidate.question || '').trim();
  if (!question) return null;

  return {
    id: candidate.id ? String(candidate.id) : undefined,
    question,
    conditionId: candidate.conditionId ? String(candidate.conditionId) : undefined,
    outcomePrices:
      typeof candidate.outcomePrices === 'string' || Array.isArray(candidate.outcomePrices)
        ? (candidate.outcomePrices as string | string[])
        : null,
    clobTokenIds:
      typeof candidate.clobTokenIds === 'string' || Array.isArray(candidate.clobTokenIds)
        ? (candidate.clobTokenIds as string | string[])
        : null,
    volume: typeof candidate.volume === 'string' || typeof candidate.volume === 'number' ? candidate.volume : 0,
    active: candidate.active === undefined ? true : Boolean(candidate.active),
    endDate: candidate.endDate ? String(candidate.endDate) : undefined,
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
    liquidity: toNumber(candidate.liquidity),
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

export async function getPolymarketMidpoint(tokenId: string) {
  const cleaned = tokenId.trim();
  if (!cleaned) return null;

  const payload = await fetchJson<{ mid?: string | number }>(`${CLOB_API}/midpoint?token_id=${encodeURIComponent(cleaned)}`);
  if (!payload?.mid) return null;

  const midpoint = toNumber(payload.mid);
  return midpoint > 0 && midpoint < 1 ? midpoint : null;
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
