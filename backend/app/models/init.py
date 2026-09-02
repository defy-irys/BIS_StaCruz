# Import all model modules so they are registered on Base.metadata.
from app.models.base import TimestampMixin  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.role import Role  # noqa: F401
from app.models.permission import Permission  # noqa: F401
from app.auth.models import RefreshToken  # noqa: F401
from app.models.resident import Resident  # noqa: F401
from app.models.household import Household  # noqa: F401
from app.models.official import Official  # noqa: F401
from app.models.blotter import Blotter  # noqa: F401
from app.models.clearance import Clearance  # noqa: F401
from app.models.certificate import Certificate  # noqa: F401
from app.models.barangay_info import BarangayInfo  # noqa: F401