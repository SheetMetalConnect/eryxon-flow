# PMI Extraction Service Dockerfile
#
# Uses conda to install pythonocc-core with OpenCASCADE dependencies
#
# Build: docker build -t pmi-extractor .
# Run:   docker run -p 8000:8000 pmi-extractor

FROM continuumio/miniconda3:latest

WORKDIR /app

# Install pythonocc-core via conda (includes OpenCASCADE)
RUN conda install -c conda-forge python=3.11 pythonocc-core=7.7.2 -y && \
    conda clean -afy

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY extractor.py .
COPY supabase_client.py .
COPY test_pmi_extraction.py .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
