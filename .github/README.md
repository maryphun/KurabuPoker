# Deployment setup

The `deploy-cloudflare.yml` workflow deploys the Worker whenever `master`
changes. Add these repository secrets in GitHub before enabling it:

- `CLOUDFLARE_API_TOKEN`: a scoped token with Workers Scripts and D1 access
- `CLOUDFLARE_ACCOUNT_ID`: `a64d74d9de90971c680763dd86448f20`

The existing Cloudflare deployment remains active while the workflow is being
configured.
