# The Index

A community-kept catalog of websites, organized by shelf, with a fuzzy search
and an anonymous note wall. Static site (HTML/CSS/JS), backed by Supabase,
built to run on GitHub Pages.

## What's in here

- `index.html` — page structure (catalog view + wall view + submit modal)
- `style.css` — the whole visual design (dark, ledger/card-catalog styling)
- `config.js` — **edit this** with your Supabase project details and shelf list
- `script.js` — all the logic: loading data, search, submissions, the wall
- `supabase-schema.sql` — run once in Supabase to create the tables

Until you connect Supabase, the site runs on a few demo entries so you can see
it working — nothing breaks, submissions and whispers just say "demo mode."

## 1. Set up Supabase (free tier is enough)

1. Go to [supabase.com](https://supabase.com), create a project.
2. Open **SQL Editor**, paste in the contents of `supabase-schema.sql`, run it.
   This creates the `sites` and `whispers` tables with the right permissions
   (anyone can read approved sites and post whispers/submissions; only you,
   from the dashboard, can approve or delete).
3. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public key**.
4. Open `config.js` and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```

## 2. Set your shelves (categories)

Still in `config.js`, edit the `CATEGORIES` list to whatever shelves you
want. `id` is what's stored in the database — don't change an `id` after
sites have been filed under it, or they'll fall off the shelf.

## 3. Approving submissions

New submissions land in the `sites` table with `status = 'pending'`. To
publish one: open **Table Editor → sites** in Supabase, find the row, change
`status` to `approved`. It'll show up on the site right away (no rebuild
needed — the data loads live).

To remove a whisper or a bad submission, delete the row the same way.

## 4. Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo **Settings → Pages** → Source: deploy from branch → pick `main` and
   `/ (root)`.
3. Your site is live at `https://<username>.github.io/<repo>/`.

Everything runs client-side against Supabase, so there's no server to host —
GitHub Pages is all you need.

## Notes on the design

The whole site works like a library index: numbered entries, shelves
instead of tag pills, hairline dividers instead of cards. The Wall is the
one place that breaks that mood on purpose — a warmer, handwritten-feeling
space for anonymous notes, so the contrast between "the catalog" and "the
wall" does some of the storytelling.

Anonymous identity on the wall is just a random ID stored in the visitor's
browser (`localStorage`) — no accounts, no tracking across devices, no way
for you to unmask someone from the data itself.
