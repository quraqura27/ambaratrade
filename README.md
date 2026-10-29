# Ambara GlobalTrade platform

A staged replacement for the existing public site at `ambaratrade.com`. The existing Sites site stays live until this application passes the launch checks and the domain is switched. All website and team UI is in English.

The existing Sites brochure carries the public product listing; this application remains staged until its backend and mail acceptance checks pass. The company-email migration records the requested addresses without creating mailboxes or inviting users.

Use [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) to record the release gates before changing the domain.

## What is implemented

- Owner-approved multi-commodity catalogue. Draft, review, published, paused, and archived states. The current ready-to-fry bovine skin crackers copy is in `scripts/seed-product.sql` as **in review**; it cannot appear publicly before owner verification and publication.
- Public product and custom-commodity inquiry forms. The server saves the inquiry and reference first, then queues buyer confirmation and staff notification. WhatsApp is optional after saving. Email failures are visible in the private workspace.
- Invitation-only Supabase login for owner and editors. Editors can prepare products, handle inquiries, and draft quotes. Only the owner can view supplier identity/evidence, verify and publish products, manage staff/settings, or approve/revoke quotes. Database RLS denies direct access to private tables; server actions check roles again.
- Multi-item, single-currency quotation drafts. Owner approval generates a numbered, immutable PDF with a QR verification link and attempts email delivery. A revised quote creates a new version. A failed send remains approved but unsent. Ambiguous provider outcomes are marked `uncertain` and **cannot** be retried until checked in Resend.
- Public QR page showing issuer, quote/version, issue date, buyer, currency, total, and current validity/supersession/revocation status. Buyer PDF check runs SHA-256 locally in the browser; the file is not uploaded.

## Project layout

- `src/app`: public site, team workspace, API endpoints, verification page.
- `src/lib`: validation, money calculations, email, Supabase, PDF, approval workflow.
- `supabase/migrations`: tables, RLS, storage buckets, atomic email claim and quote status functions.
- `scripts/seed-product.sql`: initial product copy staged for owner review.
- `scripts/invite-owner.mjs`: initial owner invitation, after Auth SMTP is configured.
- `.env.example`: required Vercel environment variables (never commit real secrets).

## Required company-owned services

1. Create the Vercel, Supabase, and Resend accounts under company control. Do not reuse a personal project/account. Choose the subscriptions only after reviewing current prices and limits.
2. Create a Supabase project and apply migrations in order. Configure Auth with **public sign-up disabled**, email/password enabled, custom SMTP, a custom **Invite user** email template, and allowed redirect URLs for both preview and production `/auth/confirm`. Use the checked-in `supabase/invite-template.html` as the template; it sends `token_hash` to `/auth/confirm`, where the server verifies the invite and sets session cookies. Storage buckets are created by the first migration. Confirm no private bucket is public.
3. Add Vercel preview environment variables based on `.env.example`. The Supabase secret key and Resend key are **server-side only**. Set a random `INQUIRY_RATE_SALT`. Set `APP_BASE_URL` to the HTTPS deployment URL used for preview tests, then to `https://ambaratrade.com` before issuing production quotes. Set `AUTH_SMTP_READY=true` only after Supabase Auth invitations are delivered through the configured sender.
4. In Resend, verify the sending domain and add its DNS records. Set `RESEND_FROM_EMAIL` for a verified sender. The business inbox `info@ambaratrade.com` is the Reply-To. Resend's transactional sender is not the receiving inbox.
5. Create and test the Zoho mailbox later as previously decided. Add Zoho MX/SPF/DKIM/DMARC records without removing required website records. Verify inbound and outbound replies. Only then set `company_settings.mail_ready=true` using a privileged database operation. This flag is intentionally absent from the normal owner settings form.
6. Invite the chosen owner email: `node scripts/invite-owner.mjs quraisyabdurrahman@ambaratrade.com` with the Supabase/Vercel environment loaded. Then the owner chooses a password on the invitation page, sets the company identity and notification recipients, uploads supplier evidence, and publishes the reviewed product.

## Run and verify

With the company Supabase preview project and environment variables configured:

```sh
pnpm install
pnpm test
pnpm lint
pnpm build
```

Acceptance checks in the preview deployment:

1. Submit an inquiry with no WhatsApp number; confirm reference, saved record, buyer email, and team email. Simulate a mail failure and confirm the record and error remain visible.
2. Invite an editor and verify editor cannot access supplier evidence URL, change publication status, approve quotes, or open owner settings/team pages. Verify owner can.
3. Review supplier evidence and publish a product; check catalogue and detail on desktop and phone. Pause and confirm removal from public catalogue.
4. Create a multi-item quote and verify line totals, tax, one currency, all terms, owner approval, PDF attachment, and QR page. Edit a local copy of the PDF and confirm the local file check fails.
5. Simulate email rejection; verify status `approved_unsent`, retry once, and verify only one delivery. For `uncertain`, inspect Resend first and reconcile manually.
6. Revise and send version 2; verify version 1 reports superseded. Check expiry and revocation states.
7. Test the mailbox with a real reply to `info@ambaratrade.com` and confirm both root and `www` website addresses over HTTPS.

## Domain cutover

Only after the checks pass: export the current authoritative DNS zone as the rollback reference, connect root and `www` to the new Vercel project, update only the required web A/CNAME records, leave mail DNS intact, verify HTTPS and forms on both hostnames, and keep the old Sites site available for recovery. No DNS changes have been made by this repository.

## Launch gates still awaiting company input

- Company-owned Vercel, Supabase, Resend, and later Zoho accounts.
- Owner email: `quraisyabdurrahman@ambaratrade.com`; default inquiry notifications go to this address when no recipients are configured. Public contact and Reply-To: `info@ambaratrade.com`. Mailbox delivery still needs verification.
- Official registered address, company registration, tax number, and business telephone for the quotation PDF.
- Real supplier inspection evidence and the owner's publication decision.
- Verified two-way `info@ambaratrade.com` mailbox and transactional sender.
- Human review of privacy notice and commercial terms before public cutover.

The system does not store inventory, purchase cost, or margin. Availability and landed costs are checked for each offer.

## Indicative subscriptions to review before purchase

Official pricing pages checked on 15 October 2026: [Vercel Pro](https://vercel.com/docs/plans/pro-plan) lists a US$20 monthly platform fee for one deploying seat; [Supabase Pro](https://supabase.com/pricing) starts at US$25/month; [Resend](https://resend.com/pricing) has a free transactional tier subject to its limits; [Zoho Mail Lite](https://www.zoho.com/mail/zohomail-pricing.html) lists US$1/user/month for 5 GB with annual billing. A one-seat paid Vercel + Supabase Pro + one Zoho Mail Lite mailbox would therefore start around **US$46/month equivalent**, before taxes, usage overages, additional seats, and any plan changes. Preview development can use eligible free tiers where their terms allow it. No subscription is created by this code.
