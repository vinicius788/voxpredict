# VoxPredict - Mercados Preditivos Descentralizados

Plataforma de mercados preditivos focada na América Latina, com autenticação via Clerk.dev e conexão de carteiras Web3.


### 2. Configurar provedores de autenticação
No dashboard do Clerk:
1. Vá para **User & Authentication** → **Social Connections**
2. Ative os provedores:
   - ✅ Google
   - ✅ Apple
   - ✅ Email/Password

### 3. Obter as credenciais
1. Vá para **Developers** → **API Keys**
2. Copie as chaves:
   - `Publishable Key` (começa com `pk_test_` ou `pk_live_`)
   - `Secret Key` (começa com `sk_test_` ou `sk_live_`)

3. Vá para **Settings** → **Wallets**
4. Configure:
   - ✅ **Embedded Wallets**: Ativado
   - ✅ **External Wallets**: MetaMask, WalletConnect, Coinbase Wallet



### 4. Configurar WalletConnect (Opcional)
1. Acesse [https://cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Crie um projeto gratuito
3. Copie o `Project ID`

## ⚙️ Configurar variáveis de ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_sua_chave_publica_aqui
CLERK_SECRET_KEY=sk_test_sua_chave_secreta_aqui


# WalletConnect (Opcional)
VITE_WALLETCONNECT_PROJECT_ID=seu_project_id_walletconnect_aqui
```

## 🔧 Instalação e Execução

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📱 Funcionalidades de Autenticação



## 🎯 Fluxo de Autenticação Completo

1. **Landing Page**: Usuário vê mercados públicos
2. **Login via Clerk**: Email/senha ou social login
3. **Dashboard**: Área protegida com mercados
4. **Conectar Carteira**: Via WalletConnect
   - **Opção 1**: Carteira instantânea (criada automaticamente)
   - **Opção 2**: Carteira externa (MetaMask, Trust Wallet, etc.)
5. **Fazer Previsões**: Apenas com carteira conectada

## 🔐 Tipos de Carteiras Suportadas

### Carteiras Instantâneas (Embedded)
- ✅ Criadas automaticamente com email do usuário
- ✅ Sem necessidade de extensão ou app
- ✅ Chaves privadas gerenciadas pelo WalletConnect 
- ✅ Ideal para usuários iniciantes

### Carteiras Externas
- ✅ **MetaMask**: Extensão do navegador
- ✅ **Trust Wallet**: App mobile
- ✅ **Coinbase Wallet**: App mobile
- ✅ **WalletConnect**: 300+ carteiras suportadas
- ✅ **Binance Wallet**: App mobile

## 🌐 Redes Blockchain Suportadas

- ✅ **Ethereum Mainnet**: Rede principal
- ✅ **Polygon**: Layer 2 com taxas baixas
- ✅ **Sepolia**: Testnet Ethereum
- ✅ **Mumbai**: Testnet Polygon

## 📚 Links Úteis

### WalletConnect
- [Cloud WalletConnect](https://cloud.walletconnect.com)
- [Documentação](https://docs.walletconnect.com)

## 🔒 Segurança

- ✅ Autenticação JWT via Clerk
- ✅ Chaves privadas nunca expostas
- ✅ Carteiras instantâneas criptografadas
- ✅ Suporte a MFA (Multi-Factor Authentication)
- ✅ Sessões seguras e criptografadas