# Landmark — deploy this for free

This is a Vite + React + Tailwind project. No local terminal is required to
get it live — GitHub and Vercel do the building for you in the cloud.

## Option A: No terminal at all (recommended)

### 1. Put this folder on GitHub
1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click **New repository** → name it `landmark` → **Create repository**.
3. On the new repo's page, click **uploading an existing file**.
4. Drag this entire folder's contents in (all files and the `src` folder) and commit.

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account (free).
2. Click **Add New... → Project**.
3. Select the `landmark` repo you just created.
4. Vercel auto-detects Vite — leave the defaults and click **Deploy**.
5. In a minute or two you'll get a free live URL like `landmark.vercel.app`.

That's it — every time you push a change to GitHub, Vercel rebuilds automatically.

(Netlify works the same way, if you'd rather use that: [netlify.com](https://netlify.com) →
**Add new site → Import an existing project** → pick the same GitHub repo.)

## Option B: Local terminal (if you want to preview before deploying)

```bash
npm install
npm run dev       # preview at http://localhost:5173
npm run build      # outputs a production build to /dist
```

## What to know before/after deploying

- **Data storage**: shipments and stage settings are currently saved to the
  browser's `localStorage`. That means they persist across visits *on the same
  device*, but two different people (or you on your phone vs. laptop) won't
  see the same data. For a real shared database, look at
  [Supabase](https://supabase.com) (free tier) — swap the `localStorage`
  calls in `src/App.jsx` (search for `localStorage`) for Supabase's client
  calls once you're ready; ask your AI assistant to help wire that in.
- **AI chat widget**: currently answers from a small built-in FAQ matcher —
  no API key, no cost, works anywhere. If you want it to be genuinely
  AI-powered later, you'll need your own Anthropic API key and a small
  serverless function (e.g. a Vercel Function) to call it securely — never
  put an API key directly in this front-end code, it would be publicly
  visible to anyone who views the page's source.
- **Admin login**: username `admin`, password `9972`, checked entirely in
  the browser. Fine for a demo; not real security. Anyone who can view the
  page's JavaScript can find the password. Don't use this for anything with
  real customer or payment data without adding real server-side auth.
- **Custom domain**: both Vercel and Netlify let you add your own domain
  (e.g. `landmark.com`) for free — you just need to already own the
  domain (domain registration itself typically costs money, usually $10–15/yr).
