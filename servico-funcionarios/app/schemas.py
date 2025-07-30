from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserUpdate(UserBase):
    password: str = None  # Optional password update


class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class FuncionarioDisponibilidade(BaseModel):
    """Schema for staff availability response"""
    total_funcionarios: int
    funcionarios_disponiveis: int
    disponivel: bool
    funcionarios_ativos: list[UserOut]
