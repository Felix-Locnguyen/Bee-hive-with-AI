from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.farm import Farm
from app.models.user import User
from app.schemas.farm import FarmCreate, FarmRead, FarmUpdate

from app.api._common import get_or_404

router = APIRouter(prefix="/api/farms", tags=["Farms"])


async def _get_or_404(db: AsyncSession, farm_id: int) -> Farm:
    return await get_or_404(db, Farm, farm_id, "farm")

@router.get("", response_model= list[FarmRead])
async def list_farms(db: AsyncSession = Depends(get_db)):
    return (await db.scalars(
        select(Farm).order_by(Farm.id)
    )).all()


@router.get("/{farm_id}", response_model=FarmRead)
async def get_farm(farm_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, farm_id)


@router.post("", response_model= FarmRead, status_code= 201)
async def create_farm(data: FarmCreate, db: AsyncSession = Depends(get_db)):

    if data.owner_id is not None and await db.get(User, data.owner_id) is None:
        raise HTTPException(status_code=404, detail="owner_id khong ton tai")
    farm = Farm(**data.model_dump())
    db.add(farm)
    await db.commit()
    await db.refresh(farm)
    return farm


@router.put("/{farm_id}", response_model=FarmRead)
async def update_farm(farm_id:int, data: FarmUpdate, db: AsyncSession = Depends(get_db)):
    farm = await _get_or_404(db, farm_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(farm, key, value)
    await db.commit()
    await db.refresh(farm)
    return farm

@router.delete("/{farm_id}")
async def delete_farm(farm_id: int, db: AsyncSession = Depends(get_db)):
    farm = await _get_or_404(db, farm_id)
    await db.delete(farm)
    await db.commit()
    return {"deleted": farm_id}
