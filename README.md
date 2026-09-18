# Pin Puller — bulk Pinterest video downloader

Paste Pinterest pin, board, or profile links; it finds every video it can and zips them up.

## How it works

- **Pin links** (`/pin/<id>/`) are fetched directly and scanned for the embedded `.mp4` URL Pinterest
  ships in the page's own JSON data.
- **Board or profile links** are fetched once, and every pin referenced in that first page load is
  expanded into individual pin links (capped at 50 per board, 60 total per run). Pinterest lazy-loads
  more pins as you scroll, so very large boards will only be partially covered — rerun with a second
  batch if you need more.
- Selected videos are streamed into a single `.zip` server-side and sent back to your browser.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `npx vercel` from inside it to deploy without git).
2. Go to https://vercel.com/new, import the repo, and click **Deploy** — no environment variables
   or config needed, it's plain Next.js.
3. Once deployed, visit your `*.vercel.app` URL any time you want to pull videos.

### If you hit timeouts on large batches

Vercel's Hobby plan caps serverless function duration at 10 seconds by default (this project sets
`maxDuration = 60`, which requires a **Pro** plan to actually take effect). On Hobby, keep batches
small — a handful of pins per run works reliably. If you upgrade to Pro, the 60s ceiling in
`app/api/extract/route.js` and `app/api/zip/route.js` will apply automatically.

## Limits worth knowing

- Zips cap at 30 videos per download to stay within serverless memory limits.
- This only works on **public** pins/boards — nothing behind a login wall.
- Pinterest can change its page structure at any time, which may break extraction until the regex
  patterns in `lib/pinterest.js` are updated.
- **Use responsibly**: Pinterest's Terms of Service don't permit scraping, and the videos belong to
  their original creators. This tool is meant for saving your own content or things you have clear
  rights to — not for redistributing other people's work.
