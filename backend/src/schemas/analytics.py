from pydantic import BaseModel


class ProjectAnalytics(BaseModel):
    project_id: str
    total_documents: int
    completed_documents: int
    total_conversations: int
    total_messages: int


class DailyQuery(BaseModel):
    date: str
    count: int


class UserAnalytics(BaseModel):
    total_documents: int
    completed_documents: int
    total_conversations: int
    total_messages: int
    daily_queries: list[DailyQuery]
