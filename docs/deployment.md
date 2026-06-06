# Deployment plan

## Static host first

The app is production-ready as a static Vite/React build. Deploy the static bundle before adding backend persistence or authentication:

1. Run `npm ci`.
2. Run `npm run qa:content` to validate term schema completeness and duplicate terms.
3. Run `npm test` and `npm run build`.
4. Publish `dist/` to a static host.

`netlify.toml` is included for a static host baseline. It builds with `npm run build`, publishes `dist/`, and rewrites all app routes to `index.html` so `/`, `/glossary`, `/study`, `/study/:mode`, `/terms/:termId`, and `/progress` work on refresh.

## Backend later

Backend deployment is intentionally deferred until persistence/auth are added. The current client already isolates future backend sync behind these endpoints:

- `GET /api/progress`
- `PATCH /api/progress/:termId`
- `POST /api/reviews`
- Optional `POST /api/pronunciation/score`

When auth is introduced, deploy the API separately, set the API origin/proxy in the static host, store only short-lived auth tokens client-side, and keep anonymous local progress import/export as the fallback path.
