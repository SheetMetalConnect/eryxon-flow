# PMI Extraction Service

Extracts Product Manufacturing Information (PMI) from STEP AP242 files using OpenCASCADE.

## Features

- Extracts **dimensions** (linear, angular, radius, diameter)
- Extracts **geometric tolerances** (GD&T)
- Extracts **datums** (reference features)
- Returns structured JSON for frontend rendering

## Quick Start

### Using Docker (Recommended)

```bash
# Build the image
docker build -t pmi-extractor .

# Run the container
docker run -p 8000:8000 pmi-extractor

# Test the health endpoint
curl http://localhost:8000/health
```

### Local Development

Requires conda for pythonocc-core installation:

```bash
# Create conda environment
conda create -n pmi-extractor python=3.11
conda activate pmi-extractor

# Install pythonocc-core
conda install -c conda-forge pythonocc-core

# Install Python dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

## API Endpoints

### Health Check

```
GET /health

Response: { "status": "healthy", "service": "pmi-extractor" }
```

### Extract PMI

```
POST /extract
Content-Type: application/json

Request:
{
  "file_url": "https://storage.example.com/path/to/model.step"
}

Response:
{
  "success": true,
  "pmi": {
    "version": "1.0",
    "dimensions": [...],
    "geometric_tolerances": [...],
    "datums": [...]
  },
  "processing_time_ms": 1234,
  "file_hash": "abc123..."
}
```

## Deployment Options

### Railway

1. Connect your GitHub repository
2. Set the root directory to `services/pmi-extractor`
3. Deploy using the Dockerfile
4. Note the generated URL (e.g., `https://pmi-extractor.up.railway.app`)

### Render

1. Create a new Web Service
2. Connect your repository
3. Set:
   - Root Directory: `services/pmi-extractor`
   - Environment: Docker
4. Deploy and note the URL

### Docker Compose (Self-hosted)

```yaml
version: '3.8'
services:
  pmi-extractor:
    build: ./services/pmi-extractor
    ports:
      - "8000:8000"
    environment:
      - ALLOWED_ORIGINS=https://your-app.com
    restart: unless-stopped
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins |

## Response Schema

### Dimension

```json
{
  "id": "dim_1",
  "type": "linear",
  "value": 50.0,
  "unit": "mm",
  "tolerance": {
    "upper": 0.1,
    "lower": -0.1,
    "type": "bilateral"
  },
  "text": "50.00 ±0.10 mm",
  "position": { "x": 10, "y": 20, "z": 0 },
  "leader_points": [
    { "x": 10, "y": 20, "z": 0 },
    { "x": 25, "y": 25, "z": 0 }
  ]
}
```

### Geometric Tolerance

```json
{
  "id": "tol_1",
  "type": "flatness",
  "value": 0.05,
  "unit": "mm",
  "symbol": "⏥",
  "datum_refs": ["A"],
  "text": "⏥ 0.050 A",
  "position": { "x": 15, "y": 30, "z": 0 }
}
```

### Datum

```json
{
  "id": "datum_1",
  "label": "A",
  "position": { "x": 0, "y": 0, "z": 0 }
}
```

## Troubleshooting

### "pythonocc-core not installed"

The service requires pythonocc-core which must be installed via conda. Use the Docker image or install via conda locally.

### "No PMI data found"

Not all STEP files contain PMI data. PMI is only present in:
- STEP AP242 files with embedded PMI
- Files exported with "Include PMI" option from CAD software

### Performance

PMI extraction typically takes 1-5 seconds depending on file complexity. The service downloads the file to a temp directory, processes it, and cleans up automatically.
