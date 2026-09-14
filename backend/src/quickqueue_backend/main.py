from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .db import SessionLocal, get_session, init_db
from .models import (
    CheckInInput,
    CheckInResult,
    PartyOut,
    PeakWindow,
    ReportSummary,
    WaitTimeStats,
)
from .orm import PartyRecord
from .seed import seed_if_empty
from .store import PartyNotFoundError, PartyNotSeatedError, ReportRange, Store


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as session:
        seed_if_empty(session)
    yield


app = FastAPI(title="QuickQueue API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store(session: Annotated[Session, Depends(get_session)]) -> Store:
    return Store(session)


StoreDep = Annotated[Store, Depends(get_store)]


def _party_to_out(party: PartyRecord) -> PartyOut:
    return PartyOut(
        id=party.id,
        name=party.name,
        phone=party.phone,
        party_size=party.party_size,
        check_in_time=party.check_in_time,
        status=party.status,
        seated_time=party.seated_time,
        table_freed_time=party.table_freed_time,
    )


@app.get("/api/queue", response_model=list[PartyOut])
def get_queue(store: StoreDep) -> list[PartyOut]:
    return [_party_to_out(p) for p in store.get_queue()]


@app.get("/api/seated", response_model=list[PartyOut])
def get_seated(store: StoreDep) -> list[PartyOut]:
    return [_party_to_out(p) for p in store.get_seated()]


@app.get("/api/wait-stats", response_model=WaitTimeStats)
def get_wait_stats(store: StoreDep) -> WaitTimeStats:
    average, last_updated = store.get_wait_stats()
    return WaitTimeStats(rolling_average_wait_minutes=average, last_updated=last_updated)


@app.post("/api/checkin", response_model=CheckInResult, status_code=status.HTTP_201_CREATED)
def check_in(payload: CheckInInput, store: StoreDep) -> CheckInResult:
    party, position, estimated_wait_minutes = store.check_in(
        payload.name, payload.phone, payload.party_size
    )
    return CheckInResult(
        party=_party_to_out(party),
        position=position,
        estimated_wait_minutes=estimated_wait_minutes,
    )


@app.post("/api/parties/{party_id}/seat", response_model=PartyOut)
def seat_party(party_id: str, store: StoreDep) -> PartyOut:
    try:
        return _party_to_out(store.seat_party(party_id))
    except PartyNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/parties/{party_id}/free", response_model=PartyOut)
def free_table(party_id: str, store: StoreDep) -> PartyOut:
    try:
        return _party_to_out(store.free_table(party_id))
    except PartyNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PartyNotSeatedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/parties/{party_id}/cancel", response_model=PartyOut)
def cancel_party(party_id: str, store: StoreDep) -> PartyOut:
    try:
        return _party_to_out(store.cancel_party(party_id))
    except PartyNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/parties/{party_id}/no-show", response_model=PartyOut)
def mark_no_show(party_id: str, store: StoreDep) -> PartyOut:
    try:
        return _party_to_out(store.mark_no_show(party_id))
    except PartyNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/parties/{party_id}/move-up", status_code=status.HTTP_204_NO_CONTENT)
def move_party_up(party_id: str, store: StoreDep) -> Response:
    try:
        store.move_up(party_id)
    except PartyNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/parties/{party_id}/move-down", status_code=status.HTTP_204_NO_CONTENT)
def move_party_down(party_id: str, store: StoreDep) -> Response:
    try:
        store.move_down(party_id)
    except PartyNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/reports", response_model=ReportSummary)
def get_report(store: StoreDep, range: ReportRange = Query("today")) -> ReportSummary:
    report = store.get_report(range)
    return ReportSummary(
        range=report["range"],
        average_wait_minutes=report["average_wait_minutes"],
        total_parties_served=report["total_parties_served"],
        peak_windows=[PeakWindow(**window) for window in report["peak_windows"]],
    )
