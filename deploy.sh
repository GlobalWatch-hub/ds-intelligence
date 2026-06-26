#!/usr/bin/env bash
# Git-based deploy for DS Intelligence — run ON THE SERVER:  ~/ds-engine/deploy.sh
#
# Pulls main, installs deps, rebuilds the Next.js frontend, restarts both
# systemd services. Secrets live in backend/.env (gitignored) and are never
# touched by git, so a deploy never disturbs them.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

echo "→ git pull --ff-only origin main"
git pull --ff-only origin main

echo "→ backend deps"
backend/venv/bin/pip install -q -r backend/requirements.txt

echo "→ frontend build"
( cd frontend && npm install --no-audit --no-fund && npm run build )

echo "→ restart services"
sudo systemctl restart ds-intelligence
sudo systemctl restart ds-intelligence-frontend

echo "✓ deployed: $(git log --oneline -1)"
