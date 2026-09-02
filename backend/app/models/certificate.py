# Review/app/models/certificate.py

import datetime
import enum

from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class CertificateTypeEnum(str, enum.Enum):
    residency = "residency"
    indigency = "indigency"
    good_moral = "good_moral"
    business = "business"
    others = "others"


class Certificate(Base, TimestampMixin):
    __tablename__ = "certificates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resident_id: Mapped[int] = mapped_column(
        ForeignKey("residents.id", ondelete="RESTRICT"), nullable=False
    )
    certificate_type: Mapped[CertificateTypeEnum] = mapped_column(
        Enum(CertificateTypeEnum), nullable=False
    )
    purpose: Mapped[str] = mapped_column(String(300), nullable=False)
    reference_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    issued_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)

    resident: Mapped["Resident"] = relationship("Resident", backref="certificates")

    def __repr__(self) -> str:
        return f"<Certificate {self.reference_number} ({self.certificate_type.value})>"