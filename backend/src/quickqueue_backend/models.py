from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

PartyStatus = Literal["waiting", "seated", "cancelled", "no_show"]
ReportRange = Literal["today", "week"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PartyOut(CamelModel):
    id: str
    name: str
    phone: str | None = None
    party_size: int
    check_in_time: datetime
    status: PartyStatus
    seated_time: datetime | None
    table_freed_time: datetime | None


class CheckInInput(CamelModel):
    name: str
    phone: str | None = None
    party_size: int = Field(ge=1)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped


class CheckInResult(CamelModel):
    party: PartyOut
    position: int
    estimated_wait_minutes: int


class WaitTimeStats(CamelModel):
    rolling_average_wait_minutes: float
    last_updated: datetime


class PeakWindow(CamelModel):
    hour_label: str
    count: int


class ReportSummary(CamelModel):
    range: ReportRange
    average_wait_minutes: float
    total_parties_served: int
    peak_windows: list[PeakWindow]


class ErrorDetail(BaseModel):
    detail: str
