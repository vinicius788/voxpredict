# Configuração do Subgraph para VoxPredict

Este documento descreve como configurar e implantar um subgraph para indexar eventos dos contratos VoxPredict na blockchain.

## O que é um Subgraph?

Um subgraph é uma API GraphQL que indexa e organiza dados da blockchain, permitindo consultas eficientes e em tempo real. Para a VoxPredict, usaremos o The Graph para indexar eventos como criação de mercados, apostas e resoluções.

## Pré-requisitos

- Node.js v14+
- Yarn
- Conta no The Graph Studio
- Endereços dos contratos implantados

## 1. Instalação do Graph CLI

```bash
yarn global add @graphprotocol/graph-cli
```

## 2. Inicialização do Subgraph

```bash
# Crie um novo diretório para o subgraph
mkdir voxpredict-subgraph
cd voxpredict-subgraph

# Inicialize o subgraph
graph init \
  --product hosted-service \
  --from-contract <ENDEREÇO_DO_MARKET_FACTORY> \
  --network <REDE> \
  --abi ./abis/VoxPredictMarketFactory.json \
  voxpredict/markets
```

Substitua:
- `<ENDEREÇO_DO_MARKET_FACTORY>` pelo endereço do contrato VoxPredictMarketFactory
- `<REDE>` por `mainnet`, `polygon` ou `base` dependendo de onde você implantou

## 3. Configuração do Schema

Edite o arquivo `schema.graphql` para definir as entidades:

```graphql
type Market @entity {
  id: ID!
  address: Bytes!
  question: String!
  description: String!
  options: [String!]!
  endTime: BigInt!
  minBet: BigInt!
  maxBet: BigInt!
  category: String!
  tags: [String!]!
  creator: Bytes!
  totalVolume: BigInt!
  totalBettors: Int!
  isActive: Boolean!
  isResolved: Boolean!
  winningOption: Int
  createdAt: BigInt!
  resolvedAt: BigInt
  bets: [Bet!]! @derivedFrom(field: "market")
}

type Bet @entity {
  id: ID!
  market: Market!
  user: User!
  option: Int!
  amount: BigInt!
  timestamp: BigInt!
}

type User @entity {
  id: ID!
  totalBets: Int!
  totalVolume: BigInt!
  bets: [Bet!]! @derivedFrom(field: "user")
  winCount: Int!
  lossCount: Int!
}
```

## 4. Configuração do Subgraph

Edite o arquivo `subgraph.yaml`:

```yaml
specVersion: 0.0.4
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: VoxPredictMarketFactory
    network: <REDE>
    source:
      address: "<ENDEREÇO_DO_MARKET_FACTORY>"
      abi: VoxPredictMarketFactory
      startBlock: <BLOCO_INICIAL>
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.6
      language: wasm/assemblyscript
      entities:
        - Market
      abis:
        - name: VoxPredictMarketFactory
          file: ./abis/VoxPredictMarketFactory.json
        - name: VoxPredictMarket
          file: ./abis/VoxPredictMarket.json
      eventHandlers:
        - event: MarketCreated(indexed uint256,indexed address,string,indexed address,uint256)
          handler: handleMarketCreated
      file: ./src/mapping.ts
templates:
  - kind: ethereum
    name: VoxPredictMarket
    network: <REDE>
    source:
      abi: VoxPredictMarket
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.6
      language: wasm/assemblyscript
      entities:
        - Market
        - Bet
        - User
      abis:
        - name: VoxPredictMarket
          file: ./abis/VoxPredictMarket.json
      eventHandlers:
        - event: BetPlaced(indexed address,indexed uint256,uint256,uint256)
          handler: handleBetPlaced
        - event: MarketResolved(indexed uint256,uint256,uint256)
          handler: handleMarketResolved
        - event: Withdrawal(indexed address,uint256,uint256)
          handler: handleWithdrawal
      file: ./src/market-mapping.ts
```

## 5. Implementação dos Handlers

Crie o arquivo `src/mapping.ts`:

```typescript
import { MarketCreated } from '../generated/VoxPredictMarketFactory/VoxPredictMarketFactory'
import { VoxPredictMarket } from '../generated/templates'
import { Market } from '../generated/schema'

export function handleMarketCreated(event: MarketCreated): void {
  // Create a new Market entity
  let market = new Market(event.params.marketAddress.toHexString())
  
  // Set market properties
  market.address = event.params.marketAddress
  market.question = event.params.question
  market.creator = event.params.creator
  market.endTime = event.params.endTime
  market.createdAt = event.block.timestamp
  market.totalVolume = BigInt.fromI32(0)
  market.totalBettors = 0
  market.isActive = true
  market.isResolved = false
  
  // Get additional data from the contract
  let marketContract = VoxPredictMarket.bind(event.params.marketAddress)
  
  let descriptionCall = marketContract.try_description()
  if (!descriptionCall.reverted) {
    market.description = descriptionCall.value
  }
  
  let optionsResult: string[] = []
  let i = 0
  let optionCall = marketContract.try_options(BigInt.fromI32(i))
  
  while (!optionCall.reverted) {
    optionsResult.push(optionCall.value)
    i++
    optionCall = marketContract.try_options(BigInt.fromI32(i))
  }
  
  market.options = optionsResult
  
  let categoryCall = marketContract.try_category()
  if (!categoryCall.reverted) {
    market.category = categoryCall.value
  } else {
    market.category = "unknown"
  }
  
  let tagsResult: string[] = []
  i = 0
  let tagCall = marketContract.try_tags(BigInt.fromI32(i))
  
  while (!tagCall.reverted) {
    tagsResult.push(tagCall.value)
    i++
    tagCall = marketContract.try_tags(BigInt.fromI32(i))
  }
  
  market.tags = tagsResult
  
  let minBetCall = marketContract.try_minBet()
  if (!minBetCall.reverted) {
    market.minBet = minBetCall.value
  } else {
    market.minBet = BigInt.fromI32(0)
  }
  
  let maxBetCall = marketContract.try_maxBet()
  if (!maxBetCall.reverted) {
    market.maxBet = maxBetCall.value
  } else {
    market.maxBet = BigInt.fromI32(0)
  }
  
  // Save the market entity
  market.save()
  
  // Start indexing events from this market
  VoxPredictMarket.create(event.params.marketAddress)
}
```

Crie o arquivo `src/market-mapping.ts`:

```typescript
import { 
  BetPlaced, 
  MarketResolved,
  Withdrawal
} from '../generated/templates/VoxPredictMarket/VoxPredictMarket'
import { Market, Bet, User } from '../generated/schema'

export function handleBetPlaced(event: BetPlaced): void {
  // Load the market
  let marketAddress = event.address.toHexString()
  let market = Market.load(marketAddress)
  
  if (market == null) {
    return
  }
  
  // Create or load the user
  let userId = event.params.user.toHexString()
  let user = User.load(userId)
  
  if (user == null) {
    user = new User(userId)
    user.totalBets = 0
    user.totalVolume = BigInt.fromI32(0)
    user.winCount = 0
    user.lossCount = 0
  }
  
  // Update user stats
  user.totalBets += 1
  user.totalVolume = user.totalVolume.plus(event.params.amount)
  
  // Create a new bet
  let betId = marketAddress.concat('-').concat(userId).concat('-').concat(event.params.option.toString())
  let bet = new Bet(betId)
  
  bet.market = marketAddress
  bet.user = userId
  bet.option = event.params.option.toI32()
  bet.amount = event.params.amount
  bet.timestamp = event.params.timestamp
  
  // Update market stats
  market.totalVolume = market.totalVolume.plus(event.params.amount)
  
  // Check if this is a new bettor
  let existingBets = Bet.load(marketAddress.concat('-').concat(userId).concat('-0'))
  if (existingBets == null) {
    market.totalBettors += 1
  }
  
  // Save entities
  bet.save()
  user.save()
  market.save()
}

export function handleMarketResolved(event: MarketResolved): void {
  // Load the market
  let marketAddress = event.address.toHexString()
  let market = Market.load(marketAddress)
  
  if (market == null) {
    return
  }
  
  // Update market status
  market.isActive = false
  market.isResolved = true
  market.winningOption = event.params.winningOption.toI32()
  market.resolvedAt = event.params.timestamp
  
  // Save the market
  market.save()
}

export function handleWithdrawal(event: Withdrawal): void {
  // This handler could track withdrawals if needed
  // For now, we'll just log the event
}
```

## 6. Gerar Código e Compilar

```bash
# Gerar código TypeScript a partir do schema
graph codegen

# Compilar o subgraph
graph build
```

## 7. Autenticar e Implantar

```bash
# Autenticar com o The Graph
graph auth d542229acdf6a2721eabd361a73250ac

# Implantar o subgraph
graph deploy voxpredict/markets
```

## 8. Uso do Subgraph

Após a implantação, você pode consultar o subgraph usando GraphQL. Exemplos de consultas:

### Obter Mercados Ativos

```graphql
{
  markets(where: { isActive: true }, orderBy: createdAt, orderDirection: desc) {
    id
    question
    description
    options
    endTime
    totalVolume
    totalBettors
    category
    tags
  }
}
```

### Obter Apostas de um Usuário

```graphql
{
  user(id: "0x...") {
    totalBets
    totalVolume
    winCount
    lossCount
    bets {
      market {
        question
      }
      option
      amount
      timestamp
    }
  }
}
```

## 9. Integração com o Frontend

No frontend, você pode usar Apollo Client para consultar o subgraph:

```javascript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/voxpredict/markets',
  cache: new InMemoryCache(),
});

// Exemplo de consulta
client.query({
  query: gql`
    {
      markets(first: 10, orderBy: createdAt, orderDirection: desc) {
        id
        question
        totalVolume
        totalBettors
        isActive
      }
    }
  `,
})
.then(result => console.log(result));
```

## 10. Manutenção

- Monitore o status de sincronização do subgraph
- Atualize o subgraph quando novos contratos forem implantados
- Otimize consultas para melhor desempenho

## Recursos Adicionais

- [Documentação do The Graph](https://thegraph.com/docs/en/)
- [Exemplos de Subgraphs](https://github.com/graphprotocol/example-subgraphs)
- [Ferramentas de Depuração](https://thegraph.com/docs/en/developer/debug/)