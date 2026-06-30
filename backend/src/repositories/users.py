from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import User


class UserRepository:
    """
    Purpose:
        Handles all data access operations for the User entity.

    Responsibilities:
        - Retrieve users by ID or email.
        - Create new user records.
        - Update user profile and password data.

    Dependencies:
        - AsyncSession (SQLAlchemy) for database connectivity.

    Architectural constraints:
        - Email addresses must be normalized to lowercase before storage and lookup to ensure
            uniqueness.
        - Must not contain business logic (e.g., password hashing must happen in the service layer).
    """
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, user_id: UUID) -> User | None:
        """
        Purpose:
            Retrieves a user by their unique identifier.

        Responsibilities:
            - Perform a primary key lookup for the User entity.

        Inputs:
            user_id (UUID): The ID of the user.

        Outputs:
            User | None: The user object if found, otherwise None.

        Exceptions:
            None explicitly raised.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Call session.get(User, user_id).
            2. Return result.
        """
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        """
        Purpose:
            Retrieves a user by their email address.

        Responsibilities:
            - Normalize input email to lowercase.
            - Perform a filtered search for the User entity.

        Inputs:
            email (str): The user's email.

        Outputs:
            User | None: The user object if found, otherwise None.

        Exceptions:
            None explicitly raised.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Normalize input email to lowercase.
            2. Construct select query filtering by email.
            3. Execute and return scalar result.
        """
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def create(self, email: str, hashed_password: str) -> User:
        """
        Purpose:
            Creates a new user record in the database.

        Responsibilities:
            - Normalize email to lowercase.
            - Persist User entity with provided hashed password.

        Inputs:
            email (str): User email address.
            hashed_password (str): The PBKDF2 hash of the user's password.

        Outputs:
            User: The newly created user record.

        Exceptions:
            SQLAlchemy errors (e.g., IntegrityError for duplicate email).

        Side effects:
            - Persists a new record in the users table.

        Execution flow:
            1. Create User instance with lowercase email.
            2. Add entity to session.
            3 la. Commit transaction.
            4. Refresh entity to load DB defaults.
            5. Return user.
        """
        user = User(email=email.lower(), hashed_password=hashed_password)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user: User, **kwargs) -> User:
        """
        Purpose:
            Updates specified fields of an existing user record.

        Responsibilities:
            - Dynamically update entity fields based on provided keyword arguments.

        Inputs:
            user (User): The user instance to update.
            **kwargs: Fields and values to update.

        Outputs:
            User: The updated user record.

        Exceptions:
            SQLAlchemy errors during commit.

        Side effects:
            - Updates the user record in the database.

        Execution flow:
            1. Iterate over kwargs.
            2. Use setattr to update fields if they exist on the entity.
            3. Add entity to session.
            4. Commit and refresh.
            5. Return user.
        """
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_password(self, user: User, hashed_password: str) -> User:
        """
        Purpose:
            Updates a user's password hash.

        Responsibilities:
            - Update the hashed_password attribute of the User entity.

        Inputs:
            user (User): The user instance to update.
            hashed_password (str): The new PBKDF2 hash.

        Outputs:
            User: The updated user record.

        Exceptions:
            SQLAlchemy errors during commit.

        Side effects:
            - Modifies the hashed_password field in the database.

        Execution flow:
            1. Set hashed_password attribute.
            2. Commit transaction.
            3. Refresh entity.
            4. Return user.
        """
        user.hashed_password = hashed_password
        await self.db.commit()
        await self.db.refresh(user)
        return user
