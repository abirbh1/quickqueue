# QuickQueue

QuickQueue is a lightweight, single-location restaurant waitlist manager. Customers
self-check-in via a QR code, and the restaurant manager gets a live, web-based view of the
queue with wait-time tracking and basic reporting.

See the full specification in [`_docs/specs.md`](_docs/specs.md).

## Frontend

The `frontend/` directory contains the React + TypeScript UI (manager queue view,
customer self-check-in, and reporting). There is no backend yet — all data lives in
a mocked API client (`frontend/src/api/client.ts`) backed by `localStorage`, so
changes made in one browser tab are reflected live in any other open tab.

```bash
cd frontend
npm install
npm run dev
```

- Manager view: `http://localhost:5173/`
- Customer self-check-in (what the QR code on the manager view points to):
  `http://localhost:5173/checkin`
