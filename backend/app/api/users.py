from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate

from app.api._common import get_or_404

router = APIRouter(prefix="/api/users", tags=["Users"])


async def _get_or_404(db: AsyncSession, user_id: int) -> User:
    return await get_or_404(db, User, user_id, "user")


async def _email_taken(db: AsyncSession, email: str, exclude_id: int | None = None) -> bool:
    stmt = select(User).where(User.email == email)
    if exclude_id is not None:
        stmt = stmt.where(User.id != exclude_id)
    return (await db.scalars(stmt)).first() is not None

@router.get("", response_model=list[UserRead])
async def list_users(db: AsyncSession = Depends(get_db)):
    """GET /api/users — danh sách tất cả user."""
    return (await db.scalars(select(User).order_by(User.id))).all()

@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get /api/users/1"""
    return await _get_or_404(db,user_id)


@router.post("", response_model=UserRead, status_code = 201)
async def create_user(data: UserCreate, db: AsyncSession= Depends(get_db)):
    '''POST /api/users - tao user moi (validate emial trung lap)'''
    if await _email_taken(db, data.email):
        raise HTTPException(status_code=409, detail="email da ton tai")

    user = User(**data.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user 



@router.put("/{user_id}", response_model= UserRead)
async def update_user(user_id: int, data:UserUpdate, db: AsyncSession = Depends(get_db)):
    '''PUT /api/users/1 - chi update cac field co gui len'''
    user = await _get_or_404(db, user_id)

    fields = data.model_dump(exclude_unset= True)

    if "email" in fields and await _email_taken(db, fields["email"], exclude_id=user_id):
        raise HTTPException(status_code=409, detail="email da ton tai")

    for key, value in fields.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user



@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """DELETE /api/users/1"""
    user = await _get_or_404(db, user_id)
    await db.delete(user)
    await db.commit()
    return {"deleted": user_id}
