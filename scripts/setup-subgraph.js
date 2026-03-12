const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuração
const GRAPH_AUTH_TOKEN = 'd542229acdf6a2721eabd361a73250ac';
const SUBGRAPH_NAME = 'voxpredict';

// Função para executar comandos
function runCommand(command) {
  console.log(`Executando: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Erro ao executar comando: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('Iniciando configuração do subgraph...');
  
  // Verificar se o graph-cli está instalado
  try {
    execSync('graph --version', { stdio: 'pipe' });
    console.log('graph-cli já está instalado');
  } catch (error) {
    console.log('Instalando graph-cli...');
    if (!runCommand('yarn global add @graphprotocol/graph-cli')) {
      console.error('Falha ao instalar graph-cli. Abortando.');
      process.exit(1);
    }
  }
  
  // Verificar se o diretório do subgraph já existe
  const subgraphDir = path.join(__dirname, '..', 'subgraph');
  if (!fs.existsSync(subgraphDir)) {
    console.log('Criando diretório do subgraph...');
    fs.mkdirSync(subgraphDir, { recursive: true });
  }
  
  // Autenticar com o The Graph
  console.log('Autenticando com o The Graph...');
  if (!runCommand(`graph auth --product hosted-service ${GRAPH_AUTH_TOKEN}`)) {
    console.error('Falha na autenticação com o The Graph. Abortando.');
    process.exit(1);
  }
  
  // Verificar se o subgraph já foi inicializado
  if (!fs.existsSync(path.join(subgraphDir, 'subgraph.yaml'))) {
    console.log('Inicializando subgraph...');
    process.chdir(subgraphDir);
    if (!runCommand(`graph init --product hosted-service --from-example ${SUBGRAPH_NAME}`)) {
      console.error('Falha ao inicializar subgraph. Abortando.');
      process.exit(1);
    }
  } else {
    console.log('Subgraph já inicializado');
  }
  
  // Gerar código do subgraph
  console.log('Gerando código do subgraph...');
  process.chdir(subgraphDir);
  if (!runCommand('graph codegen')) {
    console.error('Falha ao gerar código do subgraph. Abortando.');
    process.exit(1);
  }
  
  // Compilar subgraph
  console.log('Compilando subgraph...');
  if (!runCommand('graph build')) {
    console.error('Falha ao compilar subgraph. Abortando.');
    process.exit(1);
  }
  
  // Deploy do subgraph
  console.log('Realizando deploy do subgraph...');
  if (!runCommand(`graph deploy --product hosted-service ${SUBGRAPH_NAME}`)) {
    console.error('Falha ao fazer deploy do subgraph. Abortando.');
    process.exit(1);
  }
  
  console.log('Configuração do subgraph concluída com sucesso!');
  console.log(`Acesse seu subgraph em: https://thegraph.com/hosted-service/subgraph/${SUBGRAPH_NAME}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });