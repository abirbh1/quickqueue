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

## Backend

The `backend/` directory contains a FastAPI implementation of [`openapi.yaml`](openapi.yaml),
managed with [uv](https://docs.astral.sh/uv/), persisted via [SQLAlchemy](https://www.sqlalchemy.org/)
(`backend/src/quickqueue_backend/{db,orm,store}.py`). The frontend talks to it directly —
see `frontend/src/api/client.ts` and `VITE_API_BASE_URL`.

```bash
cd backend
uv run pytest        # run the test suite
uv run uvicorn quickqueue_backend.main:app --reload
```

- API base URL: `http://localhost:8000/api`
- Interactive docs: `http://localhost:8000/docs`
- Data is stored in a local SQLite file (`backend/quickqueue.db`, gitignored) by default and
  survives restarts. Point `DATABASE_URL` at any other SQLAlchemy-supported database (e.g.
  `postgresql+psycopg://user:pass@host/db`) to use that instead — no application code changes
  needed.
