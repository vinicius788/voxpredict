import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { getTrendingPolymarketEvents } from '../services/polymarket';

const router = express.Router();

let aiEnabled = true;

const generateSchema = z.object({
  newsText: z.string().min(20).optional(),
  noticia: z.string().min(20).optional(),
  endDate: z.string().optional(),
  dataEncerramento: z.string().optional(),
});

const toggleSchema = z.object({
  active: z.boolean(),
});

const cleanupModelResponse = (input: string) =>
  input
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

const systemPrompt = `Você é um especialista em mercados preditivos para América Latina.
Gere exatamente 5 sugestões de mercados preditivos baseados em eventos atuais relevantes
para o público brasileiro e latino-americano.

Foque em categorias: Política BR, Economia BR, Cripto, Esportes, Geopolítica LATAM.

Para cada mercado, retorne JSON com:
{
  "title": "Pergunta binária clara e objetiva (máx 100 chars)",
  "description": "Critério de resolução objetivo com fonte verificável (máx 300 chars)",
  "category": "política|cripto|esportes|economia|geopolítica",
  "resolveBy": "YYYY-MM-DD",
  "minBet": 5,
  "maxBet": 1000,
  "tags": ["tag1", "tag2"],
  "rationale": "Por que esse mercado é relevante agora (1 frase)"
}

Retorne APENAS um array JSON válido com 5 objetos. Sem texto adicional.`;

const categoryMap: Record<string, string> = {
  'política': 'politica',
  politica: 'politica',
  cripto: 'cripto',
  esportes: 'esportes',
  economia: 'economia',
  'geopolítica': 'geopolitica',
  geopolitica: 'geopolitica',
};

const normalizeCategory = (value?: string) => {
  const cleaned = (value || '').trim().toLowerCase();
  return categoryMap[cleaned] || 'economia';
};

const ensureQuestion = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.endsWith('?')) return `${trimmed}?`;
  return trimmed;
};

const extractJSONArray = (input: string) => {
  const clean = cleanupModelResponse(input);
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // try bracket extraction below
  }

  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start >= 0 && end > start) {
    const candidate = clean.slice(start, end + 1);
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) return parsed;
  }

  throw new SyntaxError('IA retornou JSON inválido para sugestões');
};

const resolveDateOrFallback = (raw: string | undefined, endDateInput: string) => {
  if (raw) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  if (endDateInput) return endDateInput;
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 45);
  return fallback.toISOString().slice(0, 10);
};

const polymarketKeywords = [
  'argentina',
  'bitcoin',
  'bolsonaro',
  'brasil',
  'brazil',
  'ethereum',
  'latam',
  'latin',
  'lula',
  'real',
];

const buildPolymarketTrendingContext = async () => {
  const trending = await getTrendingPolymarketEvents(20);
  if (!trending.length) return '';

  const relevant = trending.filter((event) => {
    const haystack = event.title.toLowerCase();
    return polymarketKeywords.some((keyword) => haystack.includes(keyword));
  });

  const selected = (relevant.length ? relevant : trending).slice(0, 5);
  if (!selected.length) return '';

  const lines = selected.map(
    (event) => `- "${event.title}" (Volume: $${(event.volume / 1000).toFixed(0)}k)`,
  );

  return `Mercados com maior volume no Polymarket agora (referência global):
${lines.join('\n')}`;
};

router.post('/generate-market', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Payload inválido para geração de mercados.',
      details: parsed.error.flatten(),
    });
  }

  if (!aiEnabled) {
    return res.status(403).json({ success: false, error: 'IA desativada no painel admin.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'IA não configurada. Adicione ANTHROPIC_API_KEY no .env.',
    });
  }

  const newsText = (parsed.data.newsText || parsed.data.noticia || '').trim();
  const endDate = (parsed.data.endDate || parsed.data.dataEncerramento || '').trim();

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const polymarketContext = await buildPolymarketTrendingContext();
    const userPrompt = newsText
      ? `${polymarketContext ? `${polymarketContext}\n\n` : ''}Use a notícia abaixo como contexto principal e, se necessário, complemente com web search para hoje.

Notícia:
${newsText}

Data sugerida para encerramento (se útil): ${endDate || 'não informada'}

Retorne APENAS o array JSON com 5 objetos.`
      : `${polymarketContext ? `${polymarketContext}\n\n` : ''}Busque as principais notícias do Brasil e América Latina de hoje.
Depois gere 5 sugestões de mercados preditivos baseados nessas notícias.
Categorias: política brasileira, economia, cripto, esportes, geopolítica LATAM.
Retorne APENAS um array JSON com 5 objetos no formato especificado.`;

    const models = ['claude-opus-4-5', 'claude-sonnet-4-20250514'];
    let response: Awaited<ReturnType<typeof anthropic.messages.create>> | null = null;
    let lastError: unknown = null;

    for (const model of models) {
      try {
        response = await anthropic.messages.create({
          model,
          max_tokens: 2000,
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search',
            } as any,
          ],
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          system: systemPrompt,
        } as any);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!response) {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      });
      if (!response && lastError) {
        throw lastError;
      }
    }

    const rawText = response.content
      .filter((item) => item.type === 'text')
      .map((item) => ('text' in item ? item.text : ''))
      .join('\n')
      .trim();

    const parsedSuggestions = extractJSONArray(rawText);
    const suggestions = parsedSuggestions.slice(0, 5).map((item: any, index: number) => {
      const title = ensureQuestion(String(item?.title || item?.question || `Sugestão ${index + 1}?`)).slice(0, 100);
      const description = String(item?.description || '').slice(0, 300);
      const category = normalizeCategory(item?.category);
      const resolveBy = resolveDateOrFallback(item?.resolveBy, endDate);
      const minBet = Number(item?.minBet || 5);
      const maxBet = Number(item?.maxBet || 1000);
      const tags = Array.isArray(item?.tags) ? item.tags.slice(0, 6).map((tag: unknown) => String(tag)) : [];
      const rationale = String(item?.rationale || 'Relevante no contexto atual da região.');

      return {
        title,
        description,
        category,
        resolveBy,
        minBet: Number.isFinite(minBet) && minBet > 0 ? minBet : 5,
        maxBet: Number.isFinite(maxBet) && maxBet >= 5 ? maxBet : 1000,
        tags,
        rationale,
      };
    });

    if (suggestions.length < 5) {
      throw new Error('IA retornou menos de 5 sugestões.');
    }

    return res.status(200).json({
      success: true,
      suggestions,
      // Compatibilidade com versão anterior do frontend.
      market: {
        question: suggestions[0].title,
        description: suggestions[0].description,
        category: suggestions[0].category,
        tags: suggestions[0].tags,
        rationale: suggestions[0].rationale,
      },
    });
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return res.status(500).json({ success: false, error: 'IA retornou formato inválido. Tente novamente.' });
    }
    console.error('AI generation error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Erro ao gerar mercado com IA.' });
  }
});

router.post('/toggle', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Payload inválido', details: parsed.error.flatten() });
  }

  aiEnabled = parsed.data.active;
  return res.status(200).json({ success: true, active: aiEnabled });
});

router.get('/status', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({ success: true, active: aiEnabled });
});

export default router;
