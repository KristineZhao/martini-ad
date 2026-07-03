# Form 1-AD — Production Timekeeper

A 1st AD on-set timekeeping tool: work-hour and overtime math, union rule presets
(SAG-AFTRA / IATSE / non-union), meal-penalty tracking, minor work limits, a daily
cost ledger, and a wrap-report generator. Built with Vite + React + TypeScript.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New… → Project → Import** the repo.
3. Framework preset auto-detects as **Vite**. Leave everything default and click **Deploy**.

Build command: `vite build` · Output directory: `dist`

All data lives only in the browser session — nothing is stored or sent anywhere.
