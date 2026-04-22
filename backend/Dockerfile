FROM python:3.12-slim-bookworm

# ffmpeg required for WebM → WAV audio conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN adduser --disabled-password --gecos "" appuser

# Copy backend source into /app — this IS the working directory
COPY . /app

WORKDIR /app

RUN pip install --no-cache-dir -r requirements.txt

USER appuser

EXPOSE 8000

# Run as "main:app" from /app (the backend directory itself)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
