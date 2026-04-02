# 🚀 VoxPredict — Prompt Completo para Claude Code
> Plataforma de mercados preditivos inspirada no Polymarket, focada em América Latina.
> Objetivo: atingir qualidade de produção nível Polymarket.

---

## 📋 CONTEXTO DO PROJETO

**Nome:** VoxPredict
**Stack:** React + TypeScript + Vite + Tailwind CSS + Clerk Auth + wagmi/viem + Express.js + Prisma + PostgreSQL + Solidity (Hardhat) + Anthropic AI
**Deployment:** Frontend → Vercel | Backend → Render/Railway
**Público-alvo:** América Latina — foco em Brasil, Argentina, México

O projeto é uma plataforma de mercados preditivos descentralizados onde usuários apostam em eventos futuros com tokens. A inspiração direta é o [Polymarket](https://polymarket.com). O projeto já tem uma base sólida mas precisa de:
1. Bugs corrigidos e código incompleto finalizado
2. Features faltantes implementadas do zero
3. Otimizações de performance e UX de nível produção
4. Testes e estabilidade

---

## 🔍 AUDITORIA OBRIGATÓRIA — FAÇA ISSO PRIMEIRO

Antes de qualquer implementação, leia e audite **todos** os arquivos abaixo e documente o que está quebrado, incompleto ou ausente:

```
src/App.tsx
src/main.tsx
src/types/index.ts
src/lib/constants.ts
src/lib/wagmi-config.ts
src/lib/api-client.ts
src/lib/supabase.ts
src/hooks/useMarkets.ts
src/hooks/usePlaceBet.ts
src/hooks/useWeb3.ts                  ← 72 bytes, provavelmente stub
src/hooks/useAdminAccess.ts          ← 784 bytes, provavelmente stub
src/hooks/useAdminData.ts            ← 631 bytes, provavelmente stub
src/hooks/useRealtimeNotifications.ts ← 1315 bytes, provavelmente incompleto
src/hooks/useVaultContract.ts
src/hooks/useUserDashboard.ts
src/hooks/useClaimWinnings.ts
src/hooks/usePlaceBet.ts
src/pages/LandingPage.tsx
src/pages/Dashboard.tsx
src/pages/MarketDetailPage.tsx
src/pages/UserDashboard.tsx           ← 51KB, o maior componente
src/pages/LeaderboardPage.tsx
src/pages/AdminDashboard.tsx
src/pages/TreasuryDashboard.tsx
src/pages/OracleDashboard.tsx
src/components/PredictionInterface.tsx ← 28KB, interface de trading
src/components/MarketCard.tsx
src/components/Header.tsx
src/components/AuthButton.tsx
src/components/DepositModal.tsx
src/api/server.ts
src/api/routes/markets.ts             ← 20KB, rota mais crítica
src/api/routes/users.ts
src/api/routes/finance.ts
src/api/routes/positions.ts
src/api/routes/oracle.ts
src/api/routes/notifications.ts
src/api/routes/polymarket.ts
src/api/services/polymarket.ts        ← 15KB, integração Polymarket
src/api/services/blockchain-indexer.ts
src/api/services/tx-validator.ts
src/api/services/auto-market-creator.ts
src/api/jobs/auto-market-creator.ts   ← 401 bytes, provavelmente stub
src/api/jobs/close-markets.ts
src/api/jobs/probability-snapshot.ts
src/api/jobs/update-rankings.ts
prisma/schema.prisma
prisma/seed.ts
src/contracts/VoxPredictMarket.sol
src/contracts/VoxPredictMarketFactory.sol
src/contracts/VoxPredictTreasury.sol
src/contracts/VoxPredictVault.sol
src/contracts/addresses.json
```

---

## ✅ FASE 1 — CORREÇÕES CRÍTICAS E COMPLETAÇÃO DE CÓDIGO

### 1.1 — TypeScript e Build
- [ ] Rodar `npm run build` e corrigir **todos** os erros de TypeScript sem usar `any` ou `as unknown`
- [ ] Garantir que `tsconfig.json` está em modo strict
- [ ] Eliminar todos os `console.log` de debug (manter apenas `console.error` com contexto)
- [ ] Verificar imports não utilizados e remover
- [ ] Adicionar tipos explícitos onde estiver faltando — especialmente nas respostas de API

### 1.2 — Hooks Stub/Incompletos
Implementar completamente:

**`useWeb3.ts`** (atualmente 72 bytes — é um stub):
- Deve exportar: `account`, `isConnected`, `chainId`, `switchChain()`, `disconnect()`
- Usar wagmi hooks (`useAccount`, `useChainId`, `useSwitchChain`)
- Integrar com o `wagmi-config.ts` existente

**`useAdminAccess.ts`** (784 bytes):
- Verificar se o usuário Clerk tem `publicMetadata.role === 'admin'` ou endereço na lista whitelist
- Retornar `{ isAdmin, isLoading, canAccessAdmin }`

**`useAdminData.ts`** (631 bytes):
- Buscar estatísticas admin: total markets, volume, usuários, fees coletadas
- Usar React Query com cache de 30s

**`useRealtimeNotifications.ts`** (1315 bytes):
- Implementar polling a cada 10s ou WebSocket se disponível
- Retornar lista de notificações não lidas e função `markAsRead(id)`

### 1.3 — Jobs do Backend (todos muito pequenos, provavelmente stubs)

**`src/api/jobs/auto-market-creator.ts`** (401 bytes — definitivamente stub):
Implementar job completo:
```typescript
// Deve:
// 1. Buscar mercados sugeridos pelo AI (chamar o serviço auto-market-creator)
// 2. Filtrar duplicatas verificando mercados existentes no DB
// 3. Criar mercados automaticamente via Prisma com status DRAFT
// 4. Notificar admins via notification
// 5. Logar resultado
// Rodar a cada 6 horas via setInterval ou node-cron
```

**`src/api/jobs/close-markets.ts`** (904 bytes):
- Buscar todos os mercados com `closesAt < now` e status `OPEN`
- Mudar status para `CLOSED`
- Calcular probabilidades finais
- Notificar usuários com posições abertas

**`src/api/jobs/probability-snapshot.ts`** (2007 bytes):
- Tirar snapshot das probabilidades atuais de todos os mercados ativos
- Salvar no banco para histórico de charts
- Deve rodar a cada 1 hora

**`src/api/jobs/update-rankings.ts`**:
- Recalcular leaderboard global
- Atualizar campos `rankPosition`, `totalPnl`, `winRate` no User

### 1.4 — Rotas de API Incompletas

Para cada rota, garantir:
- Validação de input com Zod
- Paginação com `limit` e `cursor` (cursor-based, não offset)
- Error handling com status codes corretos
- Rate limiting por usuário (usar express-rate-limit)
- Autenticação verificada onde necessário

**`/api/routes/notifications.ts`** (2144 bytes — muito pequeno):
```
GET  /notifications          → lista paginada das notificações do usuário
POST /notifications/:id/read → marcar como lida
POST /notifications/read-all → marcar todas como lidas
DELETE /notifications/:id    → deletar notificação
```

**`/api/routes/oracle.ts`** (3116 bytes):
```
GET  /oracle/pending         → mercados aguardando resolução
POST /oracle/resolve/:id     → resolver mercado com resultado (YES/NO)
GET  /oracle/history         → histórico de resoluções
POST /oracle/dispute/:id     → abrir disputa sobre resolução
```

**`/api/routes/treasury.ts`** (3110 bytes):
```
GET /treasury/stats          → saldo, fees acumuladas, volume
GET /treasury/transactions   → histórico de transações
```

**`/api/routes/finance.ts`** (6215 bytes):
Verificar e completar:
```
POST /finance/deposit        → registrar depósito
POST /finance/withdraw       → processar saque
GET  /finance/history        → histórico de transações do usuário
GET  /finance/balance        → saldo atual do usuário
```

---

## ✅ FASE 2 — FEATURES FALTANTES (NÍVEL POLYMARKET)

### 2.1 — Sistema de Trading Completo

O Polymarket usa um sistema de CLOB (Central Limit Order Book) ou AMM. Implemente um AMM simplificado no backend:

**Criar `src/api/services/amm.ts`:**
```typescript
// Algoritmo de constant product market maker: x * y = k
// Funções:
// calcBuyPrice(marketId, outcome, shares) → { price, priceImpact, fee }
// calcSellPrice(marketId, outcome, shares) → { price, priceImpact, fee }
// executeTrade(userId, marketId, outcome, type, amount) → { txId, sharesReceived, avgPrice }
// getOdds(marketId) → { yes: number, no: number } // valores em cents (0-100)
```

**Atualizar `PredictionInterface.tsx`:**
- Mostrar preço de impacto (price impact) em tempo real conforme usuário digita
- Mostrar fee estimada (ex: 2%)
- Mostrar shares que receberá
- Mostrar probabilidade após trade
- Botão de toggle BUY / SELL
- Slider para % do portfolio
- Confirmação com resumo antes de executar
- Resultado animado após execução

### 2.2 — Activity Feed (Feed de Atividade em Tempo Real)

Criar `src/components/ActivityFeed.tsx`:
- Mostrar últimas apostas em tempo real (polling 5s)
- Formato: "🟢 João apostou R$50 em SIM | Bitcoin acima de $100k"
- Filtrar por mercado (quando na página de detalhe)
- Filtrar global (no dashboard)
- Avatar do usuário, timestamp relativo ("há 2 minutos")
- Animação de entrada suave (slide + fade)

Criar endpoint: `GET /api/markets/:id/activity?limit=20`

### 2.3 — Market Comments / Discussão

Criar tabela `Comment` no Prisma:
```prisma
model Comment {
  id        String   @id @default(cuid())
  marketId  String
  userId    String
  content   String   @db.Text
  upvotes   Int      @default(0)
  createdAt DateTime @default(now())
  market    Market   @relation(fields: [marketId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}
```

Criar `src/components/MarketComments.tsx`:
- Lista de comentários com avatar + nome + tempo
- Input para novo comentário (requer auth)
- Upvote com debounce
- Paginação infinita (load more)
- Máx 500 caracteres com contador

### 2.4 — Search e Filtros Avançados

Criar `src/components/MarketSearch.tsx`:
- Busca em tempo real (debounce 300ms)
- Filtros: Categoria, Status (Aberto/Fechado/Resolvido), Volume (mínimo), Data de fechamento
- Ordenação: Volume, Liquidez, Mais recente, Mais apostado, Encerrando em breve
- Persistir filtros na URL (query params) para compartilhamento
- Skeleton loading durante busca

Atualizar `GET /api/markets` para suportar:
```
?search=bitcoin&category=crypto&status=OPEN&sortBy=volume&minVolume=1000&closingBefore=2025-12-31&limit=20&cursor=xxx
```

### 2.5 — Portfolio Analytics (Análise de Portfólio)

Expandir `UserDashboard.tsx` com seção de analytics:
- Gráfico de PnL ao longo do tempo (linha, usando Recharts)
- Win rate por categoria
- Histórico de posições com filtros
- Posições abertas com P&L atual em tempo real
- Posições ganhas vs perdidas (breakdown visual)
- ROI total e por período (7d, 30d, 90d, all-time)
- Distribuição de apostas por categoria (pie chart)

Criar hook `usePortfolioAnalytics.ts` que agrupa os dados do `useUserDashboard.ts`

### 2.6 — Market Creator Flow

Melhorar o fluxo de criação de mercados (AdminCreateMarket + ProposeMarketModal):

**Para usuários comuns (Proposta):**
- Wizard com 3 passos: Pergunta → Detalhes → Revisão
- Validações em tempo real (ex: pergunta deve ter resposta binária SIM/NOU)
- Preview do card antes de submeter
- Status de aprovação com email notification

**Para admins:**
- Criar mercado diretamente
- Upload de imagem para o mercado (via Cloudinary ou similar)
- Configurar odds iniciais (probabilidade inicial)
- Configurar liquidez inicial
- Preview ao vivo do card

### 2.7 — Sistema de Notificações Completo

Completar `NotificationCenter.tsx`:
- Notificações em tempo real (polling 10s ou WebSocket)
- Tipos: Mercado resolvido, Posição ganha, Posição perdida, Novo mercado na sua categoria favorita, Mercado encerrando em 24h
- Badge com contagem de não lidas no header
- Marcar como lida ao clicar
- Limpar todas
- Som opcional (toggle)
- Push notifications (PWA) para mobile

### 2.8 — Compartilhamento Social

Melhorar `ShareMarketButton.tsx`:
- Gerar OG image dinâmica com: nome do mercado, probabilidade atual, logo VoxPredict
- Share para: Twitter/X, WhatsApp, Telegram, Copiar link
- Deep link para o mercado específico
- Tracking de conversão por canal

### 2.9 — Onboarding para Novos Usuários

Criar `src/components/OnboardingFlow.tsx`:
- Modal de boas-vindas para primeiro acesso
- 4 passos: Bem-vindo → Como funciona → Conectar carteira → Ganhar moedas grátis
- Guia interativo: highlight de elementos da UI (tooltip overlay)
- Mercado de demonstração sem dinheiro real para praticar
- Completar onboarding dá bônus de R$10 virtual

---

## ✅ FASE 3 — UX/UI NÍVEL POLYMARKET

### 3.1 — Design System e Consistência Visual

Criar `src/lib/design-tokens.ts` com todas as cores, espaçamentos e tipografia como constantes TypeScript.

Auditar e padronizar todos os componentes para usar:
- **Cores:** Usar paleta consistente. Primária: verde (#00C853 para SIM/BUY), vermelho (#FF1744 para NÃO/SELL), fundo dark (#0D0D0D, #141414, #1A1A1A)
- **Tipografia:** Inter ou similar — definir hierarchy: h1, h2, h3, body, caption, mono (para valores)
- **Bordas:** rounded-xl consistente
- **Shadows:** sombras sutis para cards
- **Estados:** hover, focus, active, disabled — todos definidos

### 3.2 — Skeleton Loaders em Toda a App

Substituir spinners por skeleton loaders em:
- MarketCard (skeleton do card inteiro)
- MarketDetailPage (skeleton do header + interface de trading)
- UserDashboard (skeleton das estatísticas)
- LeaderboardPage (skeleton da tabela)
- ActivityFeed (skeleton das linhas)

Usar `src/components/ui/Skeleton.tsx` como componente base reutilizável.

### 3.3 — Animações e Micro-interações

Instalar e usar `framer-motion`:
- Cards aparecem com fade + slide-up no scroll
- Probabilidade muda com animação de número (count-up)
- Toast notifications com slide-in
- Modal com backdrop blur e escala suave
- Tab switches com animação de underline deslizando
- Botão de BUY/SELL com press effect
- Success state após trade com confetti (canvas-confetti)

### 3.4 — MarketCard Aprimorado

O `MarketCard.tsx` deve ter:
- Mini gráfico de probabilidade inline (sparkline, últimas 24h)
- Badge de categoria com cor específica
- Volume 24h e volume total
- Número de apostadores
- Tempo restante com urgência visual (vermelho quando < 24h)
- Probabilidade em % grande e destacada
- Botões de BUY SIM / BUY NÃO direto no card (quick trade)
- Animação de hover com elevação sutil
- Indicador se o usuário JÁ apostou neste mercado

### 3.5 — MarketDetailPage Completa

A página de detalhe deve ter layout similar ao Polymarket:
```
[Header com breadcrumb]
[Imagem/Banner do Mercado]
[Pergunta em destaque] [Badge status]

Left Column (60%):              Right Column (40%):
- Gráfico de probabilidade      - PredictionInterface (trading)
  ao longo do tempo               - BUY/SELL toggle
  (Recharts, interativo)          - Input de valor
- Activity Feed                  - Resumo do trade
- Comments                       - Botão executar
- Informações da resolução
- Regras do mercado
```

Adicionar:
- Breadcrumb: Home > Categoria > Mercado
- Share button proeminente
- Botão "Adicionar aos Favoritos" (coração)
- Related markets (mercados similares)
- Resolution criteria em destaque (como o mercado será resolvido)

### 3.6 — LandingPage de Conversão

A landing page deve convencer novos usuários:
- Hero com headline impactante em português
- Mostrar 3-4 mercados ao vivo (dados reais) como preview
- Seção "Como funciona" com 3 passos animados
- Seção de estatísticas: "R$X em volume | Y mercados ativos | Z usuários"
- Seção de categorias
- Social proof: testimoniais ou logos de parceiros
- CTA final: "Começar a apostar grátis"
- FAQ (accordion)
- Mobile-first design

### 3.7 — Mobile Experience

Garantir que TODA a app funciona perfeitamente em mobile:
- `MobileBottomNav.tsx` com tabs: Home, Mercados, Portfólio, Perfil
- Swipe gestures para navegar entre tabs
- PredictionInterface adaptada para mobile (bottom sheet ao invés de sidebar)
- MarketCard otimizado para toque (área de toque mínima de 44px)
- Charts redimensionáveis
- Header colapsável ao fazer scroll para baixo
- Testar em iPhone SE (375px) e telas grandes (428px)

---

## ✅ FASE 4 — PERFORMANCE E OTIMIZAÇÕES

### 4.1 — React Query (TanStack Query)

Se ainda não estiver usando, instalar e migrar TODOS os data fetching para React Query:
```typescript
// Configuração global: staleTime, gcTime, retry
// Prefetch de mercados populares no layout
// Invalidação inteligente após mutations
// Optimistic updates para trades (atualiza UI antes de confirmar)
// Background refetch a cada 30s para mercados ativos
```

### 4.2 — Virtualização de Listas

Para listas longas de mercados e posições, usar `@tanstack/react-virtual`:
- Dashboard de mercados (pode ter 100+ mercados)
- Histórico de posições no UserDashboard
- Leaderboard (100+ usuários)

### 4.3 — Code Splitting e Lazy Loading

Auditar `App.tsx` e garantir que TODAS as páginas usam `React.lazy()`:
```typescript
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const OracleDashboard = lazy(() => import('./pages/OracleDashboard'))
// etc para todas as páginas pesadas
```

Cada rota deve ter um `<Suspense>` com Skeleton loader adequado.

### 4.4 — Image Optimization

- Todas as imagens de mercados devem usar formato WebP
- Lazy loading nativo (`loading="lazy"`)
- Blur placeholder enquanto carrega (usar blurhash ou low-res base64)
- Resize automático baseado no container

### 4.5 — API Response Caching

No backend Express, adicionar:
- Redis para cache de respostas frequentes (lista de mercados, leaderboard)
- Cache-Control headers corretos
- ETags para conditional requests
- Se não tiver Redis, usar node-cache como fallback in-memory

### 4.6 — Bundle Size

Rodar `npm run build -- --analyze` e:
- Identificar os maiores chunks
- Lazy-load bibliotecas pesadas (ethers.js, recharts)
- Tree-shake imports do wagmi/viem
- Verificar se há dependências duplicadas

---

## ✅ FASE 5 — SMART CONTRACTS E WEB3

### 5.1 — Auditoria dos Contratos

Ler e auditar todos os contratos Solidity:
- `VoxPredictMarket.sol` — contrato principal de mercados
- `VoxPredictMarketFactory.sol` — factory para criar mercados
- `VoxPredictTreasury.sol` — tesouraria
- `VoxPredictVault.sol` — vault de usuários

Verificar:
- Vulnerabilidades de reentrancy (usar ReentrancyGuard)
- Overflow/underflow (Solidity 0.8+ previne, mas verificar)
- Access control (onlyOwner, onlyAdmin)
- Eventos emitidos para todas as ações críticas
- Funções de emergência (pause, emergencyWithdraw)

### 5.2 — Deploy e Integração

Se os contratos não estiverem deployados:
1. Deploy no Polygon Mumbai testnet primeiro
2. Atualizar `src/contracts/addresses.json` com os endereços corretos
3. Gerar ABIs atualizadas via Hardhat
4. Integrar com frontend via wagmi hooks existentes

### 5.3 — Blockchain Indexer

Completar `src/api/services/blockchain-indexer.ts`:
- Escutar eventos dos contratos (MarketCreated, BetPlaced, MarketResolved, etc.)
- Sincronizar estado on-chain com banco de dados
- Handle de reorgs (blockchain reorganizations)
- Retry automático em caso de falha de conexão ao RPC

---

## ✅ FASE 6 — BACKEND ROBUSTO

### 6.1 — WebSocket para Tempo Real

Adicionar Socket.io ao servidor Express:
```typescript
// Rooms por mercado: `market:${marketId}`
// Eventos:
// 'price_update' — nova probabilidade
// 'new_trade' — nova aposta realizada
// 'market_resolved' — mercado resolvido
// 'new_comment' — novo comentário
```

Frontend deve conectar ao WebSocket e usar eventos ao invés de polling onde possível.

### 6.2 — Middleware de Segurança

Garantir que o servidor tem:
```typescript
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'

// Rate limits por rota:
// /api/markets → 100 req/min
// /api/trades → 20 req/min
// /api/auth → 10 req/min
```

### 6.3 — Logging e Monitoring

Implementar logging estruturado com Winston ou Pino:
```typescript
// Logar: request (método + path + userId + latência)
// Logar: erros com stack trace + contexto
// Logar: trades executados (marketId, userId, valor, tipo)
// Logar: jobs cron (início, fim, resultado)
```

### 6.4 — Health Check e Graceful Shutdown

```typescript
GET /health → { status: 'ok', db: 'ok', uptime: 123 }
GET /health/detailed → stats completas

// Graceful shutdown:
// SIGTERM → parar de aceitar conexões → aguardar requests em andamento → fechar DB → exit
```

### 6.5 — Database Migrations

Verificar se todas as migrations do Prisma estão atualizadas:
```bash
npx prisma migrate deploy  # deve rodar sem erros
npx prisma db seed         # seed deve funcionar
```

Se houver inconsistências entre schema e migrations, corrigir.

---

## ✅ FASE 7 — TESTES

### 7.1 — Testes Unitários (Vitest)

Criar testes para funções críticas:
```
tests/unit/amm.test.ts          → testar cálculo de preços AMM
tests/unit/probability.test.ts  → testar cálculo de probabilidades
tests/unit/leaderboard.test.ts  → testar algoritmo de ranking
```

### 7.2 — Testes de Integração (API)

```
tests/integration/markets.test.ts   → CRUD de mercados
tests/integration/trades.test.ts    → fluxo completo de trade
tests/integration/auth.test.ts      → autenticação e autorização
```

### 7.3 — Testes E2E (Playwright)

```
tests/e2e/landing.spec.ts           → landing page carrega e mostra mercados
tests/e2e/trading.spec.ts           → usuário consegue apostar em mercado
tests/e2e/dashboard.spec.ts         → dashboard mostra posições corretamente
```

---

## ✅ FASE 8 — FEATURES DIFFERENTIATORS (O QUE TORNA ÚNICO)

Estas features tornam o VoxPredict único e não são cópias do Polymarket:

### 8.1 — VoxAI Assistant

Usar a engine AI existente (`src/vox-ai-engine/`) para:
- Chatbot no sidebar que responde dúvidas sobre os mercados
- "Por que a probabilidade mudou?" → AI explica com contexto
- Sugestão personalizada: "Baseado no seu histórico, você pode gostar deste mercado"
- Análise de mercado: "Quais fatores afetam este mercado?"

### 8.2 — Mercados Foco América Latina

Criar categoria especial "LATAM" com mercados específicos:
- Eleições presidenciais (Brasil 2026, Argentina, México)
- Copa América, Copa do Brasil, Libertadores
- Economia: IBOVESPA, Dólar x Real, inflação
- Política brasileira, argentina

O auto-market-creator deve priorizar eventos LATAM.

### 8.3 — Sistema de Ligas e Torneios

Criar `src/pages/TournamentsPage.tsx`:
- Ligas semanais/mensais com prize pool
- Usuários competem entre si em mercados específicos
- Ranking da liga separado do global
- Premiação automática ao final da liga

### 8.4 — Modo Demo / Paper Trading

- Usuários podem apostar com dinheiro fictício sem carteira conectada
- Portfolio demo separado do real
- Aprender sem risco financeiro
- Converter para conta real com histórico visível

---

## 🔧 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

Verificar e garantir que **todas** existem no `.env` / `.env.production`:

```env
# Frontend (VITE_)
VITE_CLERK_PUBLISHABLE_KEY=
VITE_API_URL=
VITE_WALLETCONNECT_PROJECT_ID=
VITE_POLYGON_RPC_URL=
VITE_ANTHROPIC_API_KEY=  # para VoxAI no frontend (se necessário)

# Backend
DATABASE_URL=            # PostgreSQL connection string
CLERK_SECRET_KEY=
ANTHROPIC_API_KEY=       # para geração de mercados e AI
REDIS_URL=               # para cache (opcional)
POLYGON_RPC_URL=
PRIVATE_KEY=             # chave da carteira admin (para fechar mercados on-chain)

# Contratos (endereços deployados)
VITE_MARKET_FACTORY_ADDRESS=
VITE_TREASURY_ADDRESS=
VITE_VAULT_ADDRESS=
```

---

## 📊 PRISMA SCHEMA — VERIFICAR E COMPLETAR

Garantir que o schema tem todas as tabelas necessárias. Se alguma estiver faltando, criar a migration:

```prisma
// Verificar se existem:
model Market {
  // id, title, description, category, status, closesAt
  // yesPrice, noPrice, totalVolume, liquidity
  // createdAt, updatedAt, resolvedAt, resolution (YES/NO)
  // creatorId, imageUrl, tags, rules, sourceUrl
  comments   Comment[]
  Activity   Activity[]
}

model Trade {
  // id, userId, marketId, outcome (YES/NO)
  // type (BUY/SELL), shares, price, totalCost, fee
  // status (PENDING/CONFIRMED/FAILED), txHash
  // createdAt
}

model Position {
  // id, userId, marketId, outcome
  // shares, avgPrice, currentValue, pnl
}

model Comment {
  // id, userId, marketId, content, upvotes, createdAt
}

model Activity {
  // id, marketId, userId, type, amount, outcome, createdAt
  // Para o activity feed em tempo real
}

model Notification {
  // id, userId, type, title, message, read, createdAt, metadata (JSON)
}

model UserStats {
  // id, userId, totalPnl, winRate, marketsTraded, rank, updatedAt
}
```

---

## 🚢 CHECKLIST FINAL DE PRODUÇÃO

Antes de declarar o projeto pronto:

- [ ] `npm run build` sem erros e sem warnings de TypeScript
- [ ] `npm run test` todos os testes passando
- [ ] Lighthouse score: Performance >85, Accessibility >90, Best Practices >90, SEO >85
- [ ] HTTPS configurado
- [ ] CSP (Content Security Policy) headers corretos
- [ ] Variáveis de ambiente de produção configuradas
- [ ] Database migration aplicada em produção
- [ ] Contratos deployados e verificados no PolygonScan
- [ ] Error tracking (Sentry) configurado
- [ ] Analytics (Mixpanel ou Plausible) integrado
- [ ] Sitemap.xml atualizado com todas as páginas
- [ ] robots.txt correto
- [ ] Favicon e PWA manifest configurados
- [ ] OG tags em todas as páginas (title, description, image)
- [ ] Rate limiting ativo no backend
- [ ] CORS configurado para produção (apenas o domínio correto)
- [ ] Logs de produção funcionando
- [ ] Graceful shutdown do servidor
- [ ] Backups do banco de dados configurados

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

Execute as fases nesta ordem para maximizar resultado:

1. **Auditoria** → ler todos os arquivos, documentar problemas
2. **Build fix** → fazer `npm run build` funcionar sem erros
3. **Fase 1** → corrigir stubs e código incompleto
4. **Fase 6** → backend robusto (sem backend funcional, nada funciona)
5. **Fase 2** → features faltantes (trading, activity feed, search)
6. **Fase 3** → UX/UI refinements
7. **Fase 4** → performance optimizations
8. **Fase 5** → smart contracts
9. **Fase 7** → testes
10. **Fase 8** → differentiators (features únicas)
11. **Checklist final** → validação completa

---

## 💡 NOTAS IMPORTANTES

1. **Não use `any` em TypeScript.** Se precisar de tipo desconhecido, use `unknown` e faça type narrowing correto.

2. **Não quebre features existentes.** Antes de alterar qualquer arquivo, entenda o que ele faz e se já está sendo usado.

3. **Commits atômicos.** Faça commits separados por feature/fix para facilitar revisão.

4. **Português no código é OK** para variáveis de domínio (ex: `mercado`, `aposta`) mas prefira inglês para termos técnicos.

5. **Mobile first.** Toda nova feature deve funcionar no celular antes do desktop.

6. **A experiência do usuário é prioridade.** Se algo está tecnicamente correto mas confuso para o usuário, refaça.

7. **Mantenha a paridade com Polymarket** como benchmark. Abra o Polymarket em paralelo e compare feature por feature.

---

*Prompt gerado em: 02/04/2026*
*Projeto: VoxPredict — Mercados Preditivos para América Latina*
*Objetivo: Qualidade de produção nível Polymarket*
