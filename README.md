
# Digital Life Lessons — Server

Express.js + MongoDB backend API for the Digital Life Lessons platform — a place to create, store, and share meaningful life lessons and personal growth insights.

## Live URL
https://digital-life-lessons-server-abw1.onrender.com

## Client Repository
https://github.com/Muhatarima/digital-life-lessons-client

## Purpose
This server powers authentication, lesson CRUD operations, favorites, likes, comments, reports, Stripe payments, and admin moderation for the Digital Life Lessons platform.

## Tech Stack
- Express.js
- Native MongoDB Driver (MongoDB Atlas)
- Better Auth (email/password + Google OAuth)
- Stripe (Checkout, test mode)

## npm Packages Used
- express
- mongodb
- cors
- dotenv
- better-auth
- stripe
- nodemon (dev dependency)

## Environment Variables (`.env`)
```

PORT=5000
MONGODB_URI=your_mongodb_uri
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=your_server_url
CLIENT_URL=your_client_url
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## API Routes Overview

### Auth
- All routes under `/api/auth/*` — handled by Better Auth

### Lessons
- `POST /api/lessons` — create a lesson
- `GET /api/lessons` — get all public lessons
- `GET /api/lessons/my/:email` — get lessons by creator email
- `GET /api/lessons/:id` — get single lesson
- `PATCH /api/lessons/:id` — update a lesson
- `DELETE /api/lessons/:id` — delete a lesson
- `PATCH /api/lessons/:id/like` — toggle like on a lesson

### Favorites
- `POST /api/favorites` — add to favorites
- `DELETE /api/favorites/:userId/:lessonId` — remove from favorites
- `GET /api/favorites/:userId` — get user's favorites

### Comments
- `POST /api/comments` — post a comment
- `GET /api/comments/:lessonId` — get comments for a lesson

### Reports
- `POST /api/reports` — report a lesson

### User Stats
- `GET /api/users/stats/:userId` — get lesson/favorite counts for a user

### Stripe
- `POST /api/create-checkout-session` — start Stripe checkout
- `GET /api/verify-payment/:sessionId` — verify payment and upgrade user

### Home Page Data
- `GET /api/home/featured` — featured lessons
- `GET /api/home/top-contributors` — top contributors of the week
- `GET /api/home/most-saved` — most saved lessons

### Admin
- `GET /api/admin/stats` — platform-wide stats
- `GET /api/admin/users` — all users with lesson counts
- `PATCH /api/admin/users/:id/role` — promote/demote user role
- `DELETE /api/admin/users/:id` — delete a user
- `GET /api/admin/lessons` — all lessons (any visibility)
- `PATCH /api/admin/lessons/:id/feature` — toggle featured status
- `PATCH /api/admin/lessons/:id/review` — mark lesson as reviewed
- `GET /api/admin/reports` — grouped reported lessons
- `DELETE /api/admin/reports/:lessonId/ignore` — clear reports for a lesson

## Getting Started
```bash
npm install
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Author
Muhatarima — HAAB
