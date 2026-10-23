# Ambara GlobalTrade launch checklist

Keep the existing `ambaratrade.com` site live until every gate below is checked with the company owner. Record test evidence and DNS values outside this repository; never commit credentials or private supplier files.

## Company access and services

- [ ] Confirm the company can administer the GitHub repository and recovery access.
- [ ] Create the company-controlled Vercel project from this repository, with preview and production environments.
- [ ] Create the company-controlled Supabase project, run all migrations in order, and confirm `supplier-evidence` and `quotation-pdfs` are private.
- [ ] Create the company-controlled Resend account; verify a transactional sending domain and configure the sender.
- [ ] Create and test `hello@ambaratrade.com` for inbound and outbound replies. Configure Supabase Auth SMTP and the checked-in invite template. Test an invitation before setting `AUTH_SMTP_READY=true`.
- [ ] Set all variables from `.env.example` separately for preview and production. Use the actual HTTPS preview URL for preview `APP_BASE_URL`; use `https://ambaratrade.com` for production. Keep secret values in the providers, never in Git.

## Business identity and first product

- [ ] Owner confirms legal name, registered address, registration number, tax number, business telephone, owner email, and inquiry notification recipients.
- [ ] Obtain a product dossier for the ready-to-fry bovine-skin crackers: supplier identity and authorization, composition and bovine origin, process/heat treatment, specifications, packaging and label photos, shelf life, capacity, test reports, and any claimed certification.
- [ ] Owner reviews the public product copy against the dossier, uploads private evidence and a public product photo, verifies the evidence, and publishes the product. Keep destination-specific import eligibility out of the public copy until verified for the exact shipment.
- [ ] Review the privacy notice and commercial terms with the company decision maker.

## Preview acceptance

- [ ] Run `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, and `pnpm audit --prod --audit-level high` on the release commit.
- [ ] Submit an inquiry without WhatsApp. Confirm its reference, saved record, buyer confirmation, and team alert. Confirm failed email delivery remains visible.
- [ ] Accept owner and editor invitations. Confirm editor cannot access supplier evidence, publish products, approve or resend quotations, or manage settings and team access.
- [ ] Confirm the product appears on desktop and phone, then pause and republish it to check public visibility.
- [ ] Create and approve a multi-item quotation. Verify totals, currency, legal identity, attached PDF, QR status page, and local PDF integrity check. Test a modified PDF.
- [ ] Test failed and uncertain email outcomes, revision, supersession, expiry, and revocation. Reconcile an uncertain provider outcome before retrying.
- [ ] Receive and reply to a real message at `hello@ambaratrade.com`.

## Domain cutover

- [ ] Export the current authoritative DNS zone and record the old web targets and rollback operator.
- [ ] Stage and test the production deployment with production environment variables before assigning the domain.
- [ ] Point only the root and `www` web records to Vercel. Preserve mail records.
- [ ] Verify HTTPS, product, inquiry, login, email, PDF, and QR on both hostnames. If any launch gate fails, restore the recorded web targets and keep the old site available.
