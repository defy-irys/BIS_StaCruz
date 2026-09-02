# Review/app/models/clearance.py

import datetime
import enum

from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class ClearanceStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    denied = "denied"


class Clearance(Base, TimestampMixin):
    __tablename__ = "clearances"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resident_id: Mapped[int] = mapped_column(
        ForeignKey("residents.id", ondelete="RESTRICT"), nullable=False
    )
    purpose: Mapped[str] = mapped_column(String(300), nullable=False)
    reference_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    status: Mapped[ClearanceStatusEnum] = mapped_column(
        Enum(ClearanceStatusEnum),
        default=ClearanceStatusEnum.pending,
        server_default=ClearanceStatusEnum.pending.value,
        nullable=False,
    )
    issued_date: Mapped[datetime.date | None] = mapped_column(Date)
    valid_until: Mapped[datetime.date | None] = mapped_column(Date)

    resident: Mapped["Resident"] = relationship("Resident", backref="clearances")

    def __repr__(self) -> str:
        return f"<Clearance {self.reference_number} – {self.status.value}>"