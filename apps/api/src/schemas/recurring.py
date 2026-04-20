from pydantic import BaseModel


class RecurringTickResponse(BaseModel):
    materialized_count: int
    skipped_count: int
    errors: list[str] = []
    ran_at: str
