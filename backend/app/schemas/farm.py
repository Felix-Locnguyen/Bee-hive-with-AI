from datetime import date, datetime
from pydantic import BaseModel, Field

class FarmCreate(BaseModel):
    name: str = Field(min_length= 2, max_length= 120)
    address: str = Field(default="", max_length= 200)
    established: date | None = None
    owner_id: int | None = None

class FarmUpdate(BaseModel):
    name: str | None= Field(default=None, min_length= 2, max_length= 120)
    address: str | None= Field(default=None, max_length= 200)
    established: date | None = None
    owner_id: int | None = None


class FarmRead(BaseModel):
    id:int
    name: str
    address: str
    established: date | None 
    owner_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}