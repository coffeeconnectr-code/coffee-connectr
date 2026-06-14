-- Run in Supabase SQL Editor to debug welcome emails for a specific account.
-- Replace the email below if checking someone else.

-- 1. Check whether the account exists and whether a welcome email was recorded
select
  u.id as user_id,
  u.email,
  u.created_at,
  w.status as welcome_status,
  w.sent_at as welcome_sent_at
from auth.users u
left join public.welcome_emails_sent w on w.user_id = u.id
where lower(u.email) = lower('Gorillagear.coffee@gmail.com');

-- 2. If welcome_status is NULL and you have fixed the setup below,
--    delete the row (if any) so the next sign-in can retry:
--
-- delete from public.welcome_emails_sent
-- where user_id = (
--   select id from auth.users where lower(email) = lower('Gorillagear.coffee@gmail.com')
-- );
--
-- Then sign out on the site and sign back in.

-- 3. Confirm the tracking table exists
select to_regclass('public.welcome_emails_sent') as welcome_emails_table;
