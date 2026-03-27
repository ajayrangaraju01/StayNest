# StayNest Product Requirements Document (PRD)

Version: 1.0  
Date: March 7, 2026  
Owner: StayNest Product Team

## 1. Product Overview
- Product name: StayNest
- Tagline: Your Hostel. Your Home. Managed.
- Launch geography: Hyderabad (Narapally, Medipally, Ghatkesar)
- Platforms: Android app first, plus web app
- Business model: Free launch, later monetization via premium owner features

## 2. Product Goals
- Make hostel discovery and onboarding fast for guests.
- Give owners operational control (occupancy, fees, food, leaves, expenses).
- Create a portable tenant trust profile across hostels.
- Build transparent dispute workflows with admin oversight.

## 3. User Personas
- Hostel Owner: Lists and operates one or multiple hostels.
- Guest/Hosteler: Searches, books, pays fees, manages food/leave.
- Admin: Verifies users/listings, moderates disputes/reviews, governs trust flags.

## 4. Scope
### 4.1 MVP (Phase 1)
- OTP login for owner and guest
- Owner listing + admin approval flow
- Hostel discovery and booking request flow
- Room inventory basics
- Fee ledger (manual record + pending amount)
- Food opt-out and leave tracking

### 4.2 Post-MVP
- Trust score system
- Bad tenant reporting + dispute resolution
- Online payments and receipts
- Expense tracker + P&L
- Map search, reviews, analytics, announcements

## 5. Functional Requirements

## 5.1 Authentication and Verification
### Student
- FR-AUTH-STU-01: Login/register via OTP mobile verification.
- FR-AUTH-STU-02: Capture profile: full name, age, gender, college/company.
- FR-AUTH-STU-03: Capture ID verification payload (store masked identity info only).
- FR-AUTH-STU-04: Emergency contact and mandatory profile photo.
- FR-AUTH-STU-05: Account status states: Active, Suspended, Flagged.

### Owner
- FR-AUTH-OWN-01: OTP mobile verification is mandatory.
- FR-AUTH-OWN-02: Capture full name and business name.
- FR-AUTH-OWN-03: Upload verification docs (property/rental proof + ID proof).
- FR-AUTH-OWN-04: Capture payout method (bank account or UPI).
- FR-AUTH-OWN-05: Account states: Pending Verification, Verified, Suspended.

### Rules
- FR-AUTH-RULE-01: Unverified phone numbers cannot access core features.
- FR-AUTH-RULE-02: Listings are hidden until admin verification.
- FR-AUTH-RULE-03: Student profile details are shown to owner only after join request.

## 5.2 Owner Module
### Hostel Profile
- FR-OWN-HOSTEL-01: Maintain hostel identity, address, area, city, pincode.
- FR-OWN-HOSTEL-02: Store map pin and nearby landmarks.
- FR-OWN-HOSTEL-03: Configure hostel type (Boys/Girls/Co-Live).
- FR-OWN-HOSTEL-04: Require minimum 5 photos.
- FR-OWN-HOSTEL-05: Set rules, description, and public contact number.

### Room Management
- FR-OWN-ROOM-01: Manage room types (Single, 2/3/4/5 share).
- FR-OWN-ROOM-02: Set rent, total beds, occupancy per room type.
- FR-OWN-ROOM-03: Assign students to specific rooms.
- FR-OWN-ROOM-04: Mark room under maintenance.
- FR-OWN-ROOM-05: Auto-update vacancy on check-in/check-out.

### Student Management
- FR-OWN-STU-01: View all resident students and room assignments.
- FR-OWN-STU-02: Add walk-in students.
- FR-OWN-STU-03: Check-in/check-out and room transfer.
- FR-OWN-STU-04: View student verification status.
- FR-OWN-STU-05: View prior StayNest payment behavior summary.

### Fee Ledger (Core)
- FR-OWN-FEE-01: Set student-specific due dates.
- FR-OWN-FEE-02: Record payments by mode (cash/UPI/bank).
- FR-OWN-FEE-03: Support partial payments and pending balance.
- FR-OWN-FEE-04: View monthly history and defaulter summary.
- FR-OWN-FEE-05: Send WhatsApp reminders from ledger.
- FR-OWN-FEE-06: Export monthly ledger PDF/Excel.
- FR-OWN-FEE-07: Configure late fee policy.

### Food Management
- FR-OWN-FOOD-01: Weekly menu planning by meal/day.
- FR-OWN-FOOD-02: Override with today’s menu.
- FR-OWN-FOOD-03: Real-time meal count after opt-outs.
- FR-OWN-FOOD-04: Monthly food expense and per-student cost.

### Leave and Absence
- FR-OWN-LEAVE-01: View leave calendar and return dates.
- FR-OWN-LEAVE-02: Exclude absent students from meal count.
- FR-OWN-LEAVE-03: Notify owners on leave status changes.

### Expense Tracker
- FR-OWN-EXP-01: Track monthly expenses by category.
- FR-OWN-EXP-02: Show monthly P&L and period comparison.

### Bad Tenant Reporting
- FR-OWN-FLAG-01: File complaint with reason and evidence upload.
- FR-OWN-FLAG-02: Reasons include fee defaulter, absconded, damage, misconduct, criminal.
- FR-OWN-FLAG-03: Complaint visibility restricted to verified owners + admin.
- FR-OWN-FLAG-04: Notify student and allow dispute submission.
- FR-OWN-FLAG-05: Admin decision is final authority.

### Owner Notifications
- FR-OWN-NOTIF-01: Booking requests
- FR-OWN-NOTIF-02: Leave updates
- FR-OWN-NOTIF-03: Meal opt-out updates
- FR-OWN-NOTIF-04: Fee reminder delivery and fee received events
- FR-OWN-NOTIF-05: Disputes and new reviews

## 5.3 Student Module
### Profile
- FR-STU-PRO-01: Maintain profile with personal, academic/work details.
- FR-STU-PRO-02: Show verification state and trust score.
- FR-STU-PRO-03: Display current hostel and payment history.

### Discovery
- FR-STU-DISC-01: Search by area and landmark.
- FR-STU-DISC-02: Filter by gender, budget, room type, amenities, distance, availability.
- FR-STU-DISC-03: Sort by price/rating/distance/newest.
- FR-STU-DISC-04: Support map pins and detailed hostel pages.

### Booking and Joining
- FR-STU-BOOK-01: Send join request with message.
- FR-STU-BOOK-02: Owner accept/reject workflow.
- FR-STU-BOOK-03: Confirm move-in with deposit visibility.
- FR-STU-BOOK-04: Auto-link student to owner dashboard after confirmation.

### Fee Management
- FR-STU-FEE-01: View dues, due dates, and month-wise history.
- FR-STU-FEE-02: Online payment integration (Razorpay/PhonePe).
- FR-STU-FEE-03: Generate and download payment receipt PDF.
- FR-STU-FEE-04: Reminder cadence at D-3, D-1, and due date.

### Food Opt-Out (Core)
- FR-STU-FOOD-01: Meal-wise opt-out toggles.
- FR-STU-FOOD-02: Time cutoff rules for each meal.
- FR-STU-FOOD-03: Multi-day opt-out.
- FR-STU-FOOD-04: Owner count updates in real time.

### Leave Management
- FR-STU-LEAVE-01: Leave request with dates and reason.
- FR-STU-LEAVE-02: Auto meal opt-out during leave.
- FR-STU-LEAVE-03: Cancel or return early.

### Trust Score and History
- FR-STU-TRUST-01: Student views own score and factors.
- FR-STU-TRUST-02: Owners view score during request evaluation.
- FR-STU-TRUST-03: Student can view/dispute complaints.
- FR-STU-TRUST-04: Badge for sustained on-time payments.

### Ratings and Reviews
- FR-STU-REV-01: Review enabled after minimum 1 month stay.
- FR-STU-REV-02: Multi-criteria rating and text review.
- FR-STU-REV-03: Owner can reply; deletion only by admin moderation policy.

### Student Notifications
- FR-STU-NOTIF-01: Fee reminders and payment confirmations
- FR-STU-NOTIF-02: Booking status updates
- FR-STU-NOTIF-03: Menu updates
- FR-STU-NOTIF-04: Complaint/dispute status updates

## 5.4 Admin Module
- FR-ADM-01: Operational dashboard (hostels, students, bookings, flagged users).
- FR-ADM-02: Approve/reject owner verification and listing publication.
- FR-ADM-03: Resolve complaints/disputes with evidence review.
- FR-ADM-04: Suspend/ban accounts.
- FR-ADM-05: Moderate reviews and send announcements.
- FR-ADM-06: View payment events for dispute support.

## 6. Trust Score Specification
### Positive
- On-time payment: +10/month
- Fully verified profile: +20
- Long stay stability: +5/month
- No owner complaints: +10/3 months

### Negative
- Late payment: -5
- Very late (>15 days): -15
- Complaint raised: -20 (pending)
- Complaint confirmed by admin: -40
- Absconded: -100 and account flagged

### Bands
- 80-100: Excellent (green)
- 60-79: Good (blue)
- 40-59: Average (yellow)
- <40: Flagged (red)

## 7. Non-Functional Requirements
### Performance
- NFR-PERF-01: App loads in <= 3 seconds on 4G median conditions.
- NFR-PERF-02: Android performance target: 2GB RAM devices.
- NFR-PERF-03: Offline fallback for essential owner views (current students, today’s menu).

### Security and Privacy
- NFR-SEC-01: Encrypt sensitive data at rest and in transit.
- NFR-SEC-02: Never store full Aadhaar number; store masked/tokenized data only.
- NFR-SEC-03: Payment data processed by payment gateway only.
- NFR-SEC-04: Role-based access control for owner/student/admin data boundaries.
- NFR-SEC-05: Periodic backups and restore test schedule.

### Legal
- NFR-LEGAL-01: Terms for tenant reporting and owner responsibility.
- NFR-LEGAL-02: Dispute process policy and SLAs.
- NFR-LEGAL-03: Refund policy clarity (platform facilitation vs owner liability).

## 8. Integrations
- SMS/OTP: MSG91 or Twilio
- WhatsApp: Business API
- Push: FCM/Expo notifications
- Payments: Razorpay (primary), PhonePe optional
- Maps: Google Maps API
- Storage: Supabase Storage

## 9. Recommended Tech Stack
- Mobile: React Native (Expo)
- Web: React.js
- Backend and DB: Supabase (Postgres + Auth + Storage + Realtime)
- Hosting: Vercel (web), Expo/EAS (mobile)

## 10. Data Model (Initial)
- users(id, role, name, phone, status, verification_state, trust_score)
- student_profiles(user_id, age, gender, college_company, emergency_contact, photo_url)
- owner_profiles(user_id, business_name, payout_method, verification_docs)
- hostels(id, owner_id, name, address, area, city, pincode, gender_type, description, rules, contact_number, geo)
- hostel_photos(id, hostel_id, url, display_order)
- rooms(id, hostel_id, type, monthly_rent, total_beds, occupied_beds, is_maintenance)
- bookings(id, hostel_id, student_id, room_id, status, deposit_amount, move_in_date, move_out_date)
- fee_ledger(id, hostel_id, student_id, month, amount_due, amount_paid, due_date, late_fee, status)
- fee_payments(id, fee_ledger_id, amount, mode, paid_at, receipt_url, razorpay_ref)
- menus(id, hostel_id, date, breakfast, lunch, dinner, is_override)
- meal_opt_outs(id, hostel_id, student_id, meal_type, date, status)
- leaves(id, hostel_id, student_id, start_date, end_date, reason, status)
- expenses(id, hostel_id, category, amount, expense_date, notes)
- complaints(id, hostel_id, owner_id, student_id, reason, status, admin_decision)
- complaint_evidence(id, complaint_id, file_url, submitted_by)
- reviews(id, hostel_id, student_id, rating_cleanliness, rating_food, rating_owner, rating_facilities, rating_value, text, status)
- notifications(id, user_id, type, title, body, channel, status, created_at)

## 11. Milestones
- Phase 1 (3 months): MVP foundation and pilot launch
- Phase 2 (2 months): Trust/disputes and operational automation
- Phase 3 (2 months): Payments, map search, reviews, analytics
- Phase 4: Multi-city scale and premium monetization

## 12. KPIs
- Listing-to-booking conversion rate
- Owner verification turnaround time
- Monthly active students and owners
- On-time payment rate
- Average trust score trend
- Dispute resolution SLA adherence
- 30-day retention (student and owner)

## 13. Risks and Mitigations
- Risk: Verification fraud
- Mitigation: Mandatory document checks and admin approval pipeline

- Risk: Complaint misuse by owners
- Mitigation: Evidence requirement + student dispute rights + admin final review

- Risk: Payment disputes
- Mitigation: Immutable ledger entries, payment reference IDs, downloadable receipts

- Risk: Slow owner adoption
- Mitigation: Start with high-frequency pain points (fees, food counts, leave)
