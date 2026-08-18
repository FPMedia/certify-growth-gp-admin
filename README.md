# certify-growth-gp-admin

**Separate Next.js admin console** for platform administrators. It is a **frontend-only** split from web `/admin`: same Firebase project, same identity roles, and the **existing** gateway (`GATEWAY_URL`). Do **not** create new catalog, identity, or gateway services for this app.

| Repo | Railway service | Port (local) |
|------|-----------------|--------------|
| `certify-growth-gp-admin` | `admin` — https://admin-production-82c8.up.railway.app | 3001 |

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Admin dashboard (catalog + system tabs) |
| `/login` | Firebase sign-in for admin roles |
| `/api/*` | Runtime proxy to the **existing** gateway (`GATEWAY_URL`) |

## How this used to work in production

Catalog/system admin previously lived **on the web app** at `/admin` (same gateway APIs). That UI was extracted here. Production web still has **no** `/admin` route: https://web-production-aae47.up.railway.app/admin returns **404**. The APIs (`/api/admin/*` → catalog, identity users/companies) are unchanged and live. Production admin UI is https://admin-production-82c8.up.railway.app.

## Local development

```bash
cp .env.example .env
# Copy Firebase vars from certify-growth-gp-web/.env
npm install
npm run dev
```

With `NEXT_PUBLIC_DEV_AUTH=true`, the app uses `Bearer dev-token` and expects the gateway with `SKIP_AUTH=true`. `./run dev-up` from the collection root starts this app on port 3001.

## Railway deployment (frontend only)

Reuse **existing** services. Mirror the **web** service env (not new backends):

1. Git repo is initialized (`main`). GitHub `FPMedia/certify-growth-gp-admin` still needs `gh repo create` (private) + Railway GitHub-link for auto-deploy; current production deploy used `railway up`.
2. Railway service `admin` exists in project `cc207980-c992-4062-8956-d1e8889bc220` (Dockerfile / `railway.toml`, same pattern as web). Public origin: https://admin-production-82c8.up.railway.app.
3. Set:

| Variable | Value |
|----------|--------|
| `GATEWAY_URL` | `http://gateway.railway.internal:8080` (existing gateway) |
| `NEXT_PUBLIC_API_URL` | `/api` |
| `WEB_URL` | `https://web-production-aae47.up.railway.app` (runtime; "Main app" link) |
| `NEXT_PUBLIC_FIREBASE_*` | **Same values as the web service** |
| `NEXT_PUBLIC_DEV_AUTH` | unset / `false` |

4. On the **web** service, runtime **`ADMIN_URL`** is https://admin-production-82c8.up.railway.app (no trailing slash). Missing `ADMIN_URL` hides the Admin nav item.

`WEB_URL` is read at runtime. Do not add it as a Docker `NEXT_PUBLIC_*` build ARG.

Keep `@types/react-dom@^18` in `devDependencies` so `npm ci` does not pull React 19 types via `@tiptap/react`'s peer and fail with `ERESOLVE`.

## Catalog copy

Long-form catalog fields (questionnaire intro, element paragraphs, question labels/concepts) use a TipTap WYSIWYG editor. HTML is stored in the catalog service; short fields (names, scores, feedback phrases, weights) stay plain inputs.

## Access control

- **App boundary**: non-admin roles see an access-denied screen after sign-in.
- **Tab gating**: `SUPER_ADMIN` sees system + catalog tabs; `CONTENT_MANAGER` sees catalog only.
- **Backend**: admin API routes remain protected by the existing gateway/identity services (unchanged).
