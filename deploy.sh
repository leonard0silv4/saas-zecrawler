#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/var/www/saas-zecrawler"
LANDING_TARGET="/var/www/mlsmarthub-landing"

# Bash lê o script enquanto executa: após o pull, reexecuta a versão nova
# para que mudanças neste arquivo valham já neste deploy.
if [ -z "${DEPLOY_REEXEC:-}" ]; then
  echo "==> [1/5] git pull"
  cd "$REPO_DIR"
  git pull origin main || (git fetch origin && git reset --hard origin/main)
  DEPLOY_REEXEC=1 exec bash "$REPO_DIR/deploy.sh"
fi

echo "==> [2/5] backend deps"
cd "$REPO_DIR/backend"
npm install --omit=dev

echo "==> [3/5] frontend build"
cd "$REPO_DIR/frontend"
npm install
npm run build

echo "==> [4/5] landing page"
# index.html + assets/ (vídeo do hero, poster, logo, favicon)
mkdir -p "$LANDING_TARGET/assets"
cp "$REPO_DIR/landing/index.html" "$LANDING_TARGET/index.html"
cp -R "$REPO_DIR/landing/assets/." "$LANDING_TARGET/assets/"

echo "==> [5/5] pm2 restart"
pm2 restart 0 --update-env

echo "==> Deploy concluído"
