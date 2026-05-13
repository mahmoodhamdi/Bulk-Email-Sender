# Handover Checklist — Bulk Email Sender

**Client**: ___________________________
**Delivery date**: ____ / ____ / ______
**Tier**: ☐ Standard / ☐ Priority / ☐ Enterprise

---

## Infrastructure
- [ ] VPS (4 vCPU / 8 GB RAM / 80 GB SSD)
- [ ] Ubuntu 22.04 / 24.04 patched
- [ ] ufw + Fail2ban
- [ ] Swap configured (4 GB)
- [ ] Timezone configured

## Domain + TLS + Email DNS
- [ ] DNS A record for app domain
- [ ] DNS A record for tracking domain (optional but recommended)
- [ ] TLS via Let's Encrypt (auto-renew configured)
- [ ] **SPF record** — covers your SMTP provider
- [ ] **DKIM key** — published in DNS
- [ ] **DMARC policy** — `p=none` initial، escalate later
- [ ] Reverse DNS / PTR record

## Database
- [ ] Postgres 15 running
- [ ] Database `emailsender` created
- [ ] `prisma db push` applied
- [ ] Daily backups configured (pg_dump → S3/R2)
- [ ] Backup restore tested

## Redis
- [ ] Redis 7 running
- [ ] Persistence enabled
- [ ] Password protected
- [ ] BullMQ queues registered (campaign-send، tracking، automation)

## App
- [ ] Node 20+
- [ ] `npm ci` + `npm run build` succeeded
- [ ] `.env` populated (DATABASE_URL، REDIS_URL، NEXTAUTH_SECRET، payment keys، Firebase)
- [ ] systemd / PM2 service running
- [ ] Health endpoint returns 200

## Worker
- [ ] Worker process running (separate from app)
- [ ] Worker concurrency tuned for SMTP provider rate limits
- [ ] Worker restart policy configured

## SMTP Provider
- [ ] SendGrid / SES / Mailgun account active
- [ ] Sending domain verified
- [ ] SPF + DKIM + DMARC verified by provider
- [ ] Daily sending limits reviewed
- [ ] Warm-up plan agreed (gradual ramp-up)

## Initial Seed
- [ ] First admin user created
- [ ] Admin password CHANGED from default
- [ ] Initial plan tiers configured

## Payment Providers (whichever apply)
- [ ] Stripe — secret + publishable + webhook keys
- [ ] Paymob — API key + integration IDs + HMAC
- [ ] PayTabs — profile + server + client keys
- [ ] Paddle — API key + webhook secret
- [ ] Test transaction for each provider
- [ ] Plan prices mapped to provider product IDs

## Firebase (optional)
- [ ] Firebase project created
- [ ] Service account JSON installed
- [ ] FCM web push VAPID key configured
- [ ] Admin notification preferences set

## Security
- [ ] `npm audit` clean (or known-acceptable)
- [ ] `.env` chmod 600
- [ ] NEXTAUTH_SECRET rotated from default (32+ char random)
- [ ] CSRF tokens issued + verified
- [ ] Rate limiting verified
- [ ] API key hashing verified

## Training
- [ ] Dashboard walkthrough (30 min)
- [ ] First campaign send (15 min)
- [ ] Contacts import + segments (15 min)
- [ ] Template builder (15 min)
- [ ] Automations (15 min)
- [ ] Analytics + reputation review (15 min)
- [ ] Billing + plan management (15 min)

## Documentation
- [ ] README + DEPLOYMENT shared
- [ ] SMTP provider setup notes shared
- [ ] SUPPORT-PLANS signed
- [ ] This checklist signed

## 24h go/no-go
- [ ] Admin login works
- [ ] First contact imported
- [ ] First segment created
- [ ] Template created in builder
- [ ] Test campaign sent to seed list (10 emails) — landed in inbox
- [ ] Open / click tracking firing
- [ ] Unsubscribe link works
- [ ] Bounce captured and added to suppression
- [ ] Payment provider test transaction completed
- [ ] FCM push notification received (if enabled)

---

**Client**: ____________________  Date: ____ / ____ / ______
**Developer**: Mahmoud Hamdy — Date: ____ / ____ / ______
