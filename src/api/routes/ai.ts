import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

let aiEnabled = true;

const generateSchema = z.object({
  newsText: z.string().min(50).optional(),
  noticia: z.string().min(50).optional(),
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

router.post('/generate-market', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Texto da notícia muito curto (mínimo 50 caracteres).',
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
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Você é especialista em mercados preditivos da América Latina.

Baseado na notícia abaixo, crie um mercado preditivo. Responda APENAS com JSON válido, sem markdown, sem explicações.

Notícia: ${newsText}
Data de encerramento sugerida: ${endDate || 'não informada'}

JSON de resposta (exatamente neste formato):
{
  "question": "Pergunta clara em português terminando com '?', máximo 200 caracteres",
  "description": "Critérios de resolução detalhados, máximo 500 caracteres",
  "category": "politica|cripto|esportes|economia|tecnologia|entretenimento|geopolitica|negocios|ciencia",
  "tags": ["tag1", "tag2"],
  "resolutionCriteria": "Como será determinado o resultado final"
}`,
        },
      ],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const clean = cleanupModelResponse(rawText);
    const market = JSON.parse(clean);

    if (!market?.question || !market?.category) {
      throw new Error('IA retornou dados incompletos.');
    }

    return res.status(200).json({
      success: true,
      market,
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
