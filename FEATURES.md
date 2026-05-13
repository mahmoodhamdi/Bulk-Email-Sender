# Features Inventory — Bulk Email Sender

Legend: ✅ ships / 🟡 caveat / 🔵 optional / ⛔ out of scope

---

## Authentication
| Feature | Status | Notes |
|---------|:------:|-------|
| Email + password (NextAuth) | ✅ | bcrypt 12 rounds |
| Google OAuth | ✅ | NextAuth provider |
| GitHub OAuth | ✅ | NextAuth provider |
| Session management | ✅ | HttpOnly cookies |
| API keys (programmatic auth) | ✅ | per-user، revocable |
| CSRF protection | ✅ | double-submit |
| Rate limiting | ✅ | per-IP + per-user |
| Role-based access (USER، ADMIN) | ✅ | |

## Campaigns
| Feature | Status | Notes |
|---------|:------:|-------|
| Campaign CRUD | ✅ | |
| Subject + preview + body | ✅ | |
| Sender / from-name | ✅ | |
| Schedule send | ✅ | send-now or future date |
| Throttling (rate per minute) | ✅ | matches provider limits |
| Segment targeting | ✅ | |
| Personalization tokens | ✅ | `{{firstName}}` etc. |
| A/B testing | ✅ | subjects + content + winners |
| Campaign duplication | ✅ | |
| Campaign analytics | ✅ | per campaign |
| Pause / resume / cancel | ✅ | |
| Retry failed recipients | ✅ | |

## Contacts
| Feature | Status | Notes |
|---------|:------:|-------|
| Contact CRUD | ✅ | |
| CSV import wizard | ✅ | column mapping |
| Excel import | ✅ | |
| Custom fields | ✅ | |
| Tags | ✅ | |
| Static segments | ✅ | |
| Dynamic segments | ✅ | rule-based |
| Suppression list | ✅ | bounced + complained + unsubscribed |
| Engagement history | ✅ | per contact |
| Bulk delete / merge | ✅ | |

## Templates
| Feature | Status | Notes |
|---------|:------:|-------|
| Template CRUD | ✅ | |
| Visual builder | ✅ | drag-and-drop sections |
| HTML editor | ✅ | |
| Plain-text auto-generation | ✅ | |
| Tokens / merge fields | ✅ | |
| Template duplication | ✅ | |
| Preview (desktop + mobile) | ✅ | |

## Automations
| Feature | Status | Notes |
|---------|:------:|-------|
| Trigger-based flows | ✅ | signup، segment-join، tag-add |
| Time-delay steps | ✅ | |
| Email send action | ✅ | |
| Conditional branching | ✅ | based on engagement |
| Webhook action | ✅ | |
| Automation analytics | ✅ | per node |

## Tracking
| Feature | Status | Notes |
|---------|:------:|-------|
| Open tracking | ✅ | pixel |
| Click tracking | ✅ | redirect with token |
| Unsubscribe tracking | ✅ | one-click |
| Bounce categorization | ✅ | hard، soft، transient |
| Complaint tracking | ✅ | feedback loop |
| Geo + device data | 🟡 | extracted from IP + UA |

## Analytics & Reputation
| Feature | Status | Notes |
|---------|:------:|-------|
| Campaign performance dashboard | ✅ | |
| Open / click / unsub rates | ✅ | |
| Bounce + complaint rates | ✅ | |
| Reputation scoring | ✅ | per sender domain |
| Hourly / daily / weekly charts | ✅ | |
| Per-link click breakdown | ✅ | |
| Engagement over time | ✅ | |
| Bounce reason breakdown | ✅ | |

## Billing & Subscriptions
| Feature | Status | Notes |
|---------|:------:|-------|
| Stripe integration | ✅ | global |
| Paymob integration | ✅ | Egypt + MENA |
| PayTabs integration | ✅ | GCC |
| Paddle integration | ✅ | merchant-of-record |
| 3 plan tiers (Starter / Pro / Enterprise) | ✅ | monthly + yearly |
| Usage metering | ✅ | emails sent + contacts + automations |
| Plan upgrade / downgrade | ✅ | |
| Invoice history | ✅ | |
| Webhook signature verification | ✅ | per provider |

## Notifications
| Feature | Status | Notes |
|---------|:------:|-------|
| FCM push (web) | ✅ | optional |
| Email digests | ✅ | |
| In-app notifications | ✅ | |

## Internationalization
| Feature | Status | Notes |
|---------|:------:|-------|
| Arabic + English | ✅ | full UI translation |
| RTL layout | ✅ | |
| next-intl | ✅ | |
| Locale-aware dates + numbers | ✅ | |

## Administration
| Feature | Status | Notes |
|---------|:------:|-------|
| User management | ✅ | |
| Plan management | ✅ | |
| Queue monitoring | ✅ | BullMQ |
| Suppression rules | ✅ | |
| System health endpoint | ✅ | `/api/health` |
| Audit log | ✅ | |

## Tests
| Suite | Tests | Status |
|-------|-------|:------:|
| Unit (Vitest) | 3338 | ✅ all passing |
| Integration | included | ✅ |
| E2E (Playwright) | available | 🟡 needs running app |

## Out of Scope
| Feature | Why |
|---------|-----|
| SMS / WhatsApp sending | Different product class; can integrate Twilio in Enterprise |
| Built-in SMTP server | Use a dedicated provider for deliverability |
| Voice broadcasting | Different product class |
| Image hosting CDN | Use Cloudinary / S3 |
