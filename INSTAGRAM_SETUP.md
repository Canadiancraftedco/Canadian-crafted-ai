# Instagram Auto-Posting — Setup

This is real, working code — but it can't post anywhere until you complete a
one-time setup on Meta's side. This is not something I can do for you (it
requires logging into your own Meta/Instagram/Facebook accounts).

## What was built
- `/api/cron/backfill-images` — finds real product image URLs for the 21
  seeded products (and any future ones missing images), 5 at a time daily
- `/api/cron/instagram-post` — picks the next unposted, verified, image-having
  product, generates a caption + hashtags with Claude, and publishes it to
  Instagram via the Graph API
- Both log everything to `instagram_posts` (status: pending/posted/failed)
  and mark `products.posted_to_instagram = true` once live

## One-time Meta setup (~20-30 minutes)

1. **Convert your Instagram account to a Business or Creator account**
   (Instagram app → Settings → Account type)
2. **Connect it to a Facebook Page** (create one for Canadian Crafted Co. if
   you don't have one — required by Instagram's API, even if you never post
   to the Page itself)
3. **Create a Meta Developer App**: developers.facebook.com → My Apps →
   Create App → choose "Business" type
4. **Add the Instagram Graph API product** to that app
5. **Generate a long-lived access token** for your Instagram Business Account
   — Meta's docs walk through this (Graph API Explorer → get a short-lived
   token → exchange for long-lived via the `/oauth/access_token` endpoint).
   Long-lived tokens last ~60 days and need periodic renewal — for a "set it
   and forget it" setup later, this is worth automating, but manual renewal
   every ~2 months is fine to start.
6. **Get your Instagram Business Account ID** — via Graph API Explorer,
   query `me/accounts` then the connected Instagram account's ID.

## Environment variables to add in Vercel
| Name | Value |
|---|---|
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | the numeric ID from step 6 |
| `INSTAGRAM_ACCESS_TOKEN` | the long-lived token from step 5 |

Add both in Vercel → Settings → Environment Variables, then redeploy.

## Testing before trusting the cron
Once the env vars are set:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-site.vercel.app/api/cron/backfill-images
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-site.vercel.app/api/cron/instagram-post
```
Run backfill-images first (a few times, 5 products per call) so there are
image URLs available before instagram-post looks for candidates.

## Heads up on Vercel's free (Hobby) plan
Hobby plan has restrictions on cron job frequency and count — if adding the
3rd cron job (`instagram-post`) fails or doesn't show up in Vercel's Cron
Jobs settings tab after deploying, that's likely why. You'd either drop to 2
scheduled jobs and trigger the 3rd manually/less often, or move to a Pro plan.

## A caution on going fully "auto"
I'd actually recommend NOT fully trusting this to post automatically at first.
Once images + captions are flowing, check `instagram_posts` (status = 'pending'
or review the last few 'posted' ones) for a week before letting it run
completely unsupervised — a bad caption or wrong product going out publicly is
harder to walk back than a delayed post.
