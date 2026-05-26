Deployment notes — Vercel
=========================

Quick steps to deploy this Next.js app to Vercel:

- Push your branch to the git remote connected to Vercel (e.g., `origin/main`).
- Create a new Vercel project and point it to this repository.
- In the Vercel project settings, add the environment variables listed in `.env.example` (at minimum):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- Optional: any AI provider key you use (see your local `.env.local` if present). If you omit those keys the app will run in safe/demo mode (no DB).

Build settings recommended for Vercel:

- Framework Preset: `Next.js`
- Install Command: `npm ci` (or `npm install`)
- Build Command: `npm run build`
- Output Directory: (leave default for Next.js)

Notes and troubleshooting

- The app contains a safe/demo mode when Supabase env vars are missing — you can still preview UI without secrets.
- If Vercel shows a workspace root/turbopack warning, you can either:
  - Configure `turbopack.root` in `next.config.js` (advanced), or
  - Ensure the repository root only contains a single lockfile to avoid workspace inference warnings.

Files to check before deploy:

- `.env.example` — environment variable template
- `package.json` — build scripts

If you want, I can push a branch to your remote and trigger a Vercel preview deploy (you must have the repo linked to Vercel). Otherwise, deploy by pushing and configuring the env vars in the Vercel dashboard.
