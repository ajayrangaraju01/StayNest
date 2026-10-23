# StayNest: End-to-End Project Analysis & Backend Architecture Review

**Date:** March 2026  
**Document Version:** 1.0  
**Project:** StayNest (Hostel & PG Management Platform)

---

## 1. Executive Summary & Backend Technology Recommendation

### Should Backend Be in Django?
**Recommendation: YES, maintain and finalize on Django + Django REST Framework (DRF).**

#### Why Django is the Optimal Choice for StayNest:
1. **Relational Data Integrity:** StayNest is a complex transactional system dealing with:
   - Hostel hierarchies (Hostels -> Floors -> Rooms -> Beds)
   - Real-time bed occupancy and booking lifecycles
   - Financial fee ledgers, partial payment reconciliations, and late fee audits
   - Relational database constraints and Django `select_for_update()` / `transaction.atomic()` are essential to prevent double-booking beds or recording corrupt financial states.
2. **Ready-Made Admin Portal:** Django's built-in Admin panel provides instant, zero-code administrative tooling for StayNest ops teams to audit complaints, KYC documents, and dispute resolutions without building custom tools upfront.
3. **Existing Maturity in the Repo:** The existing backend already contains extensive Django business logic, 15 migrations, serializers, custom user models, and token-based authentication. Rewriting in Node/Go would introduce bugs and delay production without meaningful performance gains for this operational workload.
4. **Export & Async Capabilities:** Built-in support for CSV/PDF exports (ledgers, tenant registers) and natural integration with Celery / Django Q for daily automated dues checks, WhatsApp notifications, and payment reminders.

---

## 2. Frontend Page-by-Page Analysis

The frontend is a single-page React app (Vite) designed primarily with an **Android/Mobile-First** responsiveness focus (`staynest.css`).

| Page / Component | Lines | Primary Purpose & Flows | Current Strengths & Deficiencies |
| :--- | :--- | :--- | :--- |
| **`HomePage.jsx`** | ~480 | Public hostel discovery, search by locality (Narapally, Medipally, Ghatkesar), price filtering, gender filtering (Boys/Girls/Co-live), amenity chips. | **Strengths:** Clean card listing, gender-aware filtering.<br>**Deficiencies:** Filter state is purely in-memory; map view is currently a modal instead of an integrated map-first explorer. |
| **`HostelDetail.jsx`** | ~477 | Detailed listing page: photo gallery carousel, room share options (2/3/4 share), pricing, amenities, rules, map pin, and booking request submission modal. | **Strengths:** Clear room breakdown, instant request form.<br>**Deficiencies:** UI needs a cohesive modern design system (better spacing, badge typography, mobile sticky CTA). |
| **`AuthPage.jsx`** | ~708 | Multi-role authentication (Student, Owner, Admin) supporting Email/Password and OTP verification flows, password reset, profile completion. | **Strengths:** Covers OTP + password fallback across all roles.<br>**Deficiencies:** Monolithic form handler with repetitive OTP timer code; needs cleaner stepped UI. |
| **`OwnerDashboard.jsx`** | ~2,600 | Mission-control center for PG owners: 10 tabs (Overview metrics, Edit hostel details, Guest roster, Booking enquiries, Fees/Ledger, Food menu, Leaves, Complaints, Reviews, Settings). | **Strengths:** Deep functional coverage (walk-in admissions, defaulters list, CSV export, partial payments).<br>**Deficiencies:** UI styling has mixed inline CSS and lacks polished visual hierarchy; needs Stitch UI redesign. |
| **`StudentDashboard.jsx`** | ~790 | Resident portal: active stay details, room assignment, fee due alerts, payment history, food opt-out toggle, leave requests, complaint ticket logging. | **Strengths:** Compact resident utilities.<br>**Deficiencies:** Card layouts feel dense on mobile screens; action buttons need better touch ergonomics. |
| **`AdminDashboard.jsx`** | ~453 | Platform governance: owner verification approval queue, hostel listing moderation, complaint escalation resolution, user management. | **Strengths:** Direct moderation controls.<br>**Deficiencies:** Table styling is basic; needs clear workflow status indicators and quick-audit filters. |

---

## 3. Backend Architecture Analysis (`backend/`)

### Architecture Layout:
```
backend/
├── staynest_backend/          # Project configuration, URLs, JWT & CORS settings
├── accounts/                  # User accounts, Profiles (Student, Owner), OTP models
└── core/                      # Core domain logic
    ├── models.py              # 12 relational models
    ├── serializers.py         # DRF serializers
    ├── services/              # Domain services
    │   └── booking_services.py# Occupancy, fee calculations, date math
    └── api/                   # Modular API endpoints
        ├── common_views.py    # Health checks
        ├── owner_views.py     # Analytics, walk-ins, dues, exports
        ├── student_views.py   # Stay overview, dues
        ├── admin_views.py     # Moderation queues & approval
        ├── trust_views.py     # Trust scoring & review statistics
        └── viewsets.py        # Standard CRUD ModelViewSets
```

### Key Data Models & Relations:
- **`Hostel`**: Owner link, address, geo-coordinates, gender, amenities, moderation status, approval workflow.
- **`Room`**: Room numbers, share type (1-5 share), capacity, current occupancy, rent, advance deposit.
- **`Booking`**: Student link, room link, stay type (daily/monthly), check-in/out, status (pending/confirmed/checked_in/checked_out).
- **`FeeLedger` & `FeePayment`**: Monthly billing records, due date, late fees, amount paid, payment mode (UPI, Cash, Bank), payment verification.
- **`Menu` & `MealOptOut`**: Daily breakfast/lunch/dinner menus with meal-level student opt-out and headcounts.
- **`Complaint` & `Leave`**: Student requests, owner responses, admin escalation tracking.
