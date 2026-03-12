const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuração
const DOMAIN = 'voxpredict.com';
const API_SUBDOMAIN = 'api';
const VERCEL_DOMAIN = 'voxpredict.vercel.app'; // Substitua pelo seu domínio Vercel
const API_VERCEL_DOMAIN = 'voxpredict-api.vercel.app'; // Substitua pelo domínio da API

// Função para executar comandos
function runCommand(command) {
  console.log(`Executando: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return { success: true, output };
  } catch (error) {
    console.error(`Erro ao executar comando: ${command}`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

// Gerar instruções para configuração DNS na Hostinger
function generateDnsInstructions() {
  const instructions = `
# Instruções para Configuração DNS na Hostinger

## Configuração para o Domínio Principal (voxpredict.com)

1. Faça login no painel da Hostinger
2. Vá para "Domínios" > "${DOMAIN}" > "DNS / Nameservers"
3. Adicione os seguintes registros:

| Tipo  | Nome  | Conteúdo            | TTL    |
|-------|-------|---------------------|--------|
| A     | @     | 76.76.21.21         | 300    |
| CNAME | www   | ${VERCEL_DOMAIN}    | 300    |
| CNAME | ${API_SUBDOMAIN} | ${API_VERCEL_DOMAIN} | 300    |

4. Salve as alterações

## Verificação

Após configurar, você pode verificar se os registros estão funcionando corretamente com:

\`\`\`
dig ${DOMAIN}
dig www.${DOMAIN}
dig ${API_SUBDOMAIN}.${DOMAIN}
\`\`\`

Os registros devem propagar em até 48 horas, mas geralmente é muito mais rápido (minutos a algumas horas).

## Configuração no Vercel

1. Vá para o dashboard do Vercel
2. Selecione seu projeto
3. Vá para "Settings" > "Domains"
4. Adicione os domínios:
   - ${DOMAIN}
   - www.${DOMAIN}

5. Para o projeto da API, adicione:
   - ${API_SUBDOMAIN}.${DOMAIN}

## Verificação de SSL

Após a propagação, verifique se o SSL está funcionando corretamente:

- https://${DOMAIN}
- https://www.${DOMAIN}
- https://${API_SUBDOMAIN}.${DOMAIN}
`;

  // Salvar instruções em um arquivo
  const filePath = path.join(__dirname, '..', 'dns-setup-instructions.md');
  fs.writeFileSync(filePath, instructions);
  console.log(`Instruções de configuração DNS salvas em: ${filePath}`);
}

// Função principal
async function main() {
  console.log('Gerando instruções para configuração DNS...');
  generateDnsInstructions();
  
  console.log('Verificando domínios...');
  runCommand(`ping -c 1 ${DOMAIN}`);
  runCommand(`ping -c 1 www.${DOMAIN}`);
  runCommand(`ping -c 1 ${API_SUBDOMAIN}.${DOMAIN}`);
  
  console.log('Configuração DNS concluída!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });