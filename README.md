# VAMSH AI

A responsive AI image studio with a premium Cutout.pro-inspired workflow and VAMSH branding.

## Architecture
- **Frontend:** static HTML/CSS/JavaScript hosted on GitHub Pages.
- **Backend:** Cloudflare Worker (free-tier compatible) proxies Cutout.pro requests. The API key stays in Worker secrets and is never sent to the browser.
- **Current live integration:** Background Remover using Cutout.pro's binary image API.

## Deploy

### 1. GitHub Pages
In repository Settings → Pages, choose **Deploy from a branch**, branch `main`, folder `/ (root)`. Or enable Actions and use the included workflow.

### 2. Cloudflare Worker
1. Create a Cloudflare account and install Wrangler locally: `npm install -g wrangler`.
2. From the repository root run `wrangler login`.
3. Set the secret: `wrangler secret put CUTOUT_API_KEY` and paste your Cutout.pro key into the hidden prompt.
4. Deploy: `wrangler deploy`.
5. Copy the Worker URL (for example `https://vamsh-ai-api.<your-subdomain>.workers.dev`).

### 3. Connect frontend to Worker
Open `assets/app.js` and replace `YOUR_CLOUDFLARE_WORKER_URL` with your deployed Worker URL. Commit the change. GitHub Pages will publish automatically.

## Local preview
Run `python -m http.server 8000` from the repository root and open http://localhost:8000.

## Security
- Never put `CUTOUT_API_KEY` in frontend files, GitHub commits, or GitHub Pages settings.
- Store it only as a Cloudflare Worker secret.
- The Worker validates file type and size, applies basic origin checks, and returns the processed image.
- Cutout.pro usage consumes credits. Check your account balance and pricing before processing production images.

## API
The Worker accepts `POST /api/remove-background` with multipart form field `file` and optional `preview=true`. It forwards the file to Cutout.pro's `/api/v1/matting?mattingType=6` endpoint.
