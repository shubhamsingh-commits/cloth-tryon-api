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

Returns `{ "task_id": "..." }`. Both images can use public HTTPS URLs, or use src_file_id and ref_file_id after direct uploads.

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

For the storefront, replace `sections/cloth-try-on.liquid` in your Shopify theme with `shopify/sections/cloth-try-on.liquid` from this repository. This section uses the new `/api/upload` flow and the correct deployed domain. Changing only the old upload setting is insufficient because its old multipart request format has changed.

Set `ALLOWED_ORIGINS` to the exact storefront origin: `https://perfectcorp-cm3c2dvl.myshopify.com` (the last character before `.myshopify.com` is the letter `l`). Redeploy after changing environment variables or pushing these API changes.

`POST /api/upload` accepts JSON metadata for two files, person first and apparel second:

```json
{"files":[{"content_type":"image/jpeg","file_size":12345},{"content_type":"image/png","file_size":23456}]}
```

It returns `uploads`, each containing `file_id`, `url`, `method`, and `headers`. Upload each image directly to the returned signed URL with its method and headers, then POST `src_file_id` and `ref_file_id` to `/api/cloth-try-on`. Do not send a task until both uploads succeed. JPEG and PNG files smaller than 10 MB are supported. The API still accepts public image URLs for existing Postman clients. No extra storage credentials are needed. Real browser testing is required to verify provider storage CORS and account permissions.
`ALLOWED_ORIGINS` controls browser CORS access, not authentication. Configure access protection/rate limits for a public deployment according to your storefront's needs.

## Verification

Run `npm test`. Tests mock Perfect Corp; an API key and available provider credits are needed for an actual image-generation test.
