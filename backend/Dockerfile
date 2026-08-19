# Casa com a versão do Python usada no dev local (backend/venv) — trava
# explicitamente pra CI/prod nunca derivar silenciosamente pra um interpretador
# diferente do que já foi testado localmente.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# ffmpeg: necessário pro yt-dlp mesclar streams de vídeo+áudio separados ao baixar
# do YouTube. util-linux fornece o `setpriv`, usado pelo docker-entrypoint.sh pra
# soltar de root pra appuser depois de ajustar o dono dos volumes montados.
# ca-certificates: sem ela, chamadas HTTPS de saída (download de thumbnail do
# YouTube em media_storage.py, SDK do Mercado Pago, yt-dlp, SMTP com TLS) podem
# falhar na verificação do certificado — a imagem -slim não garante ter isso.
# Sem compilador instalado — todas as dependências do lock têm wheel pronta.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg util-linux ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instala das versões EXATAS travadas em requirements.lock.txt (gerado via
# `pip freeze`), não das faixas soltas em requirements.txt — build reproduzível,
# sem puxar uma versão nova de dependência sem ninguém notar.
COPY requirements.txt requirements.lock.txt ./
RUN pip install --no-cache-dir -r requirements.lock.txt

COPY . .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# data/ e media/ são montados como volumes nomeados em docker-compose.yml pra
# sobreviver a upgrades/redeploys da imagem. Criados e com dono certo aqui pra
# que um volume novo (o Docker semeia a partir da imagem no primeiro mount) já
# nasça com a estrutura e a permissão corretas; docker-entrypoint.sh reforça o
# chown a cada start, já que um volume *existente* de uma imagem antiga não
# ganha isso automaticamente.
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup --no-create-home appuser \
    && mkdir -p /app/data /app/media/covers /app/media/banners /app/media/thumbnails /app/media/videos \
    && chown -R appuser:appgroup /app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)" || exit 1

# Sobe como root de propósito: o entrypoint precisa de root pra dar chown nos
# volumes montados antes de soltar privilégio — o processo da app em si nunca
# roda como root. Ver docker-entrypoint.sh.
ENTRYPOINT ["docker-entrypoint.sh"]
# --proxy-headers + --forwarded-allow-ips=*: atrás do Nginx do frontend (mesma
# stack), request.client.host sem isso é sempre o IP interno do container nginx,
# não o do visitante — quebra o rate limit de login em rate_limit.py (todo mundo
# cairia no mesmo "balde" de IP+e-mail). "*" confia no X-Forwarded-For de
# QUALQUER peer direto — seguro aqui porque o único peer direto do backend é o
# container frontend (rede interna do compose; o backend só usa "expose", nunca
# publica a porta pro host).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=*"]
