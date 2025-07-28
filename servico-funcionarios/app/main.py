from app import route
from app.database import Base, engine
from fastapi import FastAPI
import time
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events"""
    # Startup
    max_retries = 30
    retry_interval = 2

    for attempt in range(max_retries):
        try:
            logger.info(
                f"Attempting to create database tables (attempt {attempt + 1}/{max_retries})")
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully!")
            break
        except Exception as e:
            logger.warning(f"Failed to create tables: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
            else:
                logger.error(
                    "Failed to create database tables after all retries")
                raise

    yield

    # Shutdown (cleanup code can go here if needed)
    logger.info("Application shutdown")


app = FastAPI(title="Funcionarios Microservice", lifespan=lifespan)
app.include_router(route.router, tags=["Funcionarios"])
