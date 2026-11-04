#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js/npm is required. Install Node.js, then run this script again."
  exit 1
fi

if [ ! -f "wrangler.toml" ] || [ ! -f "worker/index.js" ]; then
  echo "Run this script from the VAMSH AI repository root."
  exit 1
fi

echo "VAMSH AI — Cloudflare Worker setup"
echo "1/3 Sign in to Cloudflare (a browser window may open)."
npx wrangler login

echo
echo "2/3 Add your Cutout.pro API key."
echo "Paste it only into the hidden Wrangler prompt. Do not share it in chat or GitHub."
npx wrangler secret put CUTOUT_API_KEY

echo
echo "3/3 Deploying the Worker..."
npx wrangler deploy

echo
echo "Worker deployment command finished."
echo "Copy the workers.dev URL printed above."
echo "Then set it as API_BASE in assets/app.js and commit that frontend change."
