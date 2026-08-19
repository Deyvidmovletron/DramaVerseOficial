#!/bin/sh
set -e

# Os volumes nomeados (/app/data, /app/media) ficam donos de root quando não são
# um volume novo semeado a partir da imagem (uma imagem antiga, um bind mount do
# host, etc.) — corrige isso antes de soltar privilégio, senão o appuser não
# consegue escrever no sqlite nem salvar mídia.
chown -R appuser:appgroup /app/data /app/media

exec setpriv --reuid=appuser --regid=appgroup --init-groups "$@"
