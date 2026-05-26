# coach-mascota

Proyecto de ejemplo.

## Development

Start the dev server locally:

```
npm run dev
```

## CI

This repo includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs Prettier checks and the project's `clean-code-audit` script on pushes and pull requests.

## Deploy

Deploy to Vercel by connecting this repository in the Vercel dashboard. A `vercel.json` is included with a basic Next.js build configuration.

Provide production environment variables in the Vercel dashboard (Supabase keys, AI keys, etc.). See `.env.example` for required names.
