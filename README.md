# Cloth Try-On API

Standalone Perfect Corp backend. All project files live directly in this folder.
Uses the [Perfect Corp Clothes V4 API](https://docs.perfectcorp.com/reference/ai_clothes/section/overview).
No npm dependencies are required. Node.js 22+ is required.

## Run locally

Copy `.env.example` to `.env`, set `PERFECT_CORP_API_KEY` and your storefront's exact origin in `ALLOWED_ORIGINS`, then run:

```sh
npm run dev
```

Health check: `http://localhost:3000/api/health`.

## Endpoints

`POST /api/cloth-try-on` with `Content-Type: application/json`:

```json
{
  "src_file_url": "https://example.com/person.jpg",
  "ref_file_url": "https://example.com/garment.jpg",
  "garment_category": "auto"
}
```

Returns `{ "task_id": "..." }`. Both images must already have publicly accessible HTTPS URLs.

`GET /api/cloth-try-on-status?task_id=...` returns:

```json
{
  "task_id": "...",
  "status": "success",
  "output_url": "https://example.com/result.jpg",
  "error": null
}
```

Poll every 3 seconds until `success` or `error`/`failed`, with a finite timeout.
The API key stays on the server. Provider requests time out after 25 seconds.

## Vercel

Import this repository, choose Other as the framework and keep Root Directory as `.`.
There is no build step. Add `PERFECT_CORP_API_KEY` and `ALLOWED_ORIGINS` as environment variables, then deploy.

In your existing storefront, update the try-on and status URLs to your deployed domain:

- `https://YOUR-PROJECT.vercel.app/api/cloth-try-on`
- `https://YOUR-PROJECT.vercel.app/api/cloth-try-on-status`

The existing storefront's separate image-upload endpoint is still required; this backend accepts image URLs and does not host uploads.
`ALLOWED_ORIGINS` controls browser CORS access, not authentication. Configure access protection/rate limits for a public deployment according to your storefront's needs.

## Verification

Run `npm test`. Tests mock Perfect Corp; an API key and available provider credits are needed for an actual image-generation test.
