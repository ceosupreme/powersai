# Create User failure (Nov 11, 03:30-04:45 UTC) - log findings

Diagnosis only. No changes were made.

## What the logs show
- create-user function logs: the log tool returned "No logs found for edge function 'create-user'."
- Function request logs (status codes) for create-user: none.
- Sign-in service (auth) logs, 03:20-04:55 UTC: zero entries, so no POST /admin/users error is visible.
- Gateway logs for any path with "create-user" or "admin/users": none.

## Why this can't answer the question
The earliest log of any kind still kept starts at about 04:41 UTC (gateway 04:41:43, database API 04:42:34, function logs 04:43:21). Everything from 03:30 to about 04:41 UTC is no longer kept. In the last few minutes that are kept (04:41-04:51), there are no create-user calls.

So I can't give the status code, the error text, or the email domain and role of the failed attempts. The request body isn't logged anyway.

## Suggested next step (needs your OK)
Have the admin try Create User once more. I'll read the create-user and auth logs right after, while they're still kept.
