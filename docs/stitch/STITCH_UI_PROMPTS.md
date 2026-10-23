# Stitch UI Prompt Book for StayNest

Use this specification document to generate, refine, and prompt **Google Stitch** (or frontend UI design generators) for pixel-perfect screens in StayNest.

---

## 1. Global Design System Tokens

- **Brand Primary:** `#E65100` (Warm Terracotta / Energetic Amber)
- **Primary Hover/Active:** `#BF360C`
- **Surface / Background:** `#FBF9F5` (Soft warm cream)
- **Card Surface:** `#FFFFFF` (Pure white with 1px border `#EAE4DA`)
- **Text Primary:** `#1C1917` (Deep stone black)
- **Text Muted:** `#78716C` (Warm gray)
- **Accent Emerald (Success/Paid):** `#16A34A` / Soft: `#DCFCE7`
- **Accent Rose (Dues/Urgent):** `#DC2626` / Soft: `#FEE2E2`
- **Accent Indigo (Info/Pending):** `#4F46E5` / Soft: `#EEF2FF`
- **Border Radius:** `12px` (Cards), `8px` (Buttons & Inputs), `9999px` (Pills/Chips)
- **Font Stack:** Plus Jakarta Sans, Inter, sans-serif

---

## 2. Screen Stitch Prompts

### Screen 1: Mobile-First Hostel Discovery (`HomePage`)
```text
Role: Senior UI/UX Designer
Context: StayNest Mobile Web App - Hostel Discovery & Search Screen
Target Dimensions: 390x844 (Mobile) with responsive 1200px desktop grid
Design Requirements:
- Header: Minimalist brand bar "StayNest" with location selector pill ("Narapally, Hyderabad ▾") and notification bell with unread indicator badge.
- Search & Filter Strip: Search input with magnifying glass ("Search by landmark, college, or PG name"). Below it, horizontal scrollable filter chips: "All", "Boys", "Girls", "Co-Live", "AC", "Attached Bath", "Food Included", "WiFi", "Under ₹6,000".
- Hero Callout: Compact banner highlighting verified student hostels with 0% brokerage.
- Hostel Card List: Vertically stacked cards.
  * Image carousel preview with aspect ratio 16:9, rounded top corners.
  * Badges over image: Gender tag ("Girls PG") top-left, "Verified" green shield top-right.
  * Content section: Hostel title in bold, distance pill ("0.8 km from Ghatkesar station"), star rating ("★ 4.6 (42)"), amenities icons row.
  * Bottom row: Price in bold ("₹5,500/mo"), "View Details" primary amber button.
```

---

### Screen 2: Hostel Detail & Room Selection (`HostelDetail`)
```text
Role: Senior UI/UX Designer
Context: StayNest Mobile Web App - Hostel Detail & Room Booking Screen
Design Requirements:
- Media Gallery: Swipeable hero photo carousel with dot indicators and photo counter ("1/8").
- Title Block: Hostel Name, full address with "Open in Google Maps" link, verified owner badge.
- Sticky Booking Bar at bottom of screen: Starting price ("₹5,200/month"), "Book / Enquire" full-width CTA.
- Room Selection Matrix:
  * Horizontal cards for "2 Share", "3 Share", "4 Share".
  * Each card displays: Room rent/month, daily rent option, deposit amount, and real-time live availability ("2 beds vacant" in green or "Filling Fast" in amber).
  * Room amenities checklist (Cupboard, Study Table, Balcony, Attached Geyser).
- Rules & Policies Accordion: Gate closing time (10:00 PM), guest policy, food timing.
- Location Pin: Embedded map card showing exact location pin.
```

---

### Screen 3: All-in-One Authentication (`AuthPage`)
```text
Role: Senior UI/UX Designer
Context: StayNest Mobile Auth - Multi-role OTP & Password Authentication
Design Requirements:
- Clean card with segmented tab switcher: "Guest / Student" | "Hostel Owner".
- Step 1: Mobile number / Email input with country flag (+91) and clear helper text. "Get OTP" CTA.
- Step 2: 6-digit OTP input box with auto-focus, countdown resend timer ("Resend OTP in 28s").
- Alternative option: "Login with Password instead" toggle.
- For Owners: Prompt for PG Name and City during first-time onboarding.
- Modern trustworthy typography with bank-grade safety badges.
```

---

### Screen 4: PG Owner Management Portal (`OwnerDashboard`)
```text
Role: Senior Dashboard UI/UX Designer
Context: StayNest Owner Management Console (Mobile-first responsive to desktop)
Design Requirements:
- Top Stats Bar: 4 metric summary tiles:
  1. Total Occupancy (e.g. "86% - 43/50 Beds")
  2. Fees Collected This Month ("₹2,45,000")
  3. Pending Overdue Dues ("₹38,000" in urgent red)
  4. Pending Enquiries / Move-ins ("4 Requests")
- Navigation: Horizontal icon tab-bar on mobile, collapsible left drawer on desktop:
  [Overview] [Guests] [Enquiries] [Fee Ledger] [Food Menu] [Complaints]
- Walk-in Quick Action: Floating Action Button (FAB) or prominent button "+ Add Walk-in Guest".
- Guest Roster Table/Cards: Student name, room # (e.g. "Room 204-B"), stay type, fee status badge ("Paid", "Due in 3 days", "Overdue"), and 1-click "Send WhatsApp Reminder" action.
- Fee Ledger Tab: Filter by Month, Defaulters list toggle, Export to Excel/PDF button.
```

---

### Screen 5: Resident Student Portal (`StudentDashboard`)
```text
Role: Senior Mobile App Designer
Context: StayNest Student / Tenant Stay Management
Design Requirements:
- Active Stay Card: Hostel Name, Room & Bed number, Wi-Fi password copy button, Warden emergency call button.
- Fee Due Alert Card: Next billing date, amount due, "Pay via UPI / QR" action button, transaction history toggle.
- Daily Food Card: Today's Menu breakdown (Breakfast, Lunch, Dinner). Toggle switches for "Opt-out of Dinner" with confirmation cut-off timer ("Opt out before 5:00 PM").
- Quick Services Grid:
  * "Request Leave / Outpass" (Date picker + reason)
  * "Raise Complaint" (Category dropdown: Plumbing, Wi-Fi, Food, Electricity + photo upload)
  * "Write Review"
```
