# Review/app/models/barangay_info.py

from sqlalchemy import CheckConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.mixins import TimestampMixin


class BarangayInfo(Base, TimestampMixin):
    __tablename__ = "barangay_info"

    id: Mapped[int] = mapped_column(primary_key=True, default=1, autoincrement=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    contact_number: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(150))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    mission: Mapped[str | None] = mapped_column(Text)
    vision: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint("id = 1", name="single_row_check"),
    )

    def __repr__(self) -> str:
        return f"<BarangayInfo {self.name}>"