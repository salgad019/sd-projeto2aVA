from app import database, crud, schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException


router = APIRouter()


@router.get("/health")
def health_check():
    """Check the health of the application and database connectivity"""
    return {"status": "ok", "message": "Funcionarios service is running"}


@router.post("/", response_model=schemas.UserOut)
def create(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db, user)


@router.get("/{user_id}", response_model=schemas.UserOut)
def read(user_id: int, db: Session = Depends(database.get_db)):
    db_user = crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.get("/", response_model=list[schemas.UserOut])
def list(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return crud.get_users(db, skip, limit)


@router.put("/{user_id}", response_model=schemas.UserOut)
def update(user_id: int, user: schemas.UserUpdate, db: Session = Depends(database.get_db)):
    return crud.update_user(db, user_id, user)


@router.delete("/{user_id}", response_model=schemas.UserOut)
def delete(user_id: int, db: Session = Depends(database.get_db)):
    return crud.delete_user(db, user_id)


@router.post("/login", response_model=schemas.UserOut)
def login(credentials: schemas.UserLogin, db: Session = Depends(database.get_db)):
    """Authenticate a user with email and password"""
    user = crud.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    return user
