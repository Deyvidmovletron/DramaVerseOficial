# Casa com a versão do Node usada no dev local — mantém em sincronia pra um
# build nunca passar aqui e falhar (ou se comportar diferente) na máquina de
# quem está desenvolvendo. Debian (glibc), não `node:24-alpine`: evita
# surpresas de binding nativo (musl x glibc) do motor do Tailwind v4
# (@tailwindcss/oxide, em Rust, com binário pré-compilado por plataforma).
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Camada separada pras deps: só reexecuta quando o lockfile muda de verdade,
# não a cada edição de código.
#
# `npm install`, não `npm ci`: o lockfile foi gerado no Windows, onde o npm
# nunca resolve a variante wasm32-wasi de fallback do motor nativo do
# Tailwind v4 (@tailwindcss/oxide) — ela só entraria no lockfile numa
# instalação feita de fato em uma plataforma sem binário pré-compilado.
# `npm ci` falha batendo de frente com esse buraco ("Missing: @emnapi/runtime
# ... from lock file"), mesmo essa variante nunca sendo usada de verdade aqui
# (Linux x64 tem o binário nativo @tailwindcss/oxide-linux-x64-gnu). `npm
# install` resolve certo pra plataforma atual em vez de exigir que o lockfile
# já tenha cada combinação possível.
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Chave pública do Mercado Pago (não é secreta) — o Vite embute variáveis VITE_* no
# bundle estático em tempo de BUILD, então precisa chegar como build-arg, não como
# env de container (o nginx que serve o resultado não roda Node, não leria isso em
# runtime). Declarado só agora (depois do npm install) pra não invalidar a camada
# de deps toda vez que essa chave mudar. O access token privado do Mercado Pago
# nunca passa perto do frontend — só existe no backend.
ARG VITE_MERCADOPAGO_PUBLIC_KEY
ENV VITE_MERCADOPAGO_PUBLIC_KEY=$VITE_MERCADOPAGO_PUBLIC_KEY

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 127.0.0.1, não "localhost": nginx.conf é customizado (não o template padrão
# da imagem), então o script 10-listen-on-ipv6-by-default.sh do entrypoint
# pula o patch que adicionaria `listen [::]:80` — o nginx só escuta em IPv4.
# Em Alpine/musl, "localhost" costuma resolver pra ::1 primeiro; o wget do
# BusyBox tenta esse endereço, leva connection refused (nada escutando em
# IPv6) e a checagem falha — 3 falhas seguidas e o Swarm mata a task
# (SIGQUIT) achando o serviço unhealthy, mesmo o nginx estando perfeitamente
# de pé em IPv4.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
