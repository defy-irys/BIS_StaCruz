# Review/app/models/official.py

import datetime
import enum

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class OfficialPositionEnum(str, enum.Enum):
    punong_barangay = "punong_barangay"
    barangay_kagawad = "barangay_kagawad"
    sk_chairperson = "sk_chairperson"
    barangay_secretary = "barangay_secretary"
    barangay_treasurer = "barangay_treasurer"


class Official(Base, TimestampMixin):
    __tablename__ = "officials"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resident_id: Mapped[int] = mapped_column(
        ForeignKey("residents.id", ondelete="RESTRICT"), nullable=False
    )
    position: Mapped[OfficialPositionEnum] = mapped_column(
        Enum(OfficialPositionEnum), nullable=False
    )
    term_start: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    term_end: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")

    resident: Mapped["Resident"] = relationship("Resident")

    def __repr__(self) -> str:
        return f"<Official {self.position.value} (Resident {self.resident_id})>"