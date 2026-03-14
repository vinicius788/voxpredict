# VoxPredict - Auditoria de Seguranca

Data da auditoria: 13 de marco de 2026
Escopo: backend API (Express/Prisma), autenticacao, integracao on-chain/off-chain, frontend auth storage, contrato `PredictionMarket.sol`.
Metodo: revisao estatica de codigo + validacao de fluxo de seguranca.

## Resumo Executivo

Status geral: **RISCO ALTO**

Existe um conjunto de controles positivos (Helmet, CORS restrito por origem, rate limit, `authenticate`/`requireAdmin`, `nonReentrant` no contrato), mas ha falhas criticas que permitem:

1. Vincular carteira em qualquer usuario (`IDOR`) sem autenticacao.
2. Inflar pools e registrar apostas/claims no banco sem validacao on-chain de eventos.
3. Enviar emails por endpoint publico sem autenticao/autorizacao.

Esses pontos podem afetar saldo, ranking, integridade de mercado e reputacao da plataforma.

## Achados

### C1 - CRITICO - IDOR em `POST /api/auth/link-wallet`

Evidencia:
- `src/api/routes/auth.ts:113` ate `src/api/routes/auth.ts:124`
- A rota aceita `userId` no body e atualiza `walletAddress` sem `authenticate` e sem validar ownership.

Impacto:
- Um atacante pode tentar vincular uma carteira arbitraria a outro usuario (account takeover logico).

Cenario de abuso:
- Atacante descobre/enumera `userId`.
- Chama `POST /api/auth/link-wallet` com `userId` da vitima e carteira controlada.

Correcao recomendada:
- Exigir `authenticate`.
- Ignorar `userId` vindo do body e usar `req.user.id`.
- Exigir prova criptografica de ownership da carteira (SIWE challenge + signature) para o par usuario/carteira.
- Garantir unicidade de carteira no banco (indice unico normalizado em lowercase).

---

### C2 - CRITICO - Confianca em `txHash` do cliente para registrar aposta e claim

Evidencia:
- Registro de aposta: `src/api/routes/positions.ts:126` ate `src/api/routes/positions.ts:207`
- Claim off-chain: `src/api/routes/positions.ts:244` ate `src/api/routes/positions.ts:289`

Problema:
- O backend aceita `txHash` enviado pelo cliente sem checar receipt/event logs do contrato.
- `claim` marca `claimed=true` sem confirmar em cadeia que `claimWinnings` foi executado para aquele usuario/mercado.

Impacto:
- Integridade financeira off-chain comprometida.
- Possibilidade de inflar pools/estatisticas sem aposta real on-chain.
- Possibilidade de marcar posicoes como claimadas sem saque real.

Correcao recomendada:
- Validar receipt em RPC para `chainId` correto.
- Confirmar `status=1`, `to == CONTRACT_ADDRESS` e `from == carteira do usuario`.
- Decodificar logs e exigir evento esperado (`BetPlaced` / `WinningsClaimed`) com `marketId`, `user`, `amount`, `side` coerentes.
- Tornar idempotente por `(txHash, logIndex)`.

---

### H1 - ALTO - Endpoint de email sem auth (`/api/send-email`)

Evidencia:
- Rota publica em `src/api/server.ts:57` ate `src/api/server.ts:81`
- Esta fora de `authenticate/requireAdmin`.

Impacto:
- Abuso de envio (spam/phishing), consumo de credito do provedor de email, potencial blocklist de dominio.

Correcao recomendada:
- Mover para `app.use('/api', apiKeyAuth, apiRoutes)` com rota protegida por `authenticate + requireAdmin`.
- Aplicar allowlist de destinatarios em ambiente nao-producao.
- Sanitizar/limitar `html` e `subject`.

---

### H2 - ALTO - Endpoints de Oracle sem auth

Evidencia:
- `src/api/routes/oracle.ts:15` e `src/api/routes/oracle.ts:48`
- Nao ha `authenticate`/`requireAdmin`.

Impacto:
- Uso indevido de processamento e de recursos externos.
- Ataque de custo (DoS economico).

Correcao recomendada:
- Exigir `authenticate + requireAdmin` ou chave de servico dedicada.
- Rate limit separado por endpoint sensivel (mais estrito).

---

### M1 - MEDIO - Token de sessao em `localStorage`

Evidencia:
- `src/contexts/AuthContext.tsx:70` e `src/contexts/AuthContext.tsx:86`
- `src/lib/api-client.ts:11`

Impacto:
- Em caso de XSS, token pode ser exfiltrado.

Correcao recomendada:
- Migrar para cookie `HttpOnly`, `Secure`, `SameSite=Strict/Lax`.
- Reforcar CSP e higiene de XSS.

---

### M2 - MEDIO - Contrato usa `IERC20.transfer/transferFrom` sem `SafeERC20`

Evidencia:
- `src/contracts-p2/PredictionMarket.sol:103`
- `src/contracts-p2/PredictionMarket.sol:127`
- `src/contracts-p2/PredictionMarket.sol:154`
- `src/contracts-p2/PredictionMarket.sol:170`

Impacto:
- Tokens nao padrao ERC20 podem retornar `false` sem revert, gerando inconsistencia.

Correcao recomendada:
- Usar `SafeERC20` (`safeTransfer`, `safeTransferFrom`).

---

### M3 - MEDIO - Falta validacao de endereco zero para treasury

Evidencia:
- Construtor: `src/contracts-p2/PredictionMarket.sol:45`-`47`
- Setter: `src/contracts-p2/PredictionMarket.sol:214`-`216`

Impacto:
- Taxas podem ser enviadas para `address(0)` por configuracao incorreta.

Correcao recomendada:
- `require(_treasury != address(0), 'Invalid treasury')` no construtor e no setter.

---

### L1 - BAIXO - `nonceStore` em memoria e sem limpeza periodica

Evidencia:
- `src/api/routes/auth.ts:10` e uso em `:34`

Impacto:
- Escalabilidade limitada (multi-instance) e risco de crescimento de memoria em carga.

Correcao recomendada:
- Persistir nonce em Redis com TTL.
- Limpeza periodica para entradas expiradas.

## Pontos Positivos

1. `helmet`, `cors`, `compression`, `rateLimit` configurados (`src/api/server.ts`).
2. `authenticate` + `requireAdmin` aplicados em rotas administrativas sensiveis.
3. `nonReentrant` e `whenNotPaused` usados no contrato para funcoes de risco.
4. Correcao recente de logica financeira:
- `getOdds` coerente com modelo parimutuel.
- cancelamento automatico quando um lado do mercado esta vazio.

## Plano de Acao Prioritario

### P0 (corrigir em 24h)
1. Proteger e refatorar `POST /api/auth/link-wallet`.
2. Implementar verificacao on-chain forte em `POST /api/positions` e `PUT /api/positions/:marketId/claim`.
3. Proteger `/api/send-email`.
4. Proteger `/api/oracle/*`.

### P1 (esta semana)
1. Migrar auth token para cookie `HttpOnly`.
2. Migrar contrato para `SafeERC20`.
3. Validar endereco zero em treasury.

### P2 (proximo ciclo)
1. Nonce store com Redis + TTL.
2. Testes de seguranca automatizados (integ e abuso).
3. Observabilidade de fraude (alertas para padroes anormais de txHash e claims).

## Checklist de Validacao apos Correcao

1. Nao e possivel alterar carteira de outro usuario.
2. Nao e possivel registrar aposta sem tx valida on-chain.
3. Nao e possivel marcar claim sem evento `WinningsClaimed` valido.
4. `/api/send-email` responde 401/403 sem auth admin.
5. `/api/oracle/*` responde 401/403 sem auth admin.
6. Testes E2E passam para fluxo completo: bet -> resolve -> claim.

## Conclusao

A base do projeto esta evoluindo bem, mas os pontos C1/C2/H1 exigem bloqueio imediato para evitar comprometimento de integridade financeira e abuso operacional. Recomendado tratar P0 antes de qualquer ampliacao de usuarios em producao.
