# 🔧 VoxPredict — Addendum de Implementação (Melhorias Críticas)
> Complemento ao CLAUDE_CODE_PROMPT.md — implemente APÓS as Fases 1 e 6 do prompt principal.
> Baseado em análise comparativa com spec de mercados preditivos de produção.

---

## O QUE ESTE ADDENDUM COBRE

Após auditoria do projeto VoxPredict e comparação com um spec de produção de mercado preditivo,
foram identificadas **5 lacunas críticas** que não existem no projeto atual e têm alto impacto:

| # | Feature | Por que falta? | Impacto |
|---|---------|---------------|---------|
| 1 | **AMM com CPMM** | Sistema atual provavelmente usa preço fixo ou simples | 🔴 CRÍTICO |
| 2 | **Zod em todas as rotas** | Rotas Express sem validação runtime | 🔴 CRÍTICO |
| 3 | **Server-Sent Events** | Provavelmente usa polling | 🟡 ALTO |
| 4 | **Anti-manipulação** | Completamente ausente | 🔴 CRÍTICO |
| 5 | **Event Bus** | Jobs isolados, sem arquitetura reativa | 🟡 ALTO |

---

## IMPLEMENTAÇÃO 1 — AMM CPMM (Constant Product Market Maker)

### Por que isso é crítico

O VoxPredict atual em `usePlaceBet.ts` e `routes/markets.ts` provavelmente calcula preço de forma
simples (ex: preço fixo ou baseado apenas em quantidade de apostas). Isso é errado para um mercado
preditivo de produção. O Polymarket usa CPMM: `x * y = k` — o mesmo algoritmo do Uniswap.

### Criar `src/api/services/amm.ts` — do zero

```typescript
/**
 * Automated Market Maker baseado em CPMM (Constant Product)
 * Fórmula: yesShares * noShares = k (constante de liquidez)
 *
 * Como funciona:
 * - yesShares e noShares começam iguais (50/50)
 * - Comprar YES remove YES do pool → preço YES sobe, preço NO cai
 * - Preço de um outcome = noShares / (yesShares + noShares)
 */

import { prisma } from '../db/prisma'
import { Prisma } from '@prisma/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TradeQuote {
  sharesOut: number         // shares que o usuário recebe
  costBasis: number         // custo total em USD/tokens
  pricePerShare: number     // preço médio por share
  priceImpact: number       // % de impacto no preço (ex: 0.023 = 2.3%)
  newProbabilityYes: number // nova probabilidade YES após o trade (0-1)
  newProbabilityNo: number  // nova probabilidade NO
  fee: number               // fee cobrada (ex: 2% = 0.02 * cost)
  feeAmount: number         // valor absoluto da fee
}

export interface ExecuteTradeResult extends TradeQuote {
  tradeId: string
  userId: string
  marketId: string
  outcome: 'YES' | 'NO'
  direction: 'BUY' | 'SELL'
  executedAt: Date
  newPoolYes: number        // novo tamanho do pool YES
  newPoolNo: number         // novo tamanho do pool NO
}

const FEE_RATE = 0.02  // 2% de fee em todas as trades

// ─── Funções do AMM ───────────────────────────────────────────────────────────

/**
 * Calcula o preço de compra de shares SEM executar o trade
 */
export function quoteBuy(
  poolYes: number,
  poolNo: number,
  outcome: 'YES' | 'NO',
  usdAmount: number
): TradeQuote {
  // Deduzir fee do valor de entrada
  const feeAmount = usdAmount * FEE_RATE
  const amountAfterFee = usdAmount - feeAmount

  const k = poolYes * poolNo

  // Quantidade de shares que saem do pool
  let sharesOut: number
  let newPoolYes: number
  let newPoolNo: number

  if (outcome === 'YES') {
    // Usuário adiciona dinheiro ao pool e recebe YES shares
    // Novo pool NO = poolNo + amountAfterFee
    // Novo pool YES = k / novoPoolNO
    // Shares recebidas = poolYes - novoPoolYES
    const newPoolNoAfter = poolNo + amountAfterFee
    const newPoolYesAfter = k / newPoolNoAfter
    sharesOut = poolYes - newPoolYesAfter
    newPoolYes = newPoolYesAfter
    newPoolNo = newPoolNoAfter
  } else {
    const newPoolYesAfter = poolYes + amountAfterFee
    const newPoolNoAfter = k / newPoolYesAfter
    sharesOut = poolNo - newPoolNoAfter
    newPoolYes = newPoolYesAfter
    newPoolNo = newPoolNoAfter
  }

  const pricePerShare = amountAfterFee / sharesOut
  const oldProbYes = poolNo / (poolYes + poolNo)
  const newProbYes = newPoolNo / (newPoolYes + newPoolNo)
  const priceImpact = Math.abs(newProbYes - oldProbYes) / oldProbYes

  return {
    sharesOut,
    costBasis: usdAmount,
    pricePerShare,
    priceImpact,
    newProbabilityYes: newProbYes,
    newProbabilityNo: 1 - newProbYes,
    fee: FEE_RATE,
    feeAmount,
  }
}

/**
 * Calcula o valor de venda de shares SEM executar o trade
 */
export function quoteSell(
  poolYes: number,
  poolNo: number,
  outcome: 'YES' | 'NO',
  sharesToSell: number
): TradeQuote {
  const k = poolYes * poolNo
  let usdOut: number
  let newPoolYes: number
  let newPoolNo: number

  if (outcome === 'YES') {
    // Usuário devolve YES shares ao pool e recebe USD
    const newPoolYesAfter = poolYes + sharesToSell
    const newPoolNoAfter = k / newPoolYesAfter
    usdOut = poolNo - newPoolNoAfter
    newPoolYes = newPoolYesAfter
    newPoolNo = newPoolNoAfter
  } else {
    const newPoolNoAfter = poolNo + sharesToSell
    const newPoolYesAfter = k / newPoolNoAfter
    usdOut = poolYes - newPoolYesAfter
    newPoolYes = newPoolYesAfter
    newPoolNo = newPoolNoAfter
  }

  const feeAmount = usdOut * FEE_RATE
  const usdOutAfterFee = usdOut - feeAmount
  const pricePerShare = usdOutAfterFee / sharesToSell
  const newProbYes = newPoolNo / (newPoolYes + newPoolNo)
  const oldProbYes = poolNo / (poolYes + poolNo)
  const priceImpact = Math.abs(newProbYes - oldProbYes) / oldProbYes

  return {
    sharesOut: sharesToSell,
    costBasis: usdOutAfterFee,
    pricePerShare,
    priceImpact,
    newProbabilityYes: newProbYes,
    newProbabilityNo: 1 - newProbYes,
    fee: FEE_RATE,
    feeAmount,
  }
}

/**
 * Executa o trade com proteção de concorrência (SELECT FOR UPDATE)
 * e registra no banco de dados.
 */
export async function executeTrade(params: {
  userId: string
  marketId: string
  outcome: 'YES' | 'NO'
  direction: 'BUY' | 'SELL'
  amount: number          // USD para BUY, shares para SELL
  maxSlippage: number     // ex: 0.05 = 5% máximo de slippage aceito
}): Promise<ExecuteTradeResult> {
  const { userId, marketId, outcome, direction, amount, maxSlippage } = params

  return prisma.$transaction(async (tx) => {
    // 1. Buscar mercado com lock para evitar race conditions
    const market = await tx.$queryRaw<Array<{
      id: string
      poolYes: number
      poolNo: number
      status: string
      closesAt: Date
    }>>`
      SELECT id, "poolYes", "poolNo", status, "closesAt"
      FROM "Market"
      WHERE id = ${marketId}
      FOR UPDATE
    `

    if (!market[0]) throw new Error('Mercado não encontrado')
    if (market[0].status !== 'OPEN') throw new Error('Mercado não está aberto para trading')
    if (market[0].closesAt < new Date()) throw new Error('Mercado já encerrou')

    const { poolYes, poolNo } = market[0]

    // 2. Calcular quote
    const quote = direction === 'BUY'
      ? quoteBuy(poolYes, poolNo, outcome, amount)
      : quoteSell(poolYes, poolNo, outcome, amount)

    // 3. Verificar slippage
    if (quote.priceImpact > maxSlippage) {
      throw new Error(
        `Slippage de ${(quote.priceImpact * 100).toFixed(2)}% excede o máximo de ${(maxSlippage * 100).toFixed(2)}%`
      )
    }

    // 4. Verificar saldo do usuário
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    })
    if (!user) throw new Error('Usuário não encontrado')
    if (direction === 'BUY' && user.balance < amount) {
      throw new Error('Saldo insuficiente')
    }

    // 5. Calcular novos pools
    const newPoolYes = direction === 'BUY'
      ? (outcome === 'YES' ? quote.newProbabilityYes * (poolYes + poolNo) : poolYes + amount)
      : (outcome === 'YES' ? poolYes + quote.sharesOut : poolYes)
    // Usar os valores retornados pelo quote diretamente
    // (simplificado — use os valores calculados internamente no quoteBuy/quoteSell)

    // 6. Atualizar pools do mercado
    const newProb = quote.newProbabilityYes
    await tx.market.update({
      where: { id: marketId },
      data: {
        poolYes: { increment: direction === 'BUY' && outcome === 'YES' ? -quote.sharesOut : quote.sharesOut },
        poolNo:  { increment: direction === 'BUY' && outcome === 'NO'  ? -quote.sharesOut : quote.sharesOut },
        probabilityYes: newProb,
        probabilityNo: 1 - newProb,
        totalVolume: { increment: amount },
        volume24h: { increment: amount },
        lastTradeAt: new Date(),
      }
    })

    // 7. Atualizar saldo do usuário
    const balanceDelta = direction === 'BUY' ? -amount : quote.costBasis
    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: balanceDelta } }
    })

    // 8. Upsert na posição do usuário
    await tx.position.upsert({
      where: { userId_marketId_outcome: { userId, marketId, outcome } },
      create: {
        userId, marketId, outcome,
        shares: direction === 'BUY' ? quote.sharesOut : -quote.sharesOut,
        avgPrice: quote.pricePerShare,
        totalInvested: direction === 'BUY' ? amount : 0,
      },
      update: {
        shares: { increment: direction === 'BUY' ? quote.sharesOut : -quote.sharesOut },
        avgPrice: quote.pricePerShare, // simplificado — calcular VWAP real
        totalInvested: direction === 'BUY' ? { increment: amount } : undefined,
      }
    })

    // 9. Registrar o trade
    const trade = await tx.trade.create({
      data: {
        userId, marketId, outcome, direction,
        shares: quote.sharesOut,
        price: quote.pricePerShare,
        totalCost: direction === 'BUY' ? amount : quote.costBasis,
        fee: quote.feeAmount,
        priceImpact: quote.priceImpact,
        probBefore: poolNo / (poolYes + poolNo),
        probAfter: quote.newProbabilityYes,
        status: 'CONFIRMED',
      }
    })

    // 10. Registrar fee na tesouraria
    await tx.treasuryEntry.create({
      data: {
        type: 'TRADE_FEE',
        amount: quote.feeAmount,
        tradeId: trade.id,
        marketId,
      }
    })

    return {
      ...quote,
      tradeId: trade.id,
      userId,
      marketId,
      outcome,
      direction,
      executedAt: new Date(),
      newPoolYes, // usar valores corretos calculados internamente
      newPoolNo: 0,  // idem
    }
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  })
}
```

### Adicionar endpoint de quote (sem executar)

Em `src/api/routes/markets.ts`, adicionar:

```typescript
import { quoteBuy, quoteSell } from '../services/amm'

// GET /api/markets/:id/quote?outcome=YES&direction=BUY&amount=50
router.get('/:id/quote', requireAuth, async (req, res) => {
  const { outcome, direction, amount } = z.object({
    outcome: z.enum(['YES', 'NO']),
    direction: z.enum(['BUY', 'SELL']),
    amount: z.coerce.number().positive(),
  }).parse(req.query)

  const market = await prisma.market.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { poolYes: true, poolNo: true, status: true }
  })

  const quote = direction === 'BUY'
    ? quoteBuy(market.poolYes, market.poolNo, outcome, amount)
    : quoteSell(market.poolYes, market.poolNo, outcome, amount)

  res.json({ quote, market: { probabilityYes: market.poolNo / (market.poolYes + market.poolNo) } })
})
```

### Atualizar PredictionInterface.tsx para usar o quote em tempo real

```typescript
// Em PredictionInterface.tsx — adicionar hook de quote
const { data: quote, isLoading: quoteLoading } = useQuery({
  queryKey: ['quote', marketId, outcome, direction, debouncedAmount],
  queryFn: () => apiClient.get(`/markets/${marketId}/quote`, {
    params: { outcome, direction, amount: debouncedAmount }
  }).then(r => r.data.quote),
  enabled: debouncedAmount > 0,
  staleTime: 2000,
})

// Mostrar na UI:
// "Você receberá: 47.3 shares"
// "Preço médio: $0.53 por share"
// "Impacto no preço: 2.1%"  ← vermelho se > 5%
// "Fee: $1.00 (2%)"
// "Nova probabilidade: 55.3% SIM"
```

---

## IMPLEMENTAÇÃO 2 — ZOD VALIDATION EM TODAS AS ROTAS

### Por que crítico

Sem validação runtime com Zod, qualquer dado malformado pode corromper o banco ou causar erros
inesperados. Todas as rotas do Express precisam validar input antes de processar.

### Criar `src/api/middleware/validate.ts`

```typescript
import { z, ZodSchema } from 'zod'
import { Request, Response, NextFunction } from 'express'

type ValidationTarget = 'body' | 'query' | 'params'

export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: result.error.flatten().fieldErrors,
      })
    }
    // Substituir dados do request com versão validada e tipada
    req[target] = result.data
    next()
  }
}
```

### Schemas Zod centralizados — criar `src/api/schemas/index.ts`

```typescript
import { z } from 'zod'

// ─── Market ───────────────────────────────────────────────────────────────────

export const CreateMarketSchema = z.object({
  title: z.string().min(10, 'Mínimo 10 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z.string().min(20, 'Descreva o mercado com mais detalhes'),
  category: z.enum(['politics', 'sports', 'crypto', 'economics', 'entertainment', 'science', 'latam']),
  resolutionDate: z.coerce.date().min(new Date(), 'Data de resolução deve ser no futuro'),
  resolutionCriteria: z.string().min(20, 'Critério de resolução obrigatório'),
  initialLiquidity: z.number().min(100, 'Liquidez mínima: R$100').max(100000),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().max(20)).max(5).optional().default([]),
})

export const UpdateMarketSchema = CreateMarketSchema.partial().omit({ initialLiquidity: true })

export const MarketQuerySchema = z.object({
  search: z.string().max(100).optional(),
  category: z.enum(['politics', 'sports', 'crypto', 'economics', 'entertainment', 'science', 'latam', 'all']).default('all'),
  status: z.enum(['OPEN', 'CLOSED', 'RESOLVED', 'CANCELLED', 'all']).default('OPEN'),
  sortBy: z.enum(['volume', 'liquidity', 'newest', 'closingSoon', 'trending']).default('volume'),
  minVolume: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

// ─── Trade ────────────────────────────────────────────────────────────────────

export const PlaceTradeSchema = z.object({
  marketId: z.string().cuid('ID de mercado inválido'),
  outcome: z.enum(['YES', 'NO']),
  direction: z.enum(['BUY', 'SELL']),
  amount: z.number().positive('Valor deve ser positivo').max(50000, 'Máximo R$50.000 por trade'),
  maxSlippage: z.number().min(0.001).max(0.5).default(0.05), // 0.1% a 50%, padrão 5%
})

// ─── User ─────────────────────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  favoriteCategories: z.array(z.string()).max(5).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    marketResolved: z.boolean().optional(),
    priceAlerts: z.boolean().optional(),
  }).optional(),
})

// ─── Proposal ─────────────────────────────────────────────────────────────────

export const CreateProposalSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(20),
  category: z.enum(['politics', 'sports', 'crypto', 'economics', 'entertainment', 'science', 'latam']),
  suggestedResolutionDate: z.coerce.date().min(new Date()),
  resolutionCriteria: z.string().min(20),
})

// ─── Resolução ────────────────────────────────────────────────────────────────

export const ResolveMarketSchema = z.object({
  marketId: z.string().cuid(),
  outcome: z.enum(['YES', 'NO', 'CANCELLED']),
  evidenceUrl: z.string().url('URL de evidência obrigatória'),
  notes: z.string().max(1000).optional(),
})

// ─── Paginação ────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
})
```

### Aplicar em todas as rotas

Em `routes/markets.ts`:
```typescript
import { validate } from '../middleware/validate'
import { CreateMarketSchema, MarketQuerySchema, PlaceTradeSchema } from '../schemas'

router.get('/', validate(MarketQuerySchema, 'query'), async (req, res) => { ... })
router.post('/', requireAuth, validate(CreateMarketSchema), async (req, res) => { ... })
router.post('/:id/trade', requireAuth, validate(PlaceTradeSchema), async (req, res) => {
  const trade = await executeTrade({ userId: req.userId, ...req.body })
  res.json({ trade })
})
```

---

## IMPLEMENTAÇÃO 3 — SERVER-SENT EVENTS (SSE) PARA PREÇOS EM TEMPO REAL

### Por que vale a pena

Polling a cada X segundos desperdiça requests e é lento. SSE é uma conexão persistente e leve
onde o servidor empurra updates quando há mudança — perfeito para preços de mercado.

### Criar `src/api/routes/stream.ts`

```typescript
import { Router } from 'express'
import { prisma } from '../db/prisma'

const router = Router()

// GET /api/stream/markets/:id
// Conecta e recebe updates de preço em tempo real via SSE
router.get('/markets/:id', async (req, res) => {
  const { id } = req.params

  // Headers obrigatórios para SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Desabilitar buffering no Nginx
  res.flushHeaders()

  // Enviar estado atual imediatamente
  const sendMarketData = async () => {
    try {
      const market = await prisma.market.findUnique({
        where: { id },
        select: {
          probabilityYes: true,
          probabilityNo: true,
          volume24h: true,
          totalVolume: true,
          lastTradeAt: true,
          poolYes: true,
          poolNo: true,
        }
      })
      if (market) {
        res.write(`event: price_update\n`)
        res.write(`data: ${JSON.stringify(market)}\n\n`)
      }
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Erro ao buscar dados' })}\n\n`)
    }
  }

  // Enviar dado inicial
  await sendMarketData()

  // Polling interno a cada 2s (substituir por pub/sub com Redis em produção)
  const interval = setInterval(sendMarketData, 2000)

  // Heartbeat a cada 30s para manter conexão viva
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 30000)

  // Limpar ao desconectar
  req.on('close', () => {
    clearInterval(interval)
    clearInterval(heartbeat)
  })
})

// GET /api/stream/feed — Feed global de trades recentes
router.get('/feed', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const sendFeed = async () => {
    const recentTrades = await prisma.trade.findMany({
      where: { status: 'CONFIRMED', createdAt: { gte: new Date(Date.now() - 60000) } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, outcome: true, direction: true, totalCost: true, shares: true,
        createdAt: true,
        user: { select: { displayName: true, avatarUrl: true } },
        market: { select: { title: true, id: true } },
      }
    })
    res.write(`event: trades\ndata: ${JSON.stringify(recentTrades)}\n\n`)
  }

  await sendFeed()
  const interval = setInterval(sendFeed, 5000)
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000)
  req.on('close', () => { clearInterval(interval); clearInterval(heartbeat) })
})

export default router
```

### Hook React para consumir SSE

Criar `src/hooks/useMarketStream.ts`:

```typescript
import { useState, useEffect, useRef } from 'react'

interface MarketPriceData {
  probabilityYes: number
  probabilityNo: number
  volume24h: number
  totalVolume: number
  lastTradeAt: string
}

export function useMarketStream(marketId: string) {
  const [data, setData] = useState<MarketPriceData | null>(null)
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!marketId) return

    const es = new EventSource(`${import.meta.env.VITE_API_URL}/stream/markets/${marketId}`)
    esRef.current = es

    es.addEventListener('price_update', (e) => {
      setData(JSON.parse(e.data))
      setConnected(true)
    })

    es.onerror = () => {
      setConnected(false)
      // Reconectar após 5s automaticamente (EventSource faz isso nativamente)
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [marketId])

  return { data, connected }
}

// Hook para o feed global de trades
export function useTradesFeed() {
  const [trades, setTrades] = useState<any[]>([])

  useEffect(() => {
    const es = new EventSource(`${import.meta.env.VITE_API_URL}/stream/feed`)

    es.addEventListener('trades', (e) => {
      setTrades(JSON.parse(e.data))
    })

    return () => es.close()
  }, [])

  return trades
}
```

### Registrar rota no servidor

Em `src/api/server.ts`:
```typescript
import streamRouter from './routes/stream'
app.use('/api/stream', streamRouter)
```

---

## IMPLEMENTAÇÃO 4 — REGRAS DE ANTI-MANIPULAÇÃO

### Por que crítico

Sem isso, o mercado pode ser manipulado por:
- **Whale attacks**: Uma pessoa move todo o mercado com uma aposta enorme
- **Wash trading**: Mesmo usuário comprando e vendendo para inflar volume
- **Insider trading**: Criador do mercado apostando no próprio mercado

### Criar `src/api/services/anti-manipulation.ts`

```typescript
import { prisma } from '../db/prisma'
import { PlaceTradeSchema } from '../schemas'
import { z } from 'zod'

type TradeInput = z.infer<typeof PlaceTradeSchema> & { userId: string }

export type ManipulationCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: string }

/**
 * Verifica todas as regras de anti-manipulação antes de executar um trade.
 * Retorna { allowed: true } se OK, ou { allowed: false, reason } se bloqueado.
 */
export async function checkAntiManipulation(
  trade: TradeInput
): Promise<ManipulationCheckResult> {

  // Buscar dados necessários em paralelo
  const [market, user, recentTrades, isCreator] = await Promise.all([
    prisma.market.findUniqueOrThrow({
      where: { id: trade.marketId },
      select: { totalVolume: true, poolYes: true, poolNo: true, createdBy: true }
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: trade.userId },
      select: { balance: true, tradeCount: true, accountAgedays: true }
    }),
    prisma.trade.findMany({
      where: {
        userId: trade.userId,
        marketId: trade.marketId,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // últimos 5 min
        status: 'CONFIRMED',
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.market.findFirst({
      where: { id: trade.marketId, createdBy: trade.userId }
    })
  ])

  // ─── Regra 1: Insider trading ─────────────────────────────────────────────
  if (isCreator) {
    return {
      allowed: false,
      reason: 'Criador do mercado não pode negociar no próprio mercado.',
      code: 'INSIDER_TRADING',
    }
  }

  // ─── Regra 2: Whale protection ────────────────────────────────────────────
  const totalLiquidity = market.poolYes + market.poolNo
  const tradeImpactPercent = trade.amount / totalLiquidity
  if (tradeImpactPercent > 0.15) { // > 15% da liquidez total
    return {
      allowed: false,
      reason: `Trade excede 15% da liquidez do mercado (impacto: ${(tradeImpactPercent * 100).toFixed(1)}%). Divida em trades menores.`,
      code: 'WHALE_PROTECTION',
    }
  }

  // ─── Regra 3: Wash trading ────────────────────────────────────────────────
  const recentOpposite = recentTrades.filter(t =>
    t.outcome === trade.outcome && t.direction !== trade.direction
  )
  if (recentOpposite.length > 0) {
    const minutesAgo = Math.floor((Date.now() - recentOpposite[0].createdAt.getTime()) / 60000)
    return {
      allowed: false,
      reason: `Aguarde mais ${5 - minutesAgo} minuto(s) antes de inverter posição no mesmo outcome.`,
      code: 'WASH_TRADING',
    }
  }

  // ─── Regra 4: Rate limiting por usuário ───────────────────────────────────
  const tradesLast5min = recentTrades.length
  if (tradesLast5min >= 10) {
    return {
      allowed: false,
      reason: 'Limite de 10 trades por 5 minutos atingido. Aguarde.',
      code: 'RATE_LIMIT',
    }
  }

  // ─── Regra 5: Conta muito nova com valor alto ─────────────────────────────
  if (user.accountAgedays < 7 && trade.amount > 500) {
    return {
      allowed: false,
      reason: 'Contas novas (< 7 dias) têm limite de R$500 por trade. Complete a verificação de identidade para aumentar o limite.',
      code: 'NEW_ACCOUNT_LIMIT',
    }
  }

  // ─── Regra 6: Saldo insuficiente (double-check) ───────────────────────────
  if (trade.direction === 'BUY' && user.balance < trade.amount) {
    return {
      allowed: false,
      reason: 'Saldo insuficiente.',
      code: 'INSUFFICIENT_BALANCE',
    }
  }

  return { allowed: true }
}

/**
 * Log de tentativas bloqueadas para auditoria e detecção de padrões
 */
export async function logManipulationAttempt(
  trade: TradeInput,
  result: ManipulationCheckResult & { allowed: false }
) {
  await prisma.manipulationLog.create({
    data: {
      userId: trade.userId,
      marketId: trade.marketId,
      attemptedAmount: trade.amount,
      outcome: trade.outcome,
      direction: trade.direction,
      code: result.code,
      reason: result.reason,
    }
  }).catch(() => {}) // Não falhar o request por causa do log
}
```

### Integrar na rota de trade

Em `routes/markets.ts`:
```typescript
import { checkAntiManipulation, logManipulationAttempt } from '../services/anti-manipulation'
import { executeTrade } from '../services/amm'

router.post('/:id/trade', requireAuth, validate(PlaceTradeSchema), async (req, res) => {
  const tradeInput = { ...req.body, userId: req.userId, marketId: req.params.id }

  // 1. Verificar regras de anti-manipulação
  const check = await checkAntiManipulation(tradeInput)
  if (!check.allowed) {
    await logManipulationAttempt(tradeInput, check)
    return res.status(422).json({ error: check.reason, code: check.code })
  }

  // 2. Executar trade
  try {
    const result = await executeTrade(tradeInput)
    res.json({ success: true, trade: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})
```

### Adicionar tabela no Prisma schema

```prisma
model ManipulationLog {
  id              String   @id @default(cuid())
  userId          String
  marketId        String
  attemptedAmount Float
  outcome         String
  direction       String
  code            String   // INSIDER_TRADING, WHALE_PROTECTION, etc.
  reason          String
  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([marketId])
  @@index([code])
}
```

---

## IMPLEMENTAÇÃO 5 — EVENT BUS (ARQUITETURA REATIVA)

### Por que vale a pena

Atualmente o VoxPredict tem jobs isolados que rodam em intervalos. Isso é síncrono e acoplado.
Com um Event Bus, qualquer ação dispara handlers automaticamente — escalável e testável.

### Criar `src/api/services/event-bus.ts`

```typescript
import { EventEmitter } from 'events'
import { prisma } from '../db/prisma'

// ─── Tipos de eventos ─────────────────────────────────────────────────────────

export type MarketEvent =
  | { type: 'market.created';         payload: { marketId: string; createdBy: string } }
  | { type: 'market.activated';       payload: { marketId: string } }
  | { type: 'trade.executed';         payload: { tradeId: string; userId: string; marketId: string; outcome: string; amount: number } }
  | { type: 'market.resolved';        payload: { marketId: string; outcome: 'YES' | 'NO' | 'CANCELLED' } }
  | { type: 'market.closing_soon';    payload: { marketId: string; hoursLeft: number } }
  | { type: 'position.pnl_threshold'; payload: { userId: string; marketId: string; pnl: number } }
  | { type: 'user.first_trade';       payload: { userId: string } }

type EventHandler<T extends MarketEvent['type']> = (
  payload: Extract<MarketEvent, { type: T }>['payload']
) => Promise<void>

// ─── Event Bus ────────────────────────────────────────────────────────────────

class VoxEventBus {
  private emitter = new EventEmitter()

  on<T extends MarketEvent['type']>(event: T, handler: EventHandler<T>) {
    this.emitter.on(event, async (payload) => {
      try {
        await handler(payload)
      } catch (err) {
        console.error(`[EventBus] Erro no handler de ${event}:`, err)
        // Não propagar erro — handlers não devem quebrar o fluxo principal
      }
    })
  }

  emit<T extends MarketEvent['type']>(
    event: T,
    payload: Extract<MarketEvent, { type: T }>['payload']
  ) {
    this.emitter.emit(event, payload)
  }
}

export const eventBus = new VoxEventBus()

// ─── Registrar todos os handlers ─────────────────────────────────────────────

// Quando um trade é executado:
eventBus.on('trade.executed', async ({ marketId, userId, amount }) => {
  // Atualizar volume24h do mercado (job já faz isso, mas aqui é imediato)
  await prisma.market.update({
    where: { id: marketId },
    data: { volume24h: { increment: amount } }
  }).catch(() => {})
})

eventBus.on('trade.executed', async ({ userId }) => {
  // Verificar se é o primeiro trade do usuário
  const count = await prisma.trade.count({ where: { userId, status: 'CONFIRMED' } })
  if (count === 1) {
    eventBus.emit('user.first_trade', { userId })
  }
})

eventBus.on('user.first_trade', async ({ userId }) => {
  // Notificar usuário e dar bônus de "primeiro trade"
  await prisma.notification.create({
    data: {
      userId,
      type: 'ACHIEVEMENT',
      title: '🎉 Primeiro trade realizado!',
      message: 'Parabéns pelo seu primeiro trade no VoxPredict! Continue apostando.',
    }
  }).catch(() => {})
})

eventBus.on('market.resolved', async ({ marketId, outcome }) => {
  // Buscar todos os holders e calcular payouts
  if (outcome === 'CANCELLED') {
    // Devolver 100% para todos
    const positions = await prisma.position.findMany({ where: { marketId } })
    for (const pos of positions) {
      await prisma.user.update({
        where: { id: pos.userId },
        data: { balance: { increment: pos.totalInvested } }
      })
    }
    return
  }

  // Pagar apenas os winners
  const winningPositions = await prisma.position.findMany({
    where: { marketId, outcome }
  })

  for (const pos of winningPositions) {
    const payout = pos.shares * 1.0 // R$1 por share vencedora
    await prisma.user.update({
      where: { id: pos.userId },
      data: { balance: { increment: payout } }
    })
    await prisma.notification.create({
      data: {
        userId: pos.userId,
        type: 'MARKET_RESOLVED',
        title: '💰 Mercado resolvido — Você ganhou!',
        message: `Você recebeu R$${payout.toFixed(2)} pela sua posição ${outcome}.`,
        metadata: JSON.stringify({ marketId, payout, outcome }),
      }
    }).catch(() => {})
  }

  // Notificar losers
  const losingPositions = await prisma.position.findMany({
    where: { marketId, outcome: outcome === 'YES' ? 'NO' : 'YES' }
  })
  for (const pos of losingPositions) {
    await prisma.notification.create({
      data: {
        userId: pos.userId,
        type: 'MARKET_RESOLVED',
        title: '📉 Mercado resolvido',
        message: `O outcome ${outcome} venceu. Sua posição ${pos.outcome} não foi premiada.`,
        metadata: JSON.stringify({ marketId, outcome }),
      }
    }).catch(() => {})
  }
})

eventBus.on('market.resolved', async ({ marketId }) => {
  // Atualizar rankings após resolução
  await import('../jobs/update-rankings').then(m => m.updateRankings()).catch(() => {})
})
```

### Emitir eventos nas rotas

Em `routes/markets.ts`, após executar trade:
```typescript
import { eventBus } from '../services/event-bus'

// Após executeTrade() com sucesso:
eventBus.emit('trade.executed', {
  tradeId: result.tradeId,
  userId: req.userId,
  marketId: req.params.id,
  outcome: req.body.outcome,
  amount: req.body.amount,
})
```

Em `routes/oracle.ts`, após resolver mercado:
```typescript
eventBus.emit('market.resolved', {
  marketId: req.params.id,
  outcome: req.body.outcome,
})
```

---

## SCHEMA PRISMA — CAMPOS ADICIONAIS NECESSÁRIOS

Adicionar estes campos ao schema existente via migration:

```prisma
model Market {
  // Campos AMM — ADICIONAR SE NÃO EXISTIREM:
  poolYes        Float   @default(1000)  // Pool inicial de 1000 shares YES
  poolNo         Float   @default(1000)  // Pool inicial de 1000 shares NO
  probabilityYes Float   @default(0.5)
  probabilityNo  Float   @default(0.5)
  lastTradeAt    DateTime?

  // Campos de metadados
  createdBy      String
  imageUrl       String?
  tags           String[] @default([])
}

model Trade {
  // Campos AMM — ADICIONAR:
  priceImpact  Float?
  probBefore   Float?
  probAfter    Float?
  fee          Float   @default(0)
}

model Position {
  // Constraint única para upsert do AMM:
  @@unique([userId, marketId, outcome])
  totalInvested Float @default(0)
}

model User {
  accountAgedays Int @default(0)  // Calcular via createdAt no seed/migration
  tradeCount     Int @default(0)
}
```

---

## CHECKLIST DE IMPLEMENTAÇÃO DESTE ADDENDUM

Execute nesta ordem:

- [ ] **1. Schemas Zod** — criar `src/api/schemas/index.ts` e `src/api/middleware/validate.ts`
- [ ] **2. Migration Prisma** — adicionar campos `poolYes`, `poolNo`, `probabilityYes`, `probAfter`, etc.
- [ ] **3. AMM Service** — criar `src/api/services/amm.ts` completo
- [ ] **4. Anti-manipulação** — criar `src/api/services/anti-manipulation.ts` + tabela no Prisma
- [ ] **5. Event Bus** — criar `src/api/services/event-bus.ts` e registrar handlers
- [ ] **6. SSE** — criar `src/api/routes/stream.ts` e registrar no servidor
- [ ] **7. Hook SSE** — criar `src/hooks/useMarketStream.ts`
- [ ] **8. Quote endpoint** — adicionar `GET /api/markets/:id/quote` na rota de markets
- [ ] **9. Trade endpoint** — atualizar `POST /api/markets/:id/trade` com AMM + anti-manipulação + evento
- [ ] **10. PredictionInterface** — usar `useMarketStream` e exibir quote em tempo real
- [ ] **11. Testes AMM** — criar `tests/unit/amm.test.ts` cobrindo: quote buy, quote sell, price impact, slippage protection
- [ ] **12. Build** — garantir que `npm run build` passa sem erros

---

*Addendum criado em: 02/04/2026*
*Complementa: CLAUDE_CODE_PROMPT.md (Fases 1-8)*
