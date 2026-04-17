# CADEXsoft MTK Python service — local deployment.
#
# The MTK Python wheel is a licensed, non-public artifact. Drop it into
# services/cadexsoft/vendor/ before building, or provide MTK_WHEEL_URL as a
# private, pre-authenticated URL.
#
# Supported Python versions per CADEXsoft docs: 3.7 – 3.11.
FROM python:3.11-slim-bookworm

# Native runtime libs required by the MTK C++ shared objects.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgl1 \
        libglu1-mesa \
        libxrender1 \
        libxext6 \
        libgomp1 \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

# Python dependencies first for layer caching.
COPY requirements.txt /srv/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Optional MTK wheel install. Build fails gracefully into stub mode if absent —
# the service still boots so integration work can proceed without the license.
ARG MTK_WHEEL_URL=""
COPY vendor/ /tmp/vendor/
RUN set -eux; \
    if [ -n "$MTK_WHEEL_URL" ]; then \
        curl -fSL "$MTK_WHEEL_URL" -o /tmp/mtk.whl && pip install --no-cache-dir /tmp/mtk.whl; \
    elif ls /tmp/vendor/manufacturing_toolkit-*.whl >/dev/null 2>&1; then \
        pip install --no-cache-dir /tmp/vendor/manufacturing_toolkit-*.whl; \
    else \
        echo "[cadexsoft] No MTK wheel provided — service will run in stub mode."; \
    fi; \
    rm -rf /tmp/vendor /tmp/mtk.whl

# License module. Mounted at runtime via docker-compose so the wheel install can
# be cached independently of license rotations.
COPY app /srv/app

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/srv:/srv/license \
    CADEXSOFT_HOST=0.0.0.0 \
    CADEXSOFT_PORT=8891

EXPOSE 8891

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8891/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8891"]
