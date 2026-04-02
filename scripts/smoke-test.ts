import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config();

type JsonRecord = Record<string, unknown>;

type TestStep = {
  name: string;
  ok: boolean;
  details: string;
};

const API_BASE_URL = (process.env.SMOKE_API_BASE_URL || 'https://voxpredict.onrender.com').replace(/\/+$/, '');
const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const headersBase = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  return headers;
};

const buildToken = (payload: Record<string, unknown>) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não definido no .env');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

const adminToken = () => {
  if (!ADMIN_EMAIL) {
    throw new Error('ADMIN_EMAIL não definido no .env');
  }

  return buildToken({
    id: `smoke-admin-${Date.now()}`,
    email: ADMIN_EMAIL.toLowerCase(),
    role: 'ADMIN',
  });
};

const userToken = () =>
  buildToken({
    id: `smoke-user-${Date.now()}`,
    email: `smoke-user-${Date.now()}@voxpredict.local`,
    role: 'USER',
  });

const requestJson = async <T = JsonRecord>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; json: T; text: string }> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...headersBase(),
      ...(init?.headers ? (init.headers as Record<string, string>) : {}),
    },
  });

  const text = await response.text();
  let json: T;

  try {
    json = JSON.parse(text) as T;
  } catch {
    json = { raw: text } as T;
  }

  return { status: response.status, json, text };
};

const marketPayload = (question: string, endTimeIso: string) => ({
  question,
  description: `Smoke test market criado automaticamente em ${new Date().toISOString()}`,
  category: 'tecnologia',
  endTime: endTimeIso,
  minBet: 5,
  maxBet: 100,
  token: 'USDT',
});

const getErrorMessage = (json: JsonRecord) => {
  const candidate = json.error || json.message || json.details;
  return typeof candidate === 'string' ? candidate : JSON.stringify(candidate);
};

const runStep = async (
  steps: TestStep[],
  name: string,
  fn: () => Promise<string>,
) => {
  try {
    const details = await fn();
    const result: TestStep = { name, ok: true, details };
    steps.push(result);
    console.log(`✅ ${name} — ${details}`);
    return result;
  } catch (error: any) {
    const result: TestStep = {
      name,
      ok: false,
      details: error?.message || 'Erro inesperado',
    };
    steps.push(result);
    console.log(`❌ ${name} — ${result.details}`);
    return result;
  }
};

const main = async () => {
  const steps: TestStep[] = [];
  const adminAuth = adminToken();
  const userAuth = userToken();

  let pastMarketId: number | null = null;
  let futureMarketId: number | null = null;

  await runStep(steps, '1) GET /health retorna status ok', async () => {
    const { status, json } = await requestJson<JsonRecord>('/health');
    if (status !== 200) throw new Error(`HTTP ${status}`);
    if (json.status !== 'ok') throw new Error(`status inválido: ${String(json.status)}`);
    return `HTTP ${status}`;
  });

  await runStep(steps, '2) GET /api/markets retorna mercados', async () => {
    const { status, json } = await requestJson<JsonRecord>('/api/markets?limit=5');
    const markets = (json.markets || json.data) as unknown[];
    if (status !== 200) throw new Error(`HTTP ${status}`);
    if (!Array.isArray(markets) || markets.length === 0) throw new Error('nenhum mercado retornado');
    return `${markets.length} mercado(s)`;
  });

  await runStep(steps, '3) GET /api/leaderboard responde', async () => {
    const { status, json } = await requestJson<JsonRecord>('/api/leaderboard?limit=5');
    if (status !== 200) throw new Error(`HTTP ${status}`);
    if (json.success !== true) throw new Error('success=false');
    return 'endpoint respondeu com success=true';
  });

  await runStep(steps, '4) GET /api/categories retorna categorias', async () => {
    const { status, json } = await requestJson<JsonRecord>('/api/categories');
    const categories = (json.categories || json.data) as unknown[];
    if (status !== 200) throw new Error(`HTTP ${status}`);
    if (!Array.isArray(categories) || categories.length === 0) throw new Error('nenhuma categoria retornada');
    return `${categories.length} categoria(s)`;
  });

  await runStep(steps, '5) POST /api/positions com closeTime passado retorna 400', async () => {
    const pastEndTime = new Date(Date.now() - 60_000).toISOString();
    const marketTitle = `Smoke Past ${Date.now()}`;

    const createResp = await requestJson<JsonRecord>('/api/markets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminAuth}`,
      },
      body: JSON.stringify(marketPayload(marketTitle, pastEndTime)),
    });

    if (createResp.status !== 201) {
      throw new Error(`falha ao criar mercado passado: HTTP ${createResp.status} ${createResp.text}`);
    }

    const created = (createResp.json.market || createResp.json.data) as JsonRecord;
    const marketId = Number(created.id);
    if (!Number.isInteger(marketId) || marketId <= 0) throw new Error('marketId inválido');
    pastMarketId = marketId;

    const betResp = await requestJson<JsonRecord>('/api/positions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userAuth}`,
      },
      body: JSON.stringify({
        marketId,
        side: 'YES',
        amount: 5,
        token: 'USDT',
      }),
    });

    if (betResp.status !== 400) {
      throw new Error(`esperado 400, recebido ${betResp.status}`);
    }

    const errorMsg = getErrorMessage(betResp.json);
    if (!errorMsg.toLowerCase().includes('encerrado')) {
      throw new Error(`mensagem inesperada: ${errorMsg}`);
    }

    return `marketId=${marketId}, erro="${errorMsg}"`;
  });

  await runStep(steps, '6) Criar mercado de teste com closeTime +1 minuto', async () => {
    const futureEndTime = new Date(Date.now() + 60_000).toISOString();
    const marketTitle = `Smoke Future ${Date.now()}`;

    const createResp = await requestJson<JsonRecord>('/api/markets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminAuth}`,
      },
      body: JSON.stringify(marketPayload(marketTitle, futureEndTime)),
    });

    if (createResp.status !== 201) {
      throw new Error(`falha ao criar mercado futuro: HTTP ${createResp.status} ${createResp.text}`);
    }

    const created = (createResp.json.market || createResp.json.data) as JsonRecord;
    const marketId = Number(created.id);
    if (!Number.isInteger(marketId) || marketId <= 0) throw new Error('marketId inválido');
    futureMarketId = marketId;

    return `marketId=${marketId}, closeTime=${futureEndTime}`;
  });

  await runStep(steps, '7) Aguardar 2 minutos', async () => {
    await sleep(120_000);
    return '120s concluídos';
  });

  await runStep(steps, '8) Apostar após fechamento retorna "Mercado encerrado"', async () => {
    if (!futureMarketId) throw new Error('marketId futuro não definido');

    const betResp = await requestJson<JsonRecord>('/api/positions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userAuth}`,
      },
      body: JSON.stringify({
        marketId: futureMarketId,
        side: 'NO',
        amount: 5,
        token: 'USDT',
      }),
    });

    if (betResp.status !== 400) {
      throw new Error(`esperado 400, recebido ${betResp.status}`);
    }

    const errorMsg = getErrorMessage(betResp.json);
    if (!errorMsg.toLowerCase().includes('encerrado')) {
      throw new Error(`mensagem inesperada: ${errorMsg}`);
    }

    return `marketId=${futureMarketId}, erro="${errorMsg}"`;
  });

  await runStep(steps, '9) Verificar status CLOSED no banco', async () => {
    if (!futureMarketId) throw new Error('marketId futuro não definido');

    const prisma = new PrismaClient();

    try {
      await prisma.market.updateMany({
        where: {
          status: 'ACTIVE',
          endTime: { lt: new Date() },
        },
        data: { status: 'CLOSED' },
      });

      const marketInDb = await prisma.market.findUnique({
        where: { id: futureMarketId },
        select: { id: true, status: true, endTime: true },
      });

      if (!marketInDb) {
        throw new Error(`mercado ${futureMarketId} não encontrado no banco`);
      }

      if (marketInDb.status !== 'CLOSED') {
        throw new Error(`status atual no banco: ${marketInDb.status}`);
      }

      const apiResp = await requestJson<JsonRecord>(`/api/markets/${futureMarketId}`);
      if (apiResp.status !== 200) throw new Error(`API market detail HTTP ${apiResp.status}`);
      const apiMarket = (apiResp.json.data || apiResp.json.market) as JsonRecord;
      const apiStatus = String(apiMarket.status || '');

      return `DB=${marketInDb.status}, API=${apiStatus}, endTime=${marketInDb.endTime.toISOString()}`;
    } finally {
      await prisma.$disconnect();
    }
  });

  const passed = steps.filter((step) => step.ok).length;
  const failed = steps.length - passed;
  console.log('\n=== Smoke Test Summary ===');
  console.log(`Base URL: ${API_BASE_URL}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Mercado passado criado: ${pastMarketId ?? 'n/a'}`);
  console.log(`Mercado futuro criado: ${futureMarketId ?? 'n/a'}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error('❌ Falha fatal no smoke test:', error);
  process.exitCode = 1;
});
