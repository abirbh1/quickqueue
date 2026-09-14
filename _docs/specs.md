# QuickQueue — Restaurant Waitlist Manager Specification

## 1. Overview
QuickQueue is a lightweight, single-location restaurant waitlist manager. Customers join the
queue themselves via QR code check-in, and the restaurant manager gets a live, web-based view
of the queue with wait-time tracking and basic reporting. No seating assignment or SMS
notifications in v1 — the focus is a simple, reliable queue.

## 2. Primary User
- **Restaurant manager**: views and manages the live queue, adjusts entries, and pulls basic
  reports (average wait, party count, peak times).

## 3. How Parties Join
- Customers self-check-in via a QR code posted at the entrance, which opens a simple web form
  on their phone.
- Check-in form captures: name, phone number (optional), party size.
- On submission, the party is added to the queue and shown their position.

## 4. Core Features (v1)
1. **Live queue view** (manager-facing)
   - List of waiting parties in order of arrival
   - Each entry shows: name, party size, check-in time, elapsed wait, estimated wait
   - Manager can remove a party (seated / no-show / cancelled) and reorder if needed
2. **Self-check-in** (customer-facing)
   - QR code → web form → confirmation with queue position and estimated wait
3. **Wait time estimation**
   - Calculated as a simple rolling average of the last N completed table turnover times
     (time from "seated" to "table freed"), recalculated as parties are seated
4. **Basic reporting** (manager-facing)
   - Average wait time (day/week)
   - Total parties served
   - Peak wait-time windows

## 5. Out of Scope (v1)
- SMS/push notifications when a table is ready
- Table/seating assignment logic
- Reservations or online booking integration
- Multi-location support
- Payment or POS integration

## 6. Platform
- Web app, accessed via browser — no native app required
- Manager view: optimized for tablet/desktop at the host stand
- Customer view: optimized for mobile browser (post-QR-scan)

## 7. Data Model (sketch)
**Party**
- id
- name
- phone (optional)
- party_size
- check_in_time
- status (waiting / seated / cancelled / no_show)
- seated_time (nullable)
- table_freed_time (nullable)

**WaitTimeStats**
- rolling_average_wait (derived from recent completed turnovers)
- last_updated

## 8. Future Enhancements (post-v1)
- SMS notifications when table is ready
- Table/seating assignment and floor plan view
- Multi-location support for restaurant groups
- Customer-facing live wait estimate (before check-in)

## 9. Name
**QuickQueue** — chosen to reflect the two core ideas: fast self-service check-in (QR-based)
and simple queue tracking, without overpromising features (like notifications or seating)
that aren't in v1.
