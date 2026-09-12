# Cloudflare backend foundation

The Worker entry point is `server/src/index.ts`. It currently exposes only
`GET /api/health`; registration, sessions, profile management, trial state,
assessment ownership/history, and public profiles now share the same API
boundary. Billing and external OAuth remain provider adapters.

Current account endpoints include profile update/deletion, one-time recovery
code issuance/consumption, membership status/trial/cancel, assessment history,
and admin question CRUD. Cookie-authenticated mutations require the
`x-csrf-token` header matching the non-HttpOnly CSRF cookie.

OAuth endpoints are prepared for Google and LINE using state plus PKCE. They
return `oauth_provider_unconfigured` until client credentials are supplied.
Square checkout and webhook endpoints are also present, but remain disabled
until Square application credentials and webhook verification are configured.

The D1 migration is intentionally checked in before a Cloudflare account or
database exists. Once a D1 database is created, add its binding to
`wrangler.jsonc` and apply the migration locally with Wrangler. No deployment
or external credential is required for this scaffold.

Password hashing currently uses Web Crypto PBKDF2-SHA-256 for the local Worker
scaffold. Before production, replace this with the approved Argon2id runtime
and add the project's rate limiting, CSRF, OAuth, and recovery-code flows.
