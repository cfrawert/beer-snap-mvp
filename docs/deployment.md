# Deployment

## Supabase
1. Create a Supabase project.
2. Run migrations from `supabase/migrations` via Supabase CLI or SQL editor.
3. Create the `posts` storage bucket (or run the migration which inserts it).
4. Set RLS policies (included in migration).
5. Deploy edge function `send-follow-notifications` if using push notifications.

## Mobile (iOS/Android)
1. Configure EAS project and app identifiers in `apps/beer-snap/app.config.ts`.
2. Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_EXPO_PROJECT_ID` in EAS secrets.
3. Build with `eas build --platform ios` / `eas build --platform android`.
4. Submit to App Store / Play Store.

## Web
1. Set env vars in your hosting environment.
2. Build a static export: `expo export --platform web`.
3. Deploy the `dist` output to your static host (Vercel, Netlify, S3).

## Push Notifications
- Expo push requires a project ID and valid tokens stored in `user_push_tokens`.
- The `send-follow-notifications` function can be called from a scheduled job or a database webhook to send batched pushes.
