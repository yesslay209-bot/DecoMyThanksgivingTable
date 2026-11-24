# Security

If you find a way to edit someone else's table, read data you shouldn't, run code in another person's browser, or anything similar, please **don't open a public issue**.

Report it privately with GitHub's **Report a vulnerability** button on the repository's Security tab. Include the steps to reproduce it. We'll reply as soon as we can and credit you in the fix if you'd like.

Things that are expected, not vulnerabilities:

- Anyone with a table's link can read that table and its cards. That's how sharing works.
- The Supabase anon key in the built JavaScript is public by design. The database rules in `supabase/schema.sql` are what protect the data.
