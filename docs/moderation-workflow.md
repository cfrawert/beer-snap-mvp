# Sample Moderation Workflow

1. Queue intake
   - Reports and high-dislike posts appear in `admin_review_queue`.
2. Triage
   - Open Admin Review dashboard and prioritize by source/priority.
3. Decision
   - Approve if clearly beer and safe.
   - Remove if non-beer, abusive, or explicit.
4. Resolution
   - Mark queue item resolved (handled by dashboard actions).
5. Follow-up
   - If a user repeatedly violates rules, set `users.status = 'suspended'`.
