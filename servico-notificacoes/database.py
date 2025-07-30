from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL database URL
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@notificacoes-db:5432/notificacoes_db")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def salvar_notificacao(notificacao):
    """Save notification to PostgreSQL database"""
    db = SessionLocal()
    try:
        db.add(notificacao)
        db.commit()
        db.refresh(notificacao)
        return notificacao
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
