from datetime import datetime, timezone
from pathlib import Path
import os
from typing import Dict, List, Literal, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

ROOT = Path(__file__).parent
PROJECT_ROOT = ROOT.parent
DATABASE = Path(os.getenv("APPLICATION_DATABASE", PROJECT_ROOT / "application.sqlite")).resolve()
engine = create_engine(f"sqlite:///{DATABASE}", connect_args={"check_same_thread": False})
app = FastAPI(title="Internal Request Tracker")


class Base(DeclarativeBase):
    pass


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


Base.metadata.create_all(engine)


class RequestInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)


class RequestStatus(BaseModel):
    status: Literal["Open", "In Progress", "Done"]


def serialize(record: Request) -> Dict[str, object]:
    return {
        "id": record.id,
        "title": record.title,
        "description": record.description,
        "status": record.status,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


@app.get("/health")
def health() -> Dict[str, str]:
    with Session(engine) as session:
        session.execute(select(Request).limit(1))
    return {"status": "ok"}


@app.get("/api/requests")
def list_requests() -> List[Dict[str, object]]:
    with Session(engine) as session:
        records = session.scalars(select(Request).order_by(Request.created_at.desc())).all()
        return [serialize(record) for record in records]


@app.post("/api/requests", status_code=201)
def create_request(input: RequestInput) -> Dict[str, object]:
    title = input.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    now = datetime.now(timezone.utc)
    record = Request(id=str(uuid4()), title=title, description=input.description.strip() if input.description else None, status="Open", created_at=now, updated_at=now)
    with Session(engine) as session:
        session.add(record)
        session.commit()
        session.refresh(record)
        return serialize(record)


@app.patch("/api/requests/{request_id}")
def update_request(request_id: str, input: RequestStatus) -> Dict[str, object]:
    with Session(engine) as session:
        record = session.get(Request, request_id)
        if record is None:
            raise HTTPException(status_code=404, detail="request not found")
        record.status = input.status
        record.updated_at = datetime.now(timezone.utc)
        session.commit()
        session.refresh(record)
        return serialize(record)


FRONTEND_ROOT = PROJECT_ROOT / "frontend" / "dist" if (PROJECT_ROOT / "frontend" / "dist").exists() else ROOT / "static"
app.mount("/", StaticFiles(directory=FRONTEND_ROOT, html=True), name="frontend")
