# Bulk Email Sender — جاهز للبيع

> **Campaigns + Templates + Automations + Reputation + Multi-provider payments — bilingual AR/EN. Source-code delivery + deployment + training.**

نظام كامل لإرسال الإيميلات بالجملة مع segmentation، automations، A/B testing، tracking، reputation monitoring، billing بـ Stripe/Paymob/PayTabs/Paddle. مبني على Next.js 16 + React 19 + PostgreSQL + Redis + BullMQ.

---

## ليه Bulk Email Sender ده؟

### Campaigns
- **Campaign builder** — subject، sender، preview text، scheduling
- **A/B Testing** — split subjects/templates، auto-winner selection
- **Drag-and-drop builder** + HTML editor
- **Throttle + warm-up** — controlled send rate per provider
- **Open / click tracking** — pixel + redirect
- **Unsubscribe** — list-unsubscribe header + opt-out page
- **Scheduling** — send now أو في وقت محدد

### Contacts
- **CSV/Excel import** — column mapping wizard
- **Segments** — dynamic + static
- **Suppression list** — bounced + complained + unsubscribed
- **Custom fields**
- **Tags + filters**
- **Per-contact engagement history**

### Templates
- **Visual builder** — sections، rows، components
- **Token replacement** — `{{firstName}}` etc.
- **Template library** — reuse across campaigns
- **Localization** — AR + EN variants
- **HTML / plain-text auto-generation**

### Automations
- **Trigger-based flows** — signup، segment join، date-based
- **Drip campaigns**
- **Conditional branching**
- **Wait steps** + delay
- **Webhook actions**

### Analytics & Reputation
- **Open / click / unsubscribe / bounce rates** per campaign
- **Bounce categorization** — hard + soft + complaints
- **Reputation dashboard** — provider scores، SPF/DKIM/DMARC tracking
- **Domain warm-up tracker**
- **Hourly + daily charts**

### Billing & Subscriptions
- **Stripe** — global SaaS standard
- **Paymob** — Egypt + MENA
- **PayTabs** — GCC + KSA + UAE
- **Paddle** — merchant-of-record alternative
- **3 plans** — Starter / Pro / Enterprise (monthly + yearly)
- **Usage tracking** — emails sent per period
- **Plan auto-routing** — match payment provider to region

### Security
- **NextAuth** — Google + GitHub OAuth + Email/Password
- **JWT sessions** + HttpOnly cookies
- **CSRF protection** (double-submit)
- **Rate limiting** على API
- **API key management** للـ programmatic access
- **Per-user data isolation** (RBAC + owner-validation)
- **FCM push notifications** للـ admin events

### Admin
- **User management**
- **Plan management**
- **Queue monitoring** — BullMQ
- **Suppression rules**
- **System health**

---

## التقنيات (Tech Stack)

| Layer | Stack |
|-------|-------|
| App | **Next.js 16.1.7 / React 19 / TypeScript** (App Router) |
| UI | **Tailwind v4 + Radix UI + shadcn/ui** |
| Database | **PostgreSQL 15** (Prisma 6) |
| Queue | **BullMQ + Redis 7** |
| Auth | **NextAuth (Auth.js) + Prisma adapter** |
| Payments | **Stripe + Paymob + PayTabs + Paddle** |
| Push | **Firebase FCM** (optional) |
| i18n | **next-intl** — Arabic (RTL) + English |
| Tests | **Vitest** — 3338 passing |

---

## كيف بيوصل المنتج

### كل ما يتم تسليمه
- ✅ Source code كامل (monolith Next.js App Router)
- ✅ Prisma schema + db push script
- ✅ Docker (Dockerfile + docker-compose.yml + start scripts)
- ✅ Worker process للـ campaigns (separate process)
- ✅ Stripe + Paymob + PayTabs + Paddle setup guides
- ✅ Firebase FCM setup (optional)
- ✅ E2E + integration test suites
- ✅ توثيق + screenshots + walkthrough video
- ✅ جلسة zoom 90 دقيقة للنشر + 60 دقيقة training
- ✅ دعم فني حسب الـ tier

### Timeline (2-3 يوم)
- يوم 1: VPS + Domain + TLS + Postgres + Redis
- يوم 2: Deploy app + worker، Stripe + Paymob setup
- يوم 3: Email provider warm-up + reputation baseline + training

---

## السعر والتراخيص

| البند | السعر |
|------|------|
| **Source code license** (single client) | حسب الاتفاق |
| **Deployment + training** | مشمول |
| **Support — Standard** | $100 / شهر |
| **Support — Priority** | $240 / شهر |
| **Support — Enterprise** | $550 / شهر |

تفاصيل tiers الدعم في `SUPPORT-PLANS.md`.

---

## تواصل

**Mahmoud Hamdy** — Full-Stack Developer
- **GitHub**: [github.com/mahmoodhamdi](https://github.com/mahmoodhamdi)
- **Email**: hmdy7486@gmail.com
- **Repository**: [github.com/mahmoodhamdi/Bulk-Email-Sender](https://github.com/mahmoodhamdi/Bulk-Email-Sender)
