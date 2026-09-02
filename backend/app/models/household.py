# Review/app/models/household.py

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class Household(Base, TimestampMixin):
    __tablename__ = "households"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    household_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    head_id: Mapped[int | None] = mapped_column(
        ForeignKey("residents.id", ondelete="SET NULL"), nullable=True
    )

    head: Mapped["Resident | None"] = relationship(
        "Resident",
        foreign_keys=[head_id],
        backref="headed_household",
        post_update=True,
    )
    residents: Mapped[list["Resident"]] = relationship(
        "Resident",
        back_populates="household",
        foreign_keys="[Resident.household_id]",
    )

    def __repr__(self) -> str:
        return f"<Household {self.household_number}>"