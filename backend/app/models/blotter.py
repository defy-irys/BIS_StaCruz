# Review/app/models/blotter.py

import datetime
import enum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class BlotterStatusEnum(str, enum.Enum):
    pending = "pending"
    resolved = "resolved"
    dismissed = "dismissed"


class Blotter(Base, TimestampMixin):
    __tablename__ = "blotter_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    complainant_id: Mapped[int] = mapped_column(
        ForeignKey("residents.id", ondelete="RESTRICT"), nullable=False
    )
    respondent_id: Mapped[int] = mapped_column(
        ForeignKey("residents.id", ondelete="RESTRICT"), nullable=False
    )
    incident_date: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[BlotterStatusEnum] = mapped_column(
        Enum(BlotterStatusEnum),
        default=BlotterStatusEnum.pending,
        server_default=BlotterStatusEnum.pending.value,
        nullable=False,
    )
    resolution: Mapped[str | None] = mapped_column(Text)

    complainant: Mapped["Resident"] = relationship(
        "Resident", foreign_keys=[complainant_id], backref="complaints_filed"
    )
    respondent: Mapped["Resident"] = relationship(
        "Resident", foreign_keys=[respondent_id], backref="complaints_received"
    )

    def __repr__(self) -> str:
        return f"<Blotter {self.id} – {self.status.value}>"