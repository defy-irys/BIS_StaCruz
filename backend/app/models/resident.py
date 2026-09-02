# Review/app/models/resident.py

import datetime
import enum

from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"


class CivilStatusEnum(str, enum.Enum):
    single = "single"
    married = "married"
    widowed = "widowed"
    separated = "separated"
    divorced = "divorced"


class Resident(Base, TimestampMixin):
    __tablename__ = "residents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    suffix: Mapped[str | None] = mapped_column(String(10))
    birth_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    gender: Mapped[GenderEnum] = mapped_column(Enum(GenderEnum), nullable=False)
    civil_status: Mapped[CivilStatusEnum] = mapped_column(
        Enum(CivilStatusEnum), nullable=False
    )
    contact_number: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(150))
    occupation: Mapped[str | None] = mapped_column(String(150))
    is_voter: Mapped[bool] = mapped_column(default=False, server_default="false")
    precinct_number: Mapped[str | None] = mapped_column(String(20))

    household_id: Mapped[int | None] = mapped_column(
        ForeignKey("households.id", ondelete="SET NULL"), nullable=True
    )

    household: Mapped["Household | None"] = relationship(
        "Household", back_populates="residents", foreign_keys=[household_id]
    )

    def __repr__(self) -> str:
        return f"<Resident {self.id}: {self.first_name} {self.last_name}>"