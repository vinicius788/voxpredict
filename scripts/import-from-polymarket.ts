import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { getTrendingPolymarketEvents, type PolymarketEvent } from '../src/api/services/polymarket.ts';

const prisma = new PrismaClient();

const categoryMap: Record<string, string> = {
  cripto: 'cripto',
  economia: 'economia',
  entretenimento: 'entretenimento',
  esportes: 'esportes',
  geopolitica: 'geopolitica',
  geopolítica: 'geopolitica',
  politica: 'politica',
  política: 'politica',
  tecnologia: 'tecnologia',
};

const limitArgIndex = process.argv.findIndex((arg) => arg === '--limit');
const limit =
  limitArgIndex >= 0 && process.argv[limitArgIndex + 1]
    ? Math.max(1, Math.min(Number(process.argv[limitArgIndex + 1]) || 10, 50))
    : 10;

const shouldWrite = process.argv.includes('--write');

type AdaptedMarket = {
  title: string;
  description: string;
  category: string;
  relevant: boolean;
};

const normalizeCategory = (value: string) => categoryMap[value.trim().toLowerCase()] || 'economia';

const cleanupJson = (input: string) =>
  input
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

const parseAdaptedMarket = (input: string): AdaptedMarket => {
  const parsed = JSON.parse(cleanupJson(input)) as Partial<AdaptedMarket>;
  return {
    title: String(parsed.title || '').trim(),
    description: String(parsed.description || '').trim(),
    category: normalizeCategory(String(parsed.category || 'economia')),
    relevant: Boolean(parsed.relevant),
  };
};

const getEndTimeFromEvent = (event: PolymarketEvent) => {
  const candidate = event.markets
    .map((market) => market.endDate)
    .find((endDate): endDate is string => Boolean(endDate && !Number.isNaN(new Date(endDate).getTime())));

  if (candidate) {
    return new Date(candidate);
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 30);
  fallback.setHours(23, 59, 59, 999);
  return fallback;
};

const adaptEvent = async (anthropic: Anthropic, event: PolymarketEvent) => {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system:
      'Você adapta mercados do Polymarket para o contexto brasileiro. ' +
      'Retorne apenas JSON válido, sem markdown nem texto extra.',
    messages: [
      {
        role: 'user',
        content: `Adapte este mercado do Polymarket para o contexto brasileiro em PT-BR.

Título original: "${event.title}"
Volume: $${event.volume.toFixed(2)}

Retorne JSON:
{
  "title": "título adaptado em português",
  "description": "descrição com critério de resolução objetivo",
  "category": "politica|economia|cripto|esportes|geopolitica|tecnologia|entretenimento",
  "relevant": true
}`,
      },
    ],
  });

  const text = response.content
    .filter((item) => item.type === 'text')
    .map((item) => ('text' in item ? item.text : ''))
    .join('\n')
    .trim();

  return parseAdaptedMarket(text);
};

const main = async () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada.');
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const events = await getTrendingPolymarketEvents(50);

  if (!events.length) {
    console.log('Nenhum evento trending encontrado no Polymarket.');
    return;
  }

  const selected = events.slice(0, limit);
  const latest = shouldWrite ? await prisma.market.aggregate({ _max: { id: true } }) : null;
  let nextId = (latest?._max.id || 0) + 1;

  const created: string[] = [];
  const skipped: string[] = [];

  for (const event of selected) {
    try {
      const adapted = await adaptEvent(anthropic, event);

      if (!adapted.relevant || !adapted.title || !adapted.description) {
        skipped.push(`${event.slug}: irrelevante`);
        continue;
      }

      if (shouldWrite) {
        const existing = await prisma.market.findFirst({
          where: {
            OR: [{ question: adapted.title }, { contractAddress: `polymarket-ref-${event.id}` }],
          },
        });

        if (existing) {
          skipped.push(`${event.slug}: duplicado`);
          continue;
        }

        await prisma.market.create({
          data: {
            id: nextId,
            contractAddress: `polymarket-ref-${event.id}`,
            question: adapted.title,
            description: adapted.description,
            category: adapted.category,
            endTime: getEndTimeFromEvent(event),
            status: 'ACTIVE',
            totalVolume: 0,
            totalYes: 0,
            totalNo: 0,
            participants: 0,
            token: 'USDT',
          },
        });

        created.push(`${nextId} → ${adapted.title}`);
        nextId += 1;
      } else {
        created.push(`[preview] ${adapted.title}`);
      }
    } catch (error: any) {
      skipped.push(`${event.slug}: ${error?.message || 'erro desconhecido'}`);
    }
  }

  console.log(`Modo: ${shouldWrite ? 'write' : 'preview'}`);
  console.log(`Processados: ${selected.length}`);
  console.log(`Criados: ${created.length}`);
  created.forEach((item) => console.log(`  - ${item}`));

  if (skipped.length) {
    console.log(`Ignorados: ${skipped.length}`);
    skipped.forEach((item) => console.log(`  - ${item}`));
  }
};

main()
  .catch((error) => {
    console.error('[import-from-polymarket] falhou:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
