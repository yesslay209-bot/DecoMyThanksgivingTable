# Contributing to DecoThanks

Thanks for helping! This is a small, friendly project, and first-time contributors are very welcome.

## Getting started

1. Fork the repo and clone your fork.
2. `npm install`, then `npm run dev`.
3. Make a branch: `git checkout -b fix/short-description`.
4. Before you push, run `npm run check` (production build + smoke test). CI runs the same thing on every pull request.

You don't need Supabase to work on most of the app. If your change touches cards, sharing or the leaderboard, create a free Supabase project and run `supabase/schema.sql` in it (see the README).

## What makes a good pull request

- **One change per PR**, with a description of what changed and why.
- **Check it on a phone-sized screen.** Most people will open shared links on their phones. Browser dev tools' device mode at 375px wide is fine.
- **Screenshots** for anything visual, before and after.
- **Keep it dependency-light.** The app is plain JavaScript on purpose. Talk to us in an issue before adding a framework or a large library.
- **Never trust user text.** Cards and table names come from strangers. Anything shown on the page goes through `esc()`.
- **Database changes** go in `supabase/schema.sql` and must be safe to re-run (`if not exists`, `drop ... if exists`, `create or replace`).

## Adding a new food or decoration

1. Add a transparent PNG (about 512px wide) under `public/assets/foods/<category>/`.
2. Add a row to the `foods` list near the top of `src/main.js`, and an entry in `assetSlugs` if the file name differs from the id.
3. Optional: add it to an unlock tier in `UNLOCKS`.

Only add art you made yourself or that is licensed for reuse. Say where it came from in your PR.

## Reporting bugs and ideas

Open an issue using one of the templates. For security problems, please don't open a public issue; see [SECURITY.md](SECURITY.md).

## Code of conduct

Be kind. This project is about gratitude. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
