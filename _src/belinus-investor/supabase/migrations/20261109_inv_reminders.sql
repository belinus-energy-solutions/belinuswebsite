-- 15-minute reminders for video and call-back appointments.
alter table public.inv_bookings add column if not exists reminder_sent_at timestamptz;

-- Scheduled job: every 5 minutes, call bel-inv-reminders (needs the pg_cron and pg_net extensions).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('inv-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://cbykdhbqfgjzodldavvy.supabase.co/functions/v1/bel-inv-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
