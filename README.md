# Grand Team Marketplace

Static marketplace frontend for GitHub Pages + Supabase.

## Files
- `index.html` — app shell and dialogs
- `style.css` — responsive dark theme
- `app.js` — Supabase client, auth, catalog and listing submission
- `supabase/registration-trigger.sql` — profile trigger for new Auth users

## Supabase setup
1. Create the tables using the initial schema shared in the setup conversation.
2. Run `supabase/registration-trigger.sql` in Supabase SQL Editor.
3. In Authentication > Providers > Email, keep Email enabled and disable Confirm email if using the current username-only synthetic-email approach.
4. The project URL and publishable key are configured in `app.js`. Never put a Supabase secret/service-role key in this repository.

## Username login note
Supabase Auth signs in with email/password. Grand Team maps a username to an internal address at `accounts.grandteam.invalid`; the user interface only asks for the username. Optional contact email is stored in the profile metadata and is not the login address.

## GitHub Pages
Repository Settings > Pages > Deploy from a branch > `main` > `/ (root)` > Save.

## Current scope
The first frontend foundation includes account sign-up/sign-in, public listing display, category filtering, and pending listing submission. Admin provisioning, role/permission enforcement, moderation screens, and the remaining marketplace features are not implemented yet. Those must be added through secure server-side Supabase functions and Row Level Security policies before production use.
