# WonderBites Portals — UI Enhancement Brief

WonderBites ("Good finds. Close by.") is a surplus-food marketplace: merchants (bakeries, restaurants, groceries) list "surprise bags/boxes" at a discount, consumers reserve and pick them up in a pickup window. Two web portals:

- **Admin portal** (WonderBites super admins): platform oversight.
- **Merchant portal** (restaurant / bakery owner, e.g. "Fig & Bloom Bakery — Al Wasl Branch, Dubai", user "Sara").

Reference screenshots of the CURRENT design are in `/home/claude/wb/ref/` (view every one with the Read tool before designing). `-a`/`-b` are top/bottom halves of the same screen.

## HARD RULES — do not break
1. **Do not change functionality or process flow.** Every screen keeps the same purpose, the same sections, the same data fields, table columns, filters, KPIs, buttons, actions and navigation items, in the same logical order of steps. You may restyle, regroup visually, improve hierarchy, spacing, states, and micro-interactions — but no feature added or removed, no step added or removed, no renaming of nav items or fields (fixing obvious typos like "Dietary tages" → "Dietary tags", "Issue Alerta" → "Issue Alerts" is fine; also fix obvious content bugs like a KPI showing "AED 62" for a count).
2. Stay inside the **WonderBites design system** (below). Your concept is a different *interpretation* of the same brand, not a new brand.
3. Desktop web, designed at 1440px wide.

## WonderBites design system (extracted from the Figma)
Colours
- Plum night (sidebar / login background): `#1A0F1E`, deep plum `#3A2343`, plum `#583D62`, mauve `#B783A7`
- Raspberry rose (primary brand / active / CTA): `#C65C75`, `#CB6372`, `#C47885`, deep berry `#A50B5E`, `#B34F73`
- Cream canvas: page `#F7F3EE`, card `#FFFCF9`, peach tint `#FFF0DE`, border `#EDE5DB`
- Impact green (sustainability, success, "Live", verified): `#0C432E`, `#2D6F3F`, `#11A849`, lime accent `#B7EF76`
- Warm orange (warning / pending / sold out): `#E87C40`
- Text: near-black `#000000`/`#1A0F1E`, muted greys

Type
- Display / page titles / logo: **Playfair Display** (serif, 20–32px). Logo wordmark "WonderBites" in serif + tiny caps tagline "GOOD FINDS. CLOSE BY."
- UI / body / tables: **Inter** (10–16px, Regular/Medium/Semi Bold; KPI numbers Bold 22).
- Load from Google Fonts.

Shape & components
- Radii ~10px cards, 8–12px inputs/buttons, pill badges.
- Dark plum sidebar with rose pill for active item; cream content area; white-cream cards with soft borders.
- Status pills: Live/Active/Verified/Completed = green; Ready/Pending/Sold out/Watch = orange/peach; Blocked/Cancelled/Rejected/Disabled/Failed = rose/berry; Expired/Inactive = grey.
- Recurring elements: "This month's impact" green mini card (52.4k meals · 24.1t CO₂ · 11.8k L water) at sidebar bottom; user card at sidebar bottom (admin: "Sarah Al Manasoori, Super administrator"; merchant: "Need Help?"); rose gradient "Create more. Rescue more. Impact more." banner with "Create from Template" button; dark-green Sustainability Impact card.

## Navigation (keep exactly)
Admin sidebar: Command Center, Drops, Pickups, Orders & Reservations, Merchants, Consumers, Financials, Operations Analytics, Wallet & Vouchers, Quality & Safety, Issues & Alerts, Support, Performance, Sustainability & Impact, Listings & Templates, CMS, Users & Access, Settings.
Admin top bar: global search ("Search drops, merchants, issues…"), date range (Jun 20 – Jul 20), Export, notifications (4), avatar menu.

Merchant sidebar: Overview, Orders & Pickups, Listings (Bags), Inventory, Driver, Analytics, Customers, Branches, Reviews, Reports / Dispute, Templates, Settings. Header shows merchant identity (logo, "Fig & Bloom Bakery" + verified tick, "Al Wasl Branch, Dubai").
Merchant top bar: branch selector (Al Wasl Branch / "WonderBites — UAE" on overview), date range, notifications, avatar menu.

## Screens to redesign (content = exactly what's in the reference)
Admin
- A0 Login (Welcome to WonderBites ADMIN; Sign In, email, password, Remember me, Forgot Password?, Sign In button)
- A1 Command Center (5 KPIs; Priority Alerts; Recent Orders table; Pickup Passport Monitoring donut; Issue Alerts table; Drop Accuracy chart; Merchant Quality Watch; Sustainability Impact; template banner)
- A2 Drops (5 KPIs; filter bar: search by box ID, status, categories, cities, dietary tags, sort, Clear filters; All Drops table with checkbox, drop, restaurant, category, price w/ strike & % off, availability progress, window, city, status, actions view/edit/delete)
- A3 Merchants (5 KPIs; same filter bar + Add Merchant; All Merchants table: merchant, category, city, quality score, drops, revenue, commission, status, view)
- A4 Financials (filters row: countries, cities, categories, merchants, branches, order types, clear all; 12 KPI tiles; Revenue & Margin snapshot w/ donut; GMV trend; Revenue trend; Payouts & Settlements; Refunds & Adjustments; Financial Trends monthly bars; Unit Economics 8 tiles)
- A5 Settings (sub-nav: Profile, General, Notifications, Security, Policies; Platform Basics fields; Operational Defaults toggles)

Merchant
- M0 Login (same as admin but with "Don't have an account? Sign Up")
- M1 Overview (greeting; 5 KPIs w/ sparklines; Sales Overview area chart; Top Selling Bags; Recent Orders; Inventory Status donut; Operational Status (Open, hours, pickup window, tap to change branch state); Reviews 4.2 (842) histogram; Alerts & Notifications; template banner)
- M2 Listings (Bags) (4 KPIs; filter bar; table #, box ID, category, price, value, qty, pickup window, status, actions)
- M3 Orders & Pickups (4 KPIs; search, status filter, Import, Export; table: order, customer, bag, amount, fulfilment (Self-Pickup / Driver Delivery), driver, window, status, row menu)
- M4 Create Product (General info: name, category, description; Photos dropzone; Pricing & Quantity: price, qty; Cancel / Create Product)
- M5 Inventory (filter bar + Add Inventory; same table as listings)

Use realistic sample data matching the references (AED/QAR, Dubai names). For food photos use tasteful CSS placeholders (warm gradients / emoji-free shapes) — no external image URLs.

## Deliverable
Write ONE self-contained file `index.html` in your concept folder: a concept page with
1. A short header: concept name, one-paragraph rationale, the concept's key design moves (bullets), and its token swatches.
2. A tab/switcher (pure JS, in-memory state) to view each of the 12 screens (A0–A5, M0–M5) rendered at full 1440px width inside a scaled preview (scale to fit the viewport width, e.g. CSS `transform: scale()` with a wrapper), Admin/Merchant grouped.
3. All CSS/JS inline; Google Fonts link allowed; no other external resources. Sidebar nav items can switch between the screens you designed (others just highlight).
Then screenshot-check your own work: render with Playwright/Chromium if available (`python3 -c "import playwright"`; install with `pip install playwright --break-system-packages && python3 -m playwright install chromium` if needed) and look at the PNGs with Read; fix anything broken, overlapping or clipped. Finish by replying with: concept name, 3-sentence summary, and the file path.
