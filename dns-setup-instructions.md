# Instruções para Configuração DNS na Hostinger

## Configuração para o Domínio Principal (voxpredict.com)

1. Faça login no painel da Hostinger
2. Vá para "Domínios" > "voxpredict.com" > "DNS / Nameservers"
3. Adicione os seguintes registros:

| Tipo  | Nome  | Conteúdo            | TTL    |
|-------|-------|---------------------|--------|
| A     | @     | 76.76.21.21         | 300    |
| CNAME | www   | voxpredict.vercel.app    | 300    |
| CNAME | api | voxpredict-api.vercel.app | 300    |

4. Salve as alterações

## Verificação

Após configurar, você pode verificar se os registros estão funcionando corretamente com:

```
dig voxpredict.com
dig www.voxpredict.com
dig api.voxpredict.com
```

Os registros devem propagar em até 48 horas, mas geralmente é muito mais rápido (minutos a algumas horas).

## Configuração no Vercel

1. Vá para o dashboard do Vercel
2. Selecione seu projeto
3. Vá para "Settings" > "Domains"
4. Adicione os domínios:
   - voxpredict.com
   - www.voxpredict.com

5. Para o projeto da API, adicione:
   - api.voxpredict.com

## Verificação de SSL

Após a propagação, verifique se o SSL está funcionando corretamente:

- https://voxpredict.com
- https://www.voxpredict.com
- https://api.voxpredict.com