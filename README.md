# Drama Verse Oficial

Plataforma de streaming de séries por assinatura (estilo Netflix), com painel do
cliente e painel administrativo. Backend em FastAPI, frontend em React (Vite),
servido via Nginx. Assinaturas via Mercado Pago e importação de playlists do YouTube.

## Uso local

```
docker compose up -d --build
```

Antes de subir em produção, edite `backend/.env` (troque `SECRET_KEY` e
`FIRST_ADMIN_PASSWORD`) e preencha `MERCADOPAGO_ACCESS_TOKEN` e
`MERCADOPAGO_PUBLIC_KEY` — as duas ficam só no backend (o frontend busca a chave
pública em runtime via `GET /api/v1/config`). Para o deploy em Swarm, veja
`DEPLOY/backend-stack.yml`.
