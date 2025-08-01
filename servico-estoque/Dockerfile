FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./
COPY .env .

# Expose port
EXPOSE 6000

# Set environment variables
ENV FLASK_APP=estoque.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Run the application
CMD ["python", "estoque.py"]