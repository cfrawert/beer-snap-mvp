# Admin Guide (Concise)

## Access
- Admin access is controlled by `users.status = 'admin'` in Supabase.
- Use the Supabase SQL editor or service role tooling to promote an account.

## Review Queue
- Navigate to Admin Review (top-right menu).
- Review each item’s image and source.
- Approve: keeps the post live.
- Remove: soft-deletes and sets moderation status to `removed`.

## Reports
- Reports generate queue items automatically.
- Focus on repeated offenders and abusive content.

## Push Notifications
- Verify `user_push_tokens` are collecting tokens.
- Dispatch pushes via the Edge Function or a scheduled job.
