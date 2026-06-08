from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Conversation, Message


class MessageRepository:
    """
    Purpose:
        Handles persistence and retrieval of Message entities.

    Responsibilities:
        - Retrieve messages scoped by project (via conversation join).
        - Update message metadata for feedback loops.

    Dependencies:
        - SQLAlchemy AsyncSession for database access

    Architectural constraints:
        - All message access must be verified against project ownership.
        - Metadata is stored as JSON; updates must be handled as full-object replacements.
    """
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_for_project(self, message_id: UUID, project_id: UUID) -> Message | None:
        """
        Purpose:
            Retrieve a specific message while verifying it belongs to the given project.

        Responsibilities:
            - Join Message with Conversation to validate project isolation.

        Inputs:
            message_id (UUID): Unique identifier of the message.
            project_id (UUID): ID of the project for access control.

        Outputs:
            Message | None: The message entity if found and validated, else None.

        Exceptions:
            None explicitly raised.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Construct select query joining Message and Conversation.
            2. Filter by message_id and project_id.
            3. Return the single result or None.
        """
        result = await self.db.execute(
            select(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Message.id == message_id, Conversation.project_id == project_id)
        )
        return result.scalar_one_or_none()

    async def update_feedback(
        self,
        message: Message,
        rating: str,
        comment: str | None,
    ) -> Message:
        """
        Purpose:
            Record user feedback on a specific assistant response.

        Responsibilities:
            - Update the JSON metadata field with feedback data.

        Inputs:
            message (Message): The message entity to update.
            rating (str): "up" or "down" rating.
            comment (str | None): Optional user comment.

        Outputs:
            Message: The updated message entity.

        Exceptions:
            SQLAlchemy errors during commit.

        Side effects:
            Modifies the metadata column of a message row.

        Execution flow:
            1. Extract existing metadata or initialize empty dict.
            2. Insert feedback object into metadata.
            3. Reassign metadata to the entity to trigger SQLAlchemy change tracking.
            4. Commit and refresh.
            5. Return message.
        """
        metadata = dict(message.metadata_ or {})
        metadata["feedback"] = {
            "rating": rating,
            "comment": comment,
        }
        message.metadata_ = metadata
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message
