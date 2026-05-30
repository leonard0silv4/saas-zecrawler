#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/var/www/saas-zecrawler"
LANDING_TARGET="/var/www/mlsmarthub-landing"

echo "==> [1/5] git pull"
cd "$REPO_DIR"
git pull origin main

echo "==> [2/5] backend deps"
cd "$REPO_DIR/backend"
npm install --omit=dev

echo "==> [3/5] frontend build"
cd "$REPO_DIR/frontend"
npm install
npm run build

echo "==> [4/5] landing page"
cp "$REPO_DIR/landing/index.html" "$LANDING_TARGET/index.html"

echo "==> [5/5] pm2 restart"
pm2 restart 0 --update-env

echo "==> Deploy concluído"
