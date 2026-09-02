"""Add core domain models

Revision ID: 3ab08f6787b9
Revises: 5845fedfe6c4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "3ab08f6787b9"
down_revision: Union[str, None] = "5845fedfe6c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ---------- Barangay ----------
    op.create_table(
        "barangay_info",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("contact_number", sa.String(20)),
        sa.Column("email", sa.String(150)),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("mission", sa.Text()),
        sa.Column("vision", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
        "id = 1",
        name="single_row_check",
),
        sa.PrimaryKeyConstraint("id"),
    )

    # ---------- Households (NO FK YET) ----------
    op.create_table(
        "households",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("household_number", sa.String(20), nullable=False, unique=True),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("head_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # ---------- Residents ----------
    op.create_table(
        "residents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("middle_name", sa.String(100)),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("suffix", sa.String(10)),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("gender", sa.Enum("male", "female", name="genderenum"), nullable=False),
        sa.Column(
            "civil_status",
            sa.Enum(
                "single",
                "married",
                "widowed",
                "separated",
                "divorced",
                name="civilstatusenum",
            ),
            nullable=False,
        ),
        sa.Column("contact_number", sa.String(20)),
        sa.Column("email", sa.String(150)),
        sa.Column("occupation", sa.String(150)),
        sa.Column("is_voter", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("precinct_number", sa.String(20)),
        sa.Column("household_id", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["households.id"],
            ondelete="SET NULL",
        ),
    )

    # ---------- Add circular FK afterwards ----------
    op.create_foreign_key(
        "fk_households_head_id_residents",
        "households",
        "residents",
        ["head_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ---------- Blotter ----------
    op.create_table(
        "blotter_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("complainant_id", sa.Integer(), nullable=False),
        sa.Column("respondent_id", sa.Integer(), nullable=False),
        sa.Column("incident_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "resolved", "dismissed", name="blotterstatusenum"),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("resolution", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["complainant_id"], ["residents.id"]),
        sa.ForeignKeyConstraint(["respondent_id"], ["residents.id"]),
    )

    # ---------- Certificates ----------
    op.create_table(
        "certificates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resident_id", sa.Integer(), nullable=False),
        sa.Column(
            "certificate_type",
            sa.Enum(
                "residency",
                "indigency",
                "good_moral",
                "business",
                "others",
                name="certificatetypeenum",
            ),
            nullable=False,
        ),
        sa.Column("purpose", sa.String(300), nullable=False),
        sa.Column("reference_number", sa.String(50), nullable=False, unique=True),
        sa.Column("issued_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"]),
    )

    # ---------- Clearances ----------
    op.create_table(
        "clearances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resident_id", sa.Integer(), nullable=False),
        sa.Column("purpose", sa.String(300), nullable=False),
        sa.Column("reference_number", sa.String(50), nullable=False, unique=True),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "denied", name="clearancestatusenum"),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("issued_date", sa.Date()),
        sa.Column("valid_until", sa.Date()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"]),
    )

    # ---------- Officials ----------
    op.create_table(
        "officials",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resident_id", sa.Integer(), nullable=False),
        sa.Column(
            "position",
            sa.Enum(
                "punong_barangay",
                "barangay_kagawad",
                "sk_chairperson",
                "barangay_secretary",
                "barangay_treasurer",
                name="officialpositionenum",
            ),
            nullable=False,
        ),
        sa.Column("term_start", sa.Date(), nullable=False),
        sa.Column("term_end", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"]),
    )


def downgrade() -> None:
    op.drop_table("officials")
    op.drop_table("clearances")
    op.drop_table("certificates")
    op.drop_table("blotter_entries")
    op.drop_constraint("fk_households_head_id_residents", "households", type_="foreignkey")
    op.drop_table("residents")
    op.drop_table("households")
    op.drop_table("barangay_info")