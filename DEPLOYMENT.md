# Customer Deployment Guide — Bulk Email Sender

## Scenario A — العميل عنده infrastructure

### يقدمه العميل
- VPS (4 vCPU / 8 GB RAM / 80 GB SSD recommended)
- Ubuntu 22.04 / 24.04
- Domain + DNS
- **Dedicated outbound SMTP provider** (SendGrid، Amazon SES، Mailgun، Postmark) — للـ deliverability
- **Provider authentication** — SPF + DKIM + DMARC records مظبوطة
- Stripe / Paymob / PayTabs / Paddle accounts (whichever applies)
- Firebase project (optional — لـ FCM admin notifications)

### نقدمه نحن
- ✅ كل الـ source code (Next.js App Router + worker)
- ✅ Prisma schema + seed scripts
- ✅ Dockerfile + docker-compose (dev + production)
- ✅ Worker process configuration للـ BullMQ
- ✅ Provider setup guides (Stripe، Paymob، PayTabs، Paddle، Firebase)
- ✅ Email provider integration templates
- ✅ توثيق كامل
- ✅ CI workflow
- ✅ 90-min Zoom deployment session
- ✅ 60-min training (first campaign، segments، automations، billing)
- ✅ Support حسب الـ tier

### Timeline (2-3 يوم)
- VPS + DNS + TLS
- Postgres 15 + Redis 7 (docker compose)
- Prisma db push + admin user creation
- App + worker deploy (PM2 / docker)
- SMTP provider configuration + DNS records
- Payment provider integrations (whichever apply)
- Email warm-up plan (gradual ramp-up)
- Training + go-live

---

## Scenario B — إحنا اللي بنشتري ونجهز

### يقدمه العميل
- بيانات الشركة
- Domain
- اختيار الـ payment providers (نسجل ونديره معاه)

### نقدمه نحن
- ✅ كل اللي في Scenario A
- ✅ VPS + Domain + DNS setup
- ✅ TLS via Let's Encrypt (auto-renew)
- ✅ SendGrid / SES account setup + SPF + DKIM + DMARC
- ✅ Firebase project (لو محتاج)
- ✅ Daily backups (pg_dump → S3/R2)
- ✅ Uptime monitoring
- ✅ 3 شهور Priority support

### تكاليف infra تقديرية
| البند | شهرياً |
|------|-------|
| VPS (4 vCPU / 8 GB) | $20–$40 |
| Domain | $1 |
| Backups | $2 |
| SMTP provider (SES — 1k emails/day) | $0.10 |
| SMTP provider (SendGrid 100k/month) | $20 |
| Stripe fees | ~3% per transaction |
| Paymob fees | ~3% per transaction |
| Monitoring | $0 |

---

## Email Deliverability Compliance

- 🔒 **SPF record** — `v=spf1 include:provider.example -all`
- 🔒 **DKIM signing** — public key in DNS
- 🔒 **DMARC policy** — start at `p=none`، escalate لـ `p=quarantine/reject`
- 🔒 **Reverse DNS / PTR** — مظبوط
- 🔒 **List-Unsubscribe header** — مدعوم تلقائياً
- 🔒 **One-click unsubscribe** — متفعل
- 🔒 **GDPR / CASL / CAN-SPAM compliance** — opt-in tracking + audit log
- 🔒 **Bounce + complaint feedback loop** — مدعوم من الـ provider

## Security Compliance

- 🔒 **NextAuth** sessions + HttpOnly cookies
- 🔒 **CSRF** double-submit
- 🔒 **Rate limiting** على /auth و /api
- 🔒 **API keys** — hashed، per-user، revocable
- 🔒 **Owner-validation** على كل resource (campaign، contact، template، automation، webhook)
- 🔒 **Audit log** — campaign sends، billing actions
- 🔒 **Webhook signature verification** — Stripe، Paymob، PayTabs، Paddle
- 🔒 **Helmet headers** + CSP

أكتر تفاصيل في `docs/AUDIT-REPORT` (deleted in sales-prep, available on request).
