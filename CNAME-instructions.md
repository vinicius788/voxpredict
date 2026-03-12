# Configuração do Subdomínio api.voxpredict.com

Para configurar o subdomínio `api.voxpredict.com` apontando para o backend da API, siga estas instruções:

## 1. Acesse o painel de DNS da Hostinger

1. Faça login no painel da Hostinger
2. Navegue até "Domínios" > "voxpredict.com" > "Zona DNS"

## 2. Adicione um registro CNAME

Adicione um novo registro CNAME com as seguintes configurações:

- **Nome/Host**: `api`
- **Aponta para**: `voxpredict-api.vercel.app` (substitua pelo URL real do seu backend na Vercel)
- **TTL**: 3600 (ou o valor recomendado pela Hostinger)

## 3. Verifique a propagação do DNS

A propagação do DNS pode levar até 48 horas, mas geralmente é muito mais rápida.
Você pode verificar a propagação usando ferramentas como:

- [DNSChecker](https://dnschecker.org/)
- [WhatsMyDNS](https://www.whatsmydns.net/)

## 4. Configure o domínio personalizado na Vercel

1. Acesse o dashboard da Vercel
2. Selecione o projeto do backend da API
3. Vá para "Settings" > "Domains"
4. Adicione `api.voxpredict.com` como domínio personalizado
5. Siga as instruções da Vercel para verificar o domínio

## 5. Teste o subdomínio

Após a propagação do DNS, teste o subdomínio acessando:
```
https://api.voxpredict.com/health
```

Você deve receber uma resposta JSON com status "ok" e um timestamp.

## Solução de problemas

Se o subdomínio não estiver funcionando corretamente:

1. Verifique se o registro CNAME foi configurado corretamente
2. Confirme se o domínio foi adicionado e verificado na Vercel
3. Verifique se o backend está funcionando acessando diretamente o URL da Vercel
4. Consulte os logs de erro na Vercel para identificar possíveis problemas