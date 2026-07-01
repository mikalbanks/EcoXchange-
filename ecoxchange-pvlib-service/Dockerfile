# Build context is the REPO ROOT (see docker-compose.yml) so the image can
# install the canonical engine from ../verification-engine alongside the service.
FROM python:3.11-slim

WORKDIR /app

# curl is used by the docker-compose healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# 1. Install Engine A (the canonical verification engine). This pulls the unified
#    pvlib>=0.15 and the shared scientific stack.
COPY verification-engine/ ./verification-engine/
RUN pip install --no-cache-dir ./verification-engine

# 2. Install the service's own deps (pvlib pin matches A) and copy its code.
COPY ecoxchange-pvlib-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ecoxchange-pvlib-service/src/ ./src/

EXPOSE 3004

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3004"]
