# CAD Processing Service

Server-side CAD file processing using OpenCASCADE (pythonocc-core). Extracts geometry and PMI/MBD data from STEP, IGES, and BREP files.

## Features

- **Geometry extraction**: Tessellated meshes (vertices, normals, indices) in base64 format
- **PMI extraction**: Dimensions, geometric tolerances (GD&T), and datums from STEP AP242
- **Multi-format support**: STEP, IGES, BREP
- **API key authentication**: Secure access with configurable API keys
- **Thumbnail generation**: Optional PNG thumbnail of the model
- **Portainer-ready**: Docker Compose stack for easy self-hosting

## Quick Start

### Using Docker Compose (Recommended)

```bash
cd services/pmi-extractor

# Generate an API key
export API_KEYS=$(openssl rand -hex 32)

# Deploy
docker-compose up -d

# Test the health endpoint
curl http://localhost:8000/health
```

### Using Docker

```bash
# Build the image
docker build -t cad-processor .

# Run with API key authentication
docker run -p 8000:8000 \
  -e API_KEYS="your-api-key-here" \
  -e REQUIRE_AUTH=true \
  cad-processor

# Test (with API key)
curl -H "X-API-Key: your-api-key-here" http://localhost:8000/health
```

### Local Development

Requires conda for pythonocc-core installation:

```bash
# Create conda environment
conda create -n cad-processor python=3.11
conda activate cad-processor

# Install pythonocc-core
conda install -c conda-forge pythonocc-core=7.7.2

# Install Python dependencies
pip install -r requirements.txt

# Run the service (auth disabled for development)
REQUIRE_AUTH=false python main.py
```

## API Endpoints

### Health Check

```
GET /health

Response:
{
  "status": "healthy",
  "service": "cad-processor",
  "version": "2.0.0",
  "auth_required": true,
  "auth_configured": true
}
```

### Service Info

```
GET /info

Response:
{
  "service": "cad-processor",
  "version": "2.0.0",
  "supported_formats": ["step", "stp", "iges", "igs", "brep"],
  "capabilities": {
    "geometry_extraction": true,
    "pmi_extraction": true,
    "thumbnail_generation": true
  },
  "limits": {
    "max_file_size_mb": 100
  }
}
```

### Process CAD File

```
POST /process
X-API-Key: your-api-key-here
Content-Type: application/json

Request:
{
  "file_url": "https://storage.example.com/path/to/model.step",
  "file_name": "model.step",
  "include_geometry": true,
  "include_pmi": true,
  "generate_thumbnail": false,
  "thumbnail_size": 256
}

Response:
{
  "success": true,
  "geometry": {
    "meshes": [
      {
        "vertices_base64": "...",
        "normals_base64": "...",
        "indices_base64": "...",
        "vertex_count": 1234,
        "face_count": 456,
        "color": [0.29, 0.56, 0.89]
      }
    ],
    "bounding_box": {
      "min": [0, 0, 0],
      "max": [100, 50, 25],
      "center": [50, 25, 12.5],
      "size": [100, 50, 25]
    },
    "total_vertices": 1234,
    "total_faces": 456
  },
  "pmi": {
    "version": "1.0",
    "dimensions": [...],
    "geometric_tolerances": [...],
    "datums": [...]
  },
  "thumbnail_base64": null,
  "file_hash": "abc123...",
  "processing_time_ms": 2500
}
```

### Extract PMI Only (Legacy)

```
POST /extract
X-API-Key: your-api-key-here
Content-Type: application/json

Request:
{
  "file_url": "https://storage.example.com/path/to/model.step"
}
```

This endpoint is maintained for backwards compatibility. It calls `/process` with `include_geometry=false`.

## Authentication

The service supports API key authentication via the `X-API-Key` header.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEYS` | (none) | Comma-separated list of valid API keys |
| `REQUIRE_AUTH` | `true` | Set to `false` to disable authentication |

### Generating API Keys

```bash
# Generate a secure random key
openssl rand -hex 32

# Example output: a3f2d7e8c1b4a5f6e7d8c9b0a1f2e3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0
```

### Multiple Keys

You can configure multiple API keys for different clients:

```bash
API_KEYS="key1,key2,key3"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `API_KEYS` | (none) | Comma-separated API keys |
| `REQUIRE_AUTH` | `true` | Enable/disable authentication |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |
| `ALLOWED_URL_DOMAINS` | (none) | Optional: restrict file URLs to specific domains |
| `MAX_FILE_SIZE_MB` | `100` | Maximum file size in MB |
| `ENABLE_DOCS` | `true` | Enable Swagger/OpenAPI docs at `/docs` |

## Security Configuration

### CORS

For production deployments, always restrict CORS to your application domains:

```bash
ALLOWED_ORIGINS="https://app.example.com,https://admin.example.com"
```

Using `*` is convenient for development but should be avoided in production.

### URL Domain Restrictions (Optional)

By default, the service accepts file URLs from any domain since it's already protected by API key authentication. For additional security, you can restrict allowed domains:

```bash
ALLOWED_URL_DOMAINS="supabase.co,your-storage.example.com"
```

When set, only URLs from matching domains (including subdomains) will be accepted.

### API Key Security

- API keys are compared using constant-time comparison to prevent timing attacks
- Generate keys with sufficient entropy: `openssl rand -hex 32`
- Rotate keys periodically
- Use different keys for different clients/environments

## Deployment Options

### Portainer Stack

1. In Portainer, go to Stacks → Add Stack
2. Copy the contents of `docker-compose.yml`
3. Add environment variables:
   - `API_KEYS`: Your generated API key(s)
   - `ALLOWED_ORIGINS`: Your app domain(s) (e.g., `https://app.eryxon.eu`)
4. Deploy the stack

### Railway

1. Connect your GitHub repository
2. Set the root directory to `services/pmi-extractor`
3. Add environment variables:
   - `API_KEYS`: Your API key(s)
   - `REQUIRE_AUTH`: `true`
4. Deploy using the Dockerfile

### Render

1. Create a new Web Service
2. Connect your repository
3. Set:
   - Root Directory: `services/pmi-extractor`
   - Environment: Docker
4. Add environment variables and deploy

### Docker Compose (Self-hosted)

```yaml
version: '3.8'
services:
  cad-processor:
    build: ./services/pmi-extractor
    ports:
      - "8000:8000"
    environment:
      - API_KEYS=your-secure-key-here
      - REQUIRE_AUTH=true
      - ALLOWED_ORIGINS=https://your-app.com
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4G
```

## Response Schemas

### MeshData

```json
{
  "vertices_base64": "base64-encoded Float32Array",
  "normals_base64": "base64-encoded Float32Array",
  "indices_base64": "base64-encoded Uint32Array",
  "vertex_count": 1234,
  "face_count": 456,
  "color": [0.29, 0.56, 0.89]
}
```

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

### Geometric Tolerance (GD&T)

Per ASME Y14.5 / ISO 1101 standards:

```json
{
  "id": "tol_1",
  "type": "position",
  "value": 0.05,
  "unit": "mm",
  "symbol": "⌖",
  "modifier": "Ⓜ",
  "zone_modifier": "⌀",
  "datum_refs": ["A", "B", "C"],
  "text": "⌖ ⌀ 0.050 Ⓜ | A | B | C",
  "position": { "x": 15, "y": 30, "z": 0 }
}
```

**Supported GD&T symbols:**
- Form: ⏥ (flatness), ⏤ (straightness), ○ (circularity), ⌭ (cylindricity)
- Profile: ⌒ (line profile), ⌓ (surface profile)
- Orientation: ∥ (parallelism), ⊥ (perpendicularity), ∠ (angularity)
- Location: ⌖ (position), ◎ (concentricity), ⌯ (symmetry)
- Runout: ↗ (circular runout), ↗↗ (total runout)

**Material modifiers:** Ⓜ (MMC), Ⓛ (LMC), Ⓢ (RFS), Ⓟ (projected), Ⓕ (free state), Ⓣ (tangent plane)

### Datum

```json
{
  "id": "datum_1",
  "label": "A",
  "position": { "x": 0, "y": 0, "z": 0 }
}
```

## Frontend Integration

### Configure Environment

Add to your `.env`:

```bash
VITE_CAD_SERVICE_URL="https://your-cad-service.example.com"
VITE_CAD_SERVICE_API_KEY="your-api-key-here"
```

### Use the Hook

```tsx
import { useCADProcessing } from '@/hooks/useCADProcessing';

function MyComponent() {
  const { processCAD, isProcessing } = useCADProcessing();

  const handleUpload = async (fileUrl: string, fileName: string) => {
    const result = await processCAD(fileUrl, fileName, {
      includeGeometry: true,
      includePMI: true,
    });

    if (result.success) {
      // Use result.geometry and result.pmi
    }
  };
}
```

### Pass to STEPViewer

```tsx
<STEPViewer
  url={fileUrl}
  serverGeometry={result.geometry}
  pmiData={result.pmi}
/>
```

## Troubleshooting

### "pythonocc-core not installed"

The service requires pythonocc-core which must be installed via conda. Use the Docker image or install via conda locally.

### "Invalid API key"

Ensure you're passing the correct API key in the `X-API-Key` header. Check that `API_KEYS` environment variable is set correctly.

### "No PMI data found"

Not all STEP files contain PMI data. PMI is only present in:
- STEP AP242 files with embedded PMI
- Files exported with "Include PMI" option from CAD software

### "No geometry found"

The CAD file may be empty or corrupted. Try opening it in a CAD viewer to verify.

### Performance

- Geometry extraction typically takes 1-5 seconds depending on model complexity
- PMI extraction adds minimal overhead (~100-500ms)
- Large files (>50MB) may take 10-30 seconds
- Consider enabling thumbnail generation for preview purposes

## License

BSL 1.1 - See main project LICENSE file.
