# DecoThanks 🦃

Decorate a Thanksgiving table, share the link, and let friends and family leave you thank-you cards.

**Live:** https://foojanbabaeeian.github.io/DecoMyThanksgivingTable/

![DecoThanks on two phones: a shared table full of thank-you cards, and the home page](docs/screenshots/phones.png)

- **Decorate** – drag 40+ hand-drawn dishes and decorations onto your table. Works on phones and desktops.
- **Share** – one-tap WhatsApp, Messages and Email, ready-made messages, a QR code and a story image. Guests leave a card with a food sticker.
- **Private cards** – cards are sealed: only the table's host can read them and see who wrote them.
- **Unlock** – more pieces unlock as friends leave you cards (3, 5, 10 and 20 cards).
- **Leaderboard** – hosts can opt in to show their table on the most-loved tables board.
- **No accounts** – the browser that creates a table holds its private edit key.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173
```

Without Supabase keys the app still works: share links carry a snapshot of the table, but cards don't sync between people.

To turn on syncing, create a free Supabase project, run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor, then copy `.env.example` to `.env.local` and fill in the two values from **Project Settings → API**.

```bash
npm run check        # build, smoke test and browser tests (what CI runs)
```

## How it's built

| Piece | What |
|---|---|
| Front end | Plain JavaScript + CSS, bundled with [Vite](https://vitejs.dev). The app lives in `src/main.js` and `src/style.css`; sharing helpers in `src/share.js`. |
| Data | [Supabase](https://supabase.com) Postgres. Row Level Security, column grants and a few `security definer` functions mean only a table's creator can edit it or read its cards, while anyone with the link can see the table and leave a card. Edit keys are stored only as hashes. See `supabase/schema.sql`. |
| Art | `public/assets/foods/<category>/*.png` |
| Hosting | GitHub Pages by default; optionally your own server behind Cloudflare. Both deploy from GitHub Actions after the tests pass. See [docs/DEPLOY.md](docs/DEPLOY.md). |

## Contributing

Contributions are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md), then pick an issue labelled **good first issue**.

## Credits

- The original DecoThanks site, idea and table and food artwork are by [yesslay209-bot](https://github.com/yesslay209-bot).
- **[foojanbabaeeian](https://github.com/foojanbabaeeian)** grew it into this open-source version: sharing, sealed cards, the database, testing and deployment.
- Inspired by [Deco My Tree](https://www.decomytree.com/).
- Everyone who contributes. Thank you! 🧡

## License

[MIT](LICENSE)
