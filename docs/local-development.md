# Local Development

## Prereqs
- Node.js 18+
- Expo CLI (`npm i -g expo-cli`)
- Supabase CLI (`brew install supabase/tap/supabase`)

## Setup
1. Install dependencies:
   - `npm install`
2. Start Supabase locally:
   - `supabase start`
3. Apply migrations:
   - `supabase db reset`
4. Configure app env:
   - Copy `.env.example` to `.env` in `apps/beer-snap`
   - Fill in values from `supabase status`

## Run the App
- `npm run dev` (Expo dev server)
- `npm run dev:web` for browser
- `npm run dev:ios` or `npm run dev:android` for device simulators

## Seed Data (Optional)
- `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SECRET_KEY=... node supabase/seed/seed.js`
- The seed script uploads bundled portrait JPEGs from `supabase/seed/assets/`, creates test users, follows, posts, reactions, and one admin-review report.
