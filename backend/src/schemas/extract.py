from pydantic import BaseModel


class ExtractResponse(BaseModel):
    filename: str
    text: str
