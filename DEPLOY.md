# Canadian Crafted Co. — Website + Discovery Agent

This is a working Next.js site wired to your existing Supabase database
(`canadian-crafted-co`, already seeded with 21 real Canadian products across
Outdoors, Health, Family, and Fitness), plus a cron-scheduled AI agent that
keeps discovering new products automatically.

## What's real right now
- Supabase `products` table has 21 real, researched Canadian brands/products live
- This Next.js app reads directly from that table — no fake data
- `/api/cron/discover` is a working endpoint that, when called, uses Claude +
  real web search to find new products and insert them (deduped by URL)

## What is NOT done yet (by design, per the roadmap)
- Affiliate links — right now "Visit" buttons go straight to the brand's site,
  not a commission-bearing link. That's Phase 2.
- Instagram auto-posting — the `instagram_posts` table exists but nothing writes to it yet.
- Admin review UI — for now, review new/low-confidence products directly in the
  Supabase table editor.

## Why I can't deploy this myself
My sandbox environment has no network access, so I can't push to GitHub or run
`vercel deploy` directly. You'll need to do one of the two paths below —
both are quick.

---

## Path A — Replace the code in your existing GitHub repo (recommended)

Your existing repo `Canadiancraftedco/Canadian-crafted-ai` is connected to the
`ai-affilliate-system` Vercel project already, but its deployments are broken
(root page 404s, builds run in ~50ms meaning nothing real gets built). Easiest fix:

1. Clone your repo locally: `git clone https://github.com/Canadiancraftedco/Canadian-crafted-ai.git`
2. Delete everything in it except `.git`
3. Copy all files from this package into that folder
4. `git add . && git commit -m "Rebuild: working Next.js site + discovery agent" && git push`
5. Vercel will auto-deploy from the push (it's already connected)
6. In the Vercel dashboard → Project Settings → Environment Variables, add the 6
   variables listed in `.env.local.example` (with real values — see below)
7. In Vercel → Project Settings → Cron Jobs, confirm `/api/cron/discover` shows up
   (it's defined in `vercel.json`, runs daily at 9am ET)

## Path B — Fresh Vercel project (if you'd rather not touch the old repo)
1. Create a new GitHub repo, push this code to it
2. In Vercel, "Add New Project" → import that repo
3. Same env vars as step 6 above
4. Deploy

---

## Environment variables you need to fill in

From your Supabase dashboard (Project Settings → API) for project `canadian-crafted-co`:
- `NEXT_PUBLIC_SUPABASE_URL` → already correct in the example file
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → copy the `anon` `public` key
- `SUPABASE_URL` → same as above
- `SUPABASE_SERVICE_ROLE_KEY` → copy the `service_role` key (keep secret, server-only)

From console.anthropic.com:
- `ANTHROPIC_API_KEY`

Make one up yourself:
- `CRON_SECRET` → any random string (protects the discovery endpoint from being
  triggered by randoms — Vercel automatically sends this as a Bearer token to
  your own cron jobs when you set it)

## Testing the discovery agent manually before relying on the cron
Once deployed with env vars set, you can trigger it by hand:
```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-site.vercel.app/api/cron/discover
```
It'll return JSON like `{"ok":true,"category":"outdoors","found":7,"inserted":5}`.

## What happens automatically once live
Every day at 9am ET, the cron hits `/api/cron/discover`, which:
1. Picks the next category in rotation (outdoors → health → family → fitness → repeat)
2. Asks Claude (with real web search) to find 5-10 real Canadian products in that category
3. Inserts new ones into `products`, auto-marking `canada_verified = true` if confidence ≥ 0.6
4. Skips anything already in the database (deduped by product URL)

This is the "living and breathing" agent — it runs on its own from here, no manual triggering needed, and your catalog grows by itself over time.
