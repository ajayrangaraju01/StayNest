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

## Backend (Django + DRF)

The backend lives in `backend/` and uses JWT auth.

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

## Product Document

Detailed PRD is available at [`docs/StayNest-PRD.md`](/c:/Users/Ajay/Desktop/StayNest/docs/StayNest-PRD.md).

## Backend (Django + DRF)

The backend now lives in `backend/`.

### Setup (Local)

```bash
python -m pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py runserver
```

### API

- Health check: `GET /api/health/`
- Hostels: `GET/POST /api/hostels/`
- Rooms: `GET/POST /api/rooms/`
- Bookings: `GET/POST /api/bookings/`
- Users: `GET/POST /api/users/`
- Auth register: `POST /api/auth/register/`
- Auth login: `POST /api/auth/login/`
- Auth refresh: `POST /api/auth/refresh/`
- Auth me: `GET /api/auth/me/`

### Deployment (Cheap + Best Default)

Backend: Render (free/low-cost) + Postgres  
Frontend: Vercel (free)

Required backend env vars:
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOWED_HOSTS=<your-backend-domain>`
- `CORS_ALLOWED_ORIGINS=<your-frontend-domain>`
- `DATABASE_URL=<render-postgres-url>`
