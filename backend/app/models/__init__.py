# Artha ORM models — domain-specific modules.
#
# Each submodule registers its SQLAlchemy models with Base's registry
# at import time.  Importing this package triggers all registrations,
# which is the pattern alembic/env.py uses.
#
# Consumers should import from the specific submodule:
#   from app.models.user import User
#   from app.models.enums import DocumentStatus
#   from app.models.document import Document

from app.models.agent import *  # noqa: F401, F403
from app.models.base import *  # noqa: F401, F403
from app.models.conversation import *  # noqa: F401, F403
from app.models.document import *  # noqa: F401, F403
from app.models.enums import *  # noqa: F401, F403
from app.models.user import *  # noqa: F401, F403
