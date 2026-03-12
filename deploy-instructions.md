# Instruções de Deploy para VoxPredict

Este documento contém instruções detalhadas para o deploy completo da plataforma VoxPredict, incluindo frontend, backend, smart contracts e configuração de subdomínio.

## 1. Deploy dos Smart Contracts

### Pré-requisitos
- Carteira com ETH/MATIC/BASE para pagar taxas de gas
- Chave privada da carteira (para o arquivo .env)
- API keys para Etherscan/Polygonscan/Basescan (para verificação)

### Passos para Deploy

1. **Configurar variáveis de ambiente**
   - Copie o arquivo `.env.example` para `.env`
   - Preencha a chave privada e as API keys

2. **Escolher rede para deploy**
   - Polygon Mainnet (recomendado para taxas mais baixas)
   - Base (alternativa com taxas baixas)
   - Ethereum Mainnet (maior segurança, taxas mais altas)

3. **Executar o script de deploy**
   ```bash
   # Para Polygon Mainnet
   npm run deploy:polygon
   
   # Para Base
   npm run deploy:base
   
   # Para Ethereum Mainnet
   npm run deploy:mainnet
   ```

4. **Verificar os contratos**
   ```bash
   # Para Polygon
   npm run verify:polygon <ENDEREÇO_DO_CONTRATO> <ARGUMENTOS_DO_CONSTRUTOR>
   
   # Para Base
   npm run verify:base <ENDEREÇO_DO_CONTRATO> <ARGUMENTOS_DO_CONSTRUTOR>
   ```

5. **Atualizar endereços no frontend**
   - Os endereços serão salvos automaticamente em `src/contracts/addresses.json`
   - Verifique se os endereços foram atualizados corretamente

## 2. Configuração do Subdomínio API

### No painel da Hostinger

1. Acesse o painel de controle da Hostinger
2. Navegue até "Domínios" > "voxpredict.com" > "Zona DNS"
3. Adicione um novo registro CNAME:
   - **Nome/Host**: `api`
   - **Aponta para**: `voxpredict-api.vercel.app` (ou o URL real do seu backend)
   - **TTL**: 3600

### Na Vercel

1. Acesse o dashboard da Vercel
2. Selecione o projeto do backend
3. Vá para "Settings" > "Domains"
4. Adicione `api.voxpredict.com` como domínio personalizado
5. Siga as instruções para verificar o domínio

## 3. Deploy do Backend (API)

### Pré-requisitos
- Conta na Vercel
- Repositório com o código do backend

### Passos para Deploy

1. **Configurar variáveis de ambiente na Vercel**
   - ALCHEMY_API_URL
   - RESEND_API_KEY
   - OPENAI_API_KEY
   - Outras variáveis necessárias

2. **Fazer deploy na Vercel**
   ```bash
   vercel --prod
   ```

3. **Verificar o deploy**
   - Acesse `https://api.voxpredict.com/health`
   - Deve retornar `{"status":"ok","timestamp":"..."}`

## 4. Deploy do Frontend

### Pré-requisitos
- Conta na Vercel ou Netlify
- Repositório com o código do frontend

### Passos para Deploy

1. **Configurar variáveis de ambiente**
   - VITE_CLERK_PUBLISHABLE_KEY
   - VITE_WALLETCONNECT_PROJECT_ID
   - Outras variáveis necessárias

2. **Fazer build do projeto**
   ```bash
   npm run build
   ```

3. **Fazer deploy na Vercel ou Netlify**
   ```bash
   vercel --prod
   # ou
   netlify deploy --prod
   ```

4. **Configurar domínio personalizado**
   - Adicione `voxpredict.com` como domínio principal
   - Configure o DNS conforme instruções da plataforma

## 5. Configuração do The Graph (Opcional)

Se você decidir usar o The Graph para indexar eventos dos contratos:

1. **Inicializar o subgraph**
   ```bash
   yarn global add @graphprotocol/graph-cli
   graph init voxpredict
   ```

2. **Autenticar e fazer deploy**
   ```bash
   graph auth d542229acdf6a2721eabd361a73250ac
   cd voxpredict
   graph codegen && graph build
   graph deploy voxpredict
   ```

## 6. Verificação Final

Após o deploy, verifique:

1. **Frontend**: Acesse `https://voxpredict.com`
2. **API**: Teste `https://api.voxpredict.com/health`
3. **Contratos**: Verifique se estão funcionando corretamente
4. **Integração**: Teste a criação de mercados e apostas

## Solução de Problemas

### Problemas com Smart Contracts
- Verifique o saldo de gas na carteira
- Confirme que os endereços estão corretos em `addresses.json`
- Verifique os logs de transação no explorer

### Problemas com API
- Verifique os logs na Vercel
- Confirme que as variáveis de ambiente estão configuradas
- Teste endpoints localmente antes do deploy

### Problemas com Frontend
- Verifique se as variáveis de ambiente estão configuradas
- Confirme que os endereços dos contratos estão corretos
- Teste a conexão com a API e os contratos

## Contatos para Suporte

- **Problemas Técnicos**: suporte@voxpredict.com
- **Emergências**: (11) 99999-9999