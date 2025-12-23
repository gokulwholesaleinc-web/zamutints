# Zamutints - Auto Customization Booking Platform

## Overview
A full-stack booking and payment platform for Zamu Tints, a professional auto customization business in Chicago offering window tinting, vinyl wraps, glass replacement, and other automotive services.

## Project Structure
- `client/` - React/Vite frontend
- `server/` - Express.js backend API
- Database: PostgreSQL (Replit-managed)

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, React Router, Stripe Elements
- **Backend**: Express.js, Node.js 20
- **Database**: PostgreSQL with raw SQL queries
- **Payment**: Stripe integration

## Running the Application
- **Frontend**: Runs on port 5000 (workflow: Frontend)
- **Backend**: Runs on port 3000 (workflow: Backend Server)

## API Endpoints
All API routes are prefixed with `/api`:
- `/api/services` - Service listings
- `/api/bookings` - Booking management
- `/api/payments` - Payment processing
- `/api/auth` - Admin authentication
- `/api/admin/*` - Admin dashboard routes

## Default Admin Credentials
- Username: test1
- Password: test1

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `STRIPE_SECRET_KEY` - Stripe API key (required for payments)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

## Recent Changes
- 2024-12-23: Initial Replit environment setup
  - Configured Vite for port 5000 with host header bypass
  - Set Express trust proxy for rate limiting
  - Connected to Replit PostgreSQL database
