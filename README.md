# coach-mascota

Bio-Avatar is a Next.js dashboard for tracking daily habits, nutrition notes, mood and basic wellness routines.

The app combines a guided interface with lightweight coaching flows. Some routes depend on Supabase and AI-related environment variables, so local setup requires configuration before all features can be exercised.

## Screenshot

![Bio-Avatar dashboard](public/screenshots/home.png)

## Social preview

GitHub social preview asset: `public/og-image.png`

## Local development

```bash
npm install
npm run dev
npm run build
```

## Checks

- prebuild validation
- TypeScript
- production build
- Playwright E2E tests

## Architecture

The Next.js application organizes dashboard screens and reusable components under `src`, with route handlers reserved for server-side operations. Supabase clients provide authentication and persistence, while AI routes are optional and only initialize when their environment variables are available.

User actions move from a dashboard form to validated server or Supabase calls and back into the same screen state. This boundary keeps credentials out of browser code and makes optional integrations explicit in deployment configuration.

## Links

- DeepWiki: https://deepwiki.com/eneekoruiz/coach
