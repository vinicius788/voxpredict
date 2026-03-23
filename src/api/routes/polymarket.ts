import express, { Request, Response } from 'express';
import {
  getPolymarketLeaderboard,
  getPolymarketMidpoint,
  getPolymarketProfile,
  getTrendingPolymarketEvents,
  parseClobTokenIds,
  parseOutcomePrices,
  searchPolymarketMarkets,
  type PolymarketMarket,
} from '../services/polymarket';

const router = express.Router();

const toSimpleMarket = async (market: PolymarketMarket) => {
  const fallbackPrices = parseOutcomePrices(market.outcomePrices);
  const tokenIds = parseClobTokenIds(market.clobTokenIds);
  const midpoint = tokenIds[0] ? await getPolymarketMidpoint(tokenIds[0]) : null;
  const yesProbability = midpoint ?? fallbackPrices.yes;
  const noProbability = midpoint !== null ? Math.max(0, 1 - midpoint) : fallbackPrices.no;

  return {
    id: market.id || market.conditionId || market.slug || market.question,
    question: market.question,
    slug: market.slug || null,
    conditionId: market.conditionId || null,
    yesTokenId: tokenIds[0] || null,
    noTokenId: tokenIds[1] || null,
    eventId: market.events?.[0]?.id || null,
    eventSlug: market.events?.[0]?.slug || null,
    eventTitle: market.events?.[0]?.title || null,
    volumeTotal: market.volumeNum || 0,
    volume24h: typeof market.volume24hr === 'number' ? market.volume24hr : Number(market.volume24hr || 0),
    yesProbability: Number(yesProbability.toFixed(4)),
    noProbability: Number(noProbability.toFixed(4)),
    yesOdds: yesProbability > 0 ? Number((1 / yesProbability).toFixed(2)) : 2,
    noOdds: noProbability > 0 ? Number((1 / noProbability).toFixed(2)) : 2,
  };
};

router.get('/trending', async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 6), 12));
    const events = await getTrendingPolymarketEvents(limit);

    const mapped = await Promise.all(
      events.map(async (event) => {
        const firstMarket = event.markets.find((market) => market.active !== false) || event.markets[0] || null;
        const marketPayload = firstMarket ? await toSimpleMarket(firstMarket) : null;

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          volumeTotal: event.volume,
          volume24h: event.volume24hr,
          market: marketPayload,
          url: `https://polymarket.com/event/${event.slug}`,
        };
      }),
    );

    return res.status(200).json({ success: true, events: mapped });
  } catch (error) {
    console.error('Error fetching Polymarket trending events:', error);
    return res.status(200).json({ success: true, events: [] });
  }
});

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 10), 25));
    const traders = await getPolymarketLeaderboard(limit);
    return res.status(200).json({ success: true, traders });
  } catch (error) {
    console.error('Error fetching Polymarket leaderboard:', error);
    return res.status(200).json({ success: true, traders: [] });
  }
});

router.get('/search-markets', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const limit = Math.max(1, Math.min(Number(req.query.limit || 5), 10));

    if (!query || query.length < 3) {
      return res.status(200).json({ success: true, markets: [] });
    }

    const matches = await searchPolymarketMarkets(query, limit);
    const markets = await Promise.all(matches.map((market) => toSimpleMarket(market)));
    return res.status(200).json({ success: true, markets });
  } catch (error) {
    console.error('Error searching Polymarket markets:', error);
    return res.status(200).json({ success: true, markets: [] });
  }
});

router.get('/profile/:walletAddress', async (req: Request, res: Response) => {
  try {
    const walletAddress = String(req.params.walletAddress || '').trim();
    const profile = await getPolymarketProfile(walletAddress);
    return res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error('Error fetching Polymarket profile:', error);
    return res.status(200).json({ success: true, profile: null });
  }
});

export default router;
