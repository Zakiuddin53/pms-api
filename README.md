# Multi-Property PMS + Booking Engine (Backend)

A scalable **multi-tenant Property Management System (PMS)** + **Booking Engine** (BookingGini-style) built with **NestJS** and **PostgreSQL**.

This backend powers:
- **Public Booking Engine APIs** (availability search, hold booking, confirm booking)
- **PMS Admin Panel APIs** (property setup, rooms, pricing, reports)
- **Front Desk Operations APIs** (walk-in booking, check-in/out, guest management)
- Secure **Role-Based Access Control (RBAC)** for multi-property access.

---

## Tech Stack

- **Backend:** NestJS (TypeScript)
- **Database:** PostgreSQL
- **Auth:** JWT
- **RBAC:** Multi-tenant (Property-based roles)
- **ORM:** Prisma / TypeORM (choose one)

---

## Core Concepts

### Multi-Tenant Model (Property-Based Access)
This system is designed for **multiple properties** under a single platform.

✅ Users are **global**  
✅ Roles are **assigned per property** via membership table

Example: A user can be:
- Admin in Property A
- Staff in Property B

---

## Roles & Permissions (RBAC)

### Roles
| Role | Scope | Description |
|------|-------|-------------|
| **SUPER_ADMIN** | Platform-level | Manages all properties, creates property admins |
| **PROPERTY_ADMIN** | Property-level | Manages rooms/rates/bookings/staff for own property |
| **STAFF** | Property-level | Handles bookings, check-in/out, guest management |

### Permission Overview
- **SUPER_ADMIN:** Full access (`*`)
- **PROPERTY_ADMIN:**
  - PROPERTY_MANAGE
  - ROOM_MANAGE
  - RATE_MANAGE
  - BOOKING_MANAGE
  - STAFF_MANAGE
  - REPORT_VIEW
- **STAFF:**
  - BOOKING_MANAGE
  - CHECKIN_CHECKOUT
  - GUEST_MANAGE

---

## Project Phases (Backend Roadmap)

### ✅ Phase 0 — Foundation
- NestJS setup
- PostgreSQL connection
- JWT authentication
- RBAC: SUPER_ADMIN / PROPERTY_ADMIN / STAFF
- Property creation APIs

### ✅ Phase 1 — Inventory + Pricing
- Room Types CRUD
- Rooms CRUD
- Room blocks (maintenance/unavailable)
- Rate plans & rates

### ✅ Phase 2 — Booking Engine Core
- Availability API
- Booking HOLD (temporary reservation)
- Booking CONFIRM
- Booking retrieval APIs

### ✅ Phase 3 — Payments
- Payment order
- Webhook confirmation
- Auto booking confirmation after payment

### ✅ Phase 4 — Front Desk
- Walk-in bookings
- Check-in/check-out
- Guest management
- Assign room during check-in

### ✅ Phase 5 — Reports & Stats
- Occupancy
- Revenue
- Arrivals/Departures

---

## Booking Flow (How it works)

### 1) Customer selects dates + room type
Frontend calls availability API.

### 2) Customer clicks "Reserve Now"
System creates a **HOLD booking** (temporary lock for 10 minutes) to prevent double booking.

### 3) Payment (optional in early phase)
After payment webhook success:
- booking becomes `CONFIRMED`

### 4) Front desk handles operations
Staff can:
- check-in
- assign room
- checkout

---

## Folder / Module Structure

Suggested NestJS structure:

