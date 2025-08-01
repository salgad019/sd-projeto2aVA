from flask import Flask
from routes import routes
from database import engine
from models import Base
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)


def create_tables_with_retry():
    """Create database tables with retry logic"""
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


# Initialize database tables
create_tables_with_retry()

app.register_blueprint(routes)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7000)
