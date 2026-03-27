# StayNest

StayNest is a hostel and PG management platform with:
- React + Vite frontend in `src/`
- Django + DRF backend in `backend/`
- JWT auth with email OTP flows
- role-based dashboards for guests, owners, and admins

## Local Setup

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
python -m pip install -r backend/requirements.txt
set DJANGO_DEBUG=true
python backend/manage.py migrate
python backend/manage.py runserver
```

Frontend default URL:
- `http://127.0.0.1:5173`

Backend default URL:
- `http://127.0.0.1:8000`

## Production Build

Frontend:

```bash
npm run build
```

Backend:

```bash
python backend/manage.py migrate
python backend/manage.py ensure_admin
```

## Required Backend Env Vars

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=false`
- `DATABASE_URL`
- `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

For email OTP:
- `DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
- `DJANGO_DEFAULT_FROM_EMAIL`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `EMAIL_USE_TLS=true`

For admin bootstrap:
- `ADMIN_PHONE`
- `ADMIN_PASSWORD`
- Optional: `ADMIN_EMAIL`, `ADMIN_NAME`

## Main API Areas

- `GET /api/health/`
- `POST /api/auth/send-registration-otp/`
- `POST /api/auth/send-login-otp/`
- `POST /api/auth/register/`
- `POST /api/auth/login-otp/`
- `GET /api/auth/me/`
- `GET /api/student/overview/`
- `GET /api/owner/students/`
- `GET/POST /api/hostels/`
- `GET/POST /api/rooms/`
- `GET/POST /api/bookings/`
- `GET/POST /api/fee-ledgers/`
- `GET/POST /api/fee-payments/`
- `GET/POST /api/menus/`
- `GET/POST /api/leaves/`
- `GET/POST /api/complaints/`
- `GET/POST /api/reviews/`
- `GET /api/trust/summary/`

## Deployment

Recommended default:
- Frontend: Vercel
- Backend: Render
- Database: Postgres

Notes:
- keep `.env` secrets only in your hosting platform
- do not deploy with SQLite
- do not deploy with `DJANGO_DEBUG=true`
- rotate exposed SMTP app passwords before production

## Product Reference

The current PRD lives in [docs/StayNest-PRD.md](/c:/Users/Ajay/Desktop/StayNest/docs/StayNest-PRD.md).
