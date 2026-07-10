# GameShop Nepal - Product Requirements Document

## Overview
A premium, dark-themed e-commerce website for digital goods, built with React (frontend) and FastAPI + MongoDB (backend).

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Recharts, Sonner
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic
- **Database**: MongoDB
- **Auth**: JWT tokens (admin + customer), Google OAuth (customer)
- **Integrations**: Discord webhooks, ImgBB image hosting, Google Sheets

## Architecture (Post-Refactor - March 2026)
```
/app/backend/
├── server.py              # Slim app orchestrator (160 lines)
├── database.py            # DB connection, JWT/Discord config
├── dependencies.py        # Auth deps, audit logging
├── utils.py               # Shared utility functions
├── routes/
│   ├── auth.py            # Admin auth + admin management
│   ├── customers.py       # Customer auth, OTP, Google OAuth, profiles
│   ├── products.py        # Products + categories + image upload
│   ├── orders.py          # Orders, payments, completion, tracking
│   ├── reviews.py         # Reviews + trustpilot + FAQs
│   ├── ads.py             # Ad management + tracking
│   ├── content.py         # Blog, pages, social links, settings
│   ├── promotions.py      # Promo codes + store credits + bundles
│   ├── analytics.py       # Analytics dashboard + audit logs
│   ├── engagement.py      # Rewards, referral, newsletter, wishlist
│   └── chatbot.py         # Chatbot, reseller plans, SEO
├── models/schemas.py
├── email_service.py
├── discord_service.py
├── imgbb_service.py
├── order_cleanup.py
├── daily_summary_service.py
└── google_sheets_service.py
```

## Implemented Features (Complete)
- Homepage with product grid, customer reviews, ads
- Product pages with variations, custom fields
- Multi-step checkout with WhatsApp redirect
- Payment screenshot upload (ImgBB)
- Admin panel (products, orders, reviews, analytics, etc.)
- Customer auth (OTP + Google OAuth)
- Promo codes, store credits, bundle deals
- Review system (on-site, customer reviews, rewards)
- Discord notifications for orders
- Ad management system
- Reseller plans page
- Newsletter system
- Daily rewards + referral program
- Blog, FAQ, static pages
- PWA support
- Sound notifications for new orders (admin)
- **Downloadable review images** (admin) - Canvas-based, layout: GSN logo top (black bg), rating badge, review quote (white bg), stars + name, GameShop Nepal branding bottom (black bg)
- Bottom tab bar (mobile) + dynamic island nav (desktop)
- **Backend refactored** from 6344-line monolith to 11 modular route files
- **Trustpilot Review Sync** (admin) - Configurable domain, one-click sync from Trustpilot, reviews list with stats/distribution, clear all option
- **SEO Optimization** - react-helmet-async for dynamic per-page meta tags, Open Graph, Twitter cards, JSON-LD structured data (Product, FAQPage, BlogPosting, Organization schemas), dynamic sitemap.xml with all products/blogs/categories, robots.txt, canonical URLs. All URLs point to gameshopnepal.com production domain.
- **Order CSV Export** - Admin can export filtered orders to CSV (Order ID, Customer, Items, Total, Status, Payment)

## Prioritized Backlog

### P0 - Active/Recently Fixed
- ~~Navbar PWA icon on desktop~~ (FIXED - Apr 2026)
- ~~Account not showing after login~~ (FIXED - Apr 2026)

### P1 - High Priority
- Reorder product variations (drag-and-drop in admin)
- Enhanced FAQ with categories and search

### P2 - Medium Priority
- Flash sales timer (countdown for deals)
- Product bundles (combo deals)
- Live purchase ticker

### P3 - Future
- eSewa/Khalti payment gateway
- Public order tracking page
- Take.app integration
- Help Center / Knowledge Base
- Loyalty/rewards & referral enhancements

---

## Changelog

### Feb 2026
- **P0 Security fix (production exploit)**: Attackers were placing mass orders with manipulated prices (Rs 999 product bought for Rs 11, Rs 145 product bought for Rs 26 using fake variation names/ids). Two root causes fixed in `/app/backend/routes/orders.py::create_order`:
  1. **Weak price validation** — the server used to fall back to `product.variations[0].price` (cheapest) when variation_id/name didn't match, and trust `item.price` when `product_id` was missing entirely. Now: item without a real, resolvable `product_id + variation_id/name` is HARD-REJECTED with HTTP 400.
  2. **Rate limiter existed but was never called**. `POST /api/orders/create` now calls `check_rate_limit(ip, email)` (3 orders / 10 min) and `record_order(ip)` on success. Blocklisted IPs/emails return HTTP 429.
  Also tightened total-mismatch tolerance from 10% to 5% with an additional Rs 2 absolute floor, and removed the `server_final > 10` gate so tiny-total exploits are always caught. Added auto-restore of the blocklist from `db.site_settings.blocklist` on FastAPI startup so container restarts don't unblock attackers. Purged 6 pre-existing fraudulent orders from the DB. Verified with 9+1 new pytest cases plus a full 38-test regression suite (100% pass), including a live `sudo supervisorctl restart backend` test confirming blocked IPs survive restarts.
- **Cleanup pass (code hygiene + 6 latent runtime bugs)**: Ran full ruff scan across backend, found 11 real F821/F811 issues + 14 duplicate class defs. All fixed:
  - `orders.py`: added missing `DISCORD_ORDER_WEBHOOK` import (was NameError on payment-screenshot + status-update paths); fixed complaint endpoint from 20-word count to 20-char count (matched frontend); removed 4 duplicate Pydantic models
  - `content.py`: added missing `from pathlib import Path` import (was NameError on SMTP settings GET/PUT fallback); typed `PUT /api/settings` with `SiteSettingsUpdate` Pydantic model (validates `tax_percentage` 0-100 + `service_charge` >=0); removed 3 duplicate models
  - `customers.py`: added missing `import google_sheets_service` (was NameError on customer auth flow); removed 4 duplicate models
  - `chatbot.py`: added missing `from emergentintegrations.llm.chat import LlmChat, UserMessage` (was NameError on `/api/chat`); removed duplicate `ChatMessage`, `re`, `Response`
  - `promotions.py`: added missing `PromoCode` Pydantic class (was NameError when admin created a promo); removed 4 duplicate models
  - `engagement.py`: removed 3 shadowed helper function duplicates
  - `server.py`: extracted `_health_payload` shared helper to DRY the two `/health` handlers
  - `tests/test_api.py`: bare `except:` → `except Exception:`
  Verified with 13 new pytest cases + 16 existing regression tests + frontend smoke (29/29 pass, 100% backend, 100% frontend).
- **Fix (P1, tax handling)**: Removed the hard-coded 5% tax in `create_order`. Server now reads `service_charge` and `tax_percentage` from `db.site_settings.main` (defensive float casts, fallback 0/0), applying the exact same formula as the frontend.
- **Bug fix (P0, production)**: Every order attempt was returning HTTP 500 due to `NameError: name 'client_ip' is not defined` in `create_order` (`routes/orders.py` line ~175). Frontend just showed a generic "Failed to place order" toast, masking the true 500. Fixed by extracting `client_ip` from `request.headers['x-forwarded-for']` (with fallback to `request.client.host`) before building the order document. Made `request: Request = None` an optional param.
- **Bug fix**: Pending orders auto-cleanup was broken due to case mismatch — `routes/orders.py` writes `status="Pending"` (capital P), but `order_cleanup.py` queried for `status="pending"` (lowercase), so nothing ever matched. Updated cleanup query to `$in: ["Pending","pending"]`.
- **Deployment fix (P0)**: `/health` and `/api/health` endpoints were awaiting an unbounded MongoDB Atlas ping, causing Kubernetes readiness probe 504 timeouts. Wrapped `db.command("ping")` in `asyncio.wait_for(timeout=1.0)` and made the endpoint always return HTTP 200 with a `degraded` note on ping failure. Verified fast response (<5 ms nominal, ≤1.005 s under simulated timeout).
- **UX fix (P1)**: Complaint form (`CustomerAccountPage.jsx`) previously showed "20 words minimum" in placeholder and character counter, though the underlying validator counted characters. Aligned copy: placeholder now says "minimum 20 characters" and counter reads "N/20 characters minimum". Rebuilt `.next` bundle.

## Pending Work
- (Optional) De-dupe duplicated Pydantic models in `/app/backend/routes/orders.py` (OrderItem, CreateOrderRequest, PaymentScreenshotUpload, BulkDeleteRequest are declared twice).
- (Optional) DRY the two health handlers in `server.py` into a shared helper.

