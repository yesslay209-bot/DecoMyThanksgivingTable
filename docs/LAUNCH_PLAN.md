# Launch plan: DecoThanks, Thanksgiving 2026

Goal: as many real tables and thank-you cards as possible by Thanksgiving (Thursday, Nov 26), plus a few open-source contributors.

## Before posting anything (Tuesday, Nov 24)

- [ ] Supabase project created and `supabase/schema.sql` run ([DEPLOY.md](DEPLOY.md) step 1)
- [ ] Site live at https://foojanbabaeeian.github.io/DecoMyThanksgivingTable/ and the deploy run is green
- [ ] Phone checklist in DEPLOY.md done on a real iPhone and a real Android phone
- [ ] Your own table created, shared, with 3+ real cards from friends (so the first visitors see a lively table and the unlock box moving)
- [ ] Your table switched on for the leaderboard, so it isn't empty
- [ ] Link pasted into https://www.linkedin.com/post-inspector/ so the preview image is fresh

## Schedule

| When | What |
|---|---|
| Tue evening | Send your table link to 10–15 close friends and family: "Leave me a thank-you card before Thursday?" |
| **Wed, Nov 25, 8–10 am** | **Main LinkedIn post** (below), with the phone mockup image. Reply to every comment in the first 2 hours; that's when LinkedIn decides how far to show it. |
| Wed afternoon | Short follow-up comment on your own post: a screenshot of new cards arriving. |
| Wed | Post in class group chats / Discord / school Slack: "Make your own table and send it to your family." |
| Thu, Thanksgiving | Story/post: a screenshot of your table full of cards. "Thankful for every one of these." |
| Fri, Nov 27 | Results post: tables made, cards written, contributors, what you learned. Numbers come from the Supabase dashboard. |

## Images (in `docs/screenshots/`)

- `phones.png`: two phones (guest view + home). **Use this one for the main post.**
- `guest-desktop.png`: a full table with cards, desktop.
- `home-desktop.png`: landing page.
- Optional: a 10–15 second screen recording on your phone of decorating, pressing Share, and a card appearing. Video gets more reach on LinkedIn than images.

## Main LinkedIn post (draft)

Edit freely; it's your voice. Two things to keep:

1. **The disclosure sentence.** You're recommending a company your partner co-founded. LinkedIn's rules and the FTC's endorsement guidelines expect that to be said plainly, and readers trust a post more when it is.
2. **Only claims you've seen yourself.** The draft leaves a blank for your own Buildy result. Before posting, open Buildy, ask it to make something like this ("a Thanksgiving site where friends leave thank-you cards, with payments"), and describe honestly what it did and how long it took. A real result is far more convincing than "in a split second".

---

> This Thanksgiving I built a little website: **DecoThanks.** You decorate a Thanksgiving table, share the link, and the people you love leave thank-you cards right on it. 🦃
>
> 👉 Leave me a card: [YOUR TABLE LINK]
>
> I build small things like this all the time, for my classes, my students and myself. Building is the part I love. But this project reminded me how little of "launching" is building:
>
> • the code took an afternoon
> • hosting, a database, security, link previews, phone testing and a launch plan took days
> • and it still has no payments and no ads
>
> That gap is where most student projects die. I watch my students have wonderful ideas, build a first version… and stop, because getting it online, getting paid and getting seen is a whole other job. I don't want their creativity to end at "it works on my laptop".
>
> That's why I want to share **Buildy** (buildy.ai). Full disclosure: my partner is one of its co-founders. Nobody asked me to write this; I just love what they're making. You describe what you want in plain words, and it builds and hosts the website, sets up Stripe payments, makes the ads and social posts, and even answers the business phone. It's like having all the AI tools in one place, aimed at actually launching.
>
> [YOUR RESULT: e.g. "I asked Buildy for a version of DecoThanks with a pay-what-you-want button. In __ minutes it had ___."]
>
> It's early, and the team is raising right now, so feedback matters more than ever. If you're a student, teacher or first-time founder, give it a try and tell them (or me) what worked and what didn't.
>
> And DecoThanks is open source. If you want a friendly first open-source contribution, there are "good first issue" tasks waiting: https://github.com/foojanbabaeeian/DecoMyThanksgivingTable
>
> Happy Thanksgiving. I'm thankful for every one of you. 🧡
>
> #Thanksgiving #BuildInPublic #OpenSource #Education #Entrepreneurship #AI

---

Shorter version for X / Threads / Instagram:

> Built a tiny Thanksgiving site: decorate a table, share the link, friends leave thank-you cards 🦃 Leave me one → [link]. It's open source, and first-time contributors are welcome.

## Message for friends and group chats

> Making a Thanksgiving thank-you table this year 🦃 Would you leave me a card before Thursday? [link]. Takes 30 seconds, and you can make your own after.

## What to track

From the Supabase dashboard → Table Editor (or SQL: `select count(*) from shared_tables;` and `select count(*) from thank_you_cards;`):

- tables created
- cards written, and cards per table (how many tables got at least 3 cards)
- leaderboard opt-ins
- GitHub stars, forks and pull requests
