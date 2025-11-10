# Dockerfile
FROM python:3.11

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project files
COPY . .

# Environment
ENV PYTHONUNBUFFERED=1

# Collect static, run migrations, then start Gunicorn (binds Railway $PORT)
CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]