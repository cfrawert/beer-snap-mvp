# Beer Snap Architecture

## Overview
Beer Snap is a camera-first, minimal social feed for beer photos. The MVP emphasizes fast capture, public feeds, and lightweight moderation.

## Monorepo Layout
- `apps/beer-snap`: Expo + React Native app (iOS/Android/Web) using Expo Router.
- `packages/domain`: Shared domain types and enums.
- `packages/data`: Supabase client + data access helpers.
- `packages/ui`: Shared design system components and theme.
- `supabase/`: SQL migrations, seed script, and edge functions.
- `docs/`: Product and operational docs.

## Data Model Notes
- Posts are immutable social objects. Updates only allow soft-delete and moderation status changes.
- Structured beer/place metadata is stored in `post_observations`, separate from canonical entities (`beers`, `breweries`, `places`).
- Snapshot fields inside `post_observations` preserve history even if canonical entities change later.
- Counter caches are for performance only; they are not sources of truth.

## Feed Strategy
- Global feed supports `latest` and `top 24h` sorts.
- Cursor pagination uses keyset-style cursors to keep scrolling smooth and avoid offset scans.
- Following feed is a filtered query on the follower graph, cached with lightweight counts.

## Moderation
- Reports insert items into `admin_review_queue` automatically.
- Posts with high dislike ratios are auto-queued for review.
- Admin dashboard can approve or remove posts, and removals soft-delete content immediately.

## Notifications
- In-app notifications are stored in `notifications` and are per-user.
- Push tokens are stored per device in `user_push_tokens`.
- A Supabase Edge Function stub is included for dispatching Expo push payloads.

## Performance
- Images are compressed before upload and displayed with `expo-image` for fast caching.
- Feed uses optimistic UI and cursor pagination to reduce over-fetching.
- Design system tokens and shared components keep UI consistent and extensible.

## Tradeoffs
- RLS policies prioritize simplicity over granular column-level enforcement.
- Top-24h feed uses cached scores for speed and a consistent ranking model.
- Public web pages are statically exportable; deeper SEO can be added with server rendering later.
