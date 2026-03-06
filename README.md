# StayNest Frontend (React + Vite)

This is the StayNest frontend app.

## Local Run

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Frontend Deployment (Recommended: Vercel)

1. Push this repo to GitHub.
2. Go to Vercel and import the repo.
3. Build settings:
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variables (when backend is ready), for example:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (if using a separate backend)
5. Deploy.

Every push to `main` will auto-deploy.

Alternatives: Netlify or Render static site deployment.

## Backend/API Recommendation

For a first release:
- `Node.js + Express` on Railway/Render, or
- `Next.js API routes` if you want frontend + API in one repo.

Responsibilities:
- Auth
- Bookings
- Enquiries
- Owner management
- Menu/room updates

## Database Recommendation (StayNest)

Use `PostgreSQL` via Supabase.

Why:
- Relational model fits owner -> hostel -> room -> booking flows.
- Built-in auth and storage reduce setup time.
- Free tier is enough to launch MVP.

### Starter Schema

- `users(id, name, email, role, phone)`
- `hostels(id, owner_id, name, location, address, gender, description, verified)`
- `rooms(id, hostel_id, type, price, total_beds, available_beds)`
- `menu(id, hostel_id, date, breakfast, lunch, dinner)`
- `amenities(id, hostel_id, name)`
- `hostel_photos(id, hostel_id, url, display_order)`
- `bookings(id, student_id, room_id, status, move_in_date)`
- `enquiries(id, student_id, hostel_id, message, status)`

## Images

- Supabase Storage for quick setup, or
- Cloudinary if you want automatic optimization/resizing.

## Payments

For India launch flows: Razorpay is a practical default.

## Launch Path

1. Create Supabase project.
2. Add tables and policies.
3. Integrate Supabase Auth (owner/student roles).
4. Replace mock data in [`src/data/hostels.js`](/c:/Users/Ajay/Desktop/StayNest/src/data/hostels.js) with live queries.
5. Deploy frontend on Vercel.
