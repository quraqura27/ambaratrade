-- Addresses selected by the company owner. This does not create mailboxes,
-- invite Auth users, or assert successful email delivery.
alter table public.company_settings
  alter column business_email set default 'info@ambaratrade.com';

update public.company_settings
set owner_email = 'quraisyabdurrahman@ambaratrade.com',
    notification_emails = case
      when cardinality(notification_emails) = 0
        then array['quraisyabdurrahman@ambaratrade.com']
      else notification_emails
    end,
    mail_ready = case when business_email = 'info@ambaratrade.com'
      then mail_ready else false end,
    business_email = 'info@ambaratrade.com',
    updated_at = now()
where id = 1;
