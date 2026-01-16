# Surface Management API Routes

Simplified surface management API routes migrated from leleCAD to LeDesign.

## Overview

These routes provide CRUD operations for survey datasets and generated surfaces within projects. The implementation uses:

- **@ledesign/terrain** - For triangulation, interpolation types, and point processing
- **@ledesign/db** - For database operations
- **@/lib/auth-middleware** - For authentication
- **@/types/user** - For User and Project types

## Database Tables

The following tables were added to support surface management:

### `survey_datasets`

Stores survey point datasets used for surface generation.

```sql
CREATE TABLE survey_datasets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_filename TEXT,
  source_format TEXT,
  point_count INTEGER NOT NULL DEFAULT 0,
  bounds_json TEXT,
  statistics_json TEXT,
  crs TEXT NOT NULL DEFAULT 'EPSG:32719',
  points_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

### `generated_surfaces`

Stores generated triangulated surfaces.

```sql
CREATE TABLE generated_surfaces (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id TEXT REFERENCES survey_datasets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  method TEXT NOT NULL DEFAULT 'delaunay',
  config_json TEXT,
  surface_json TEXT,
  metrics_json TEXT,
  breakline_sources TEXT,
  status TEXT NOT NULL DEFAULT 'generating',
  error_message TEXT,
  compute_time_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

## API Endpoints

### 1. List Datasets and Surfaces

**GET** `/api/projects/[id]/surfaces`

Query parameters:
- `type` (optional): Filter by type - `datasets`, `surfaces`, or `all` (default)

**Response:**
```json
{
  "success": true,
  "datasets": [
    {
      "id": "dataset-id",
      "projectId": "project-id",
      "name": "Survey Dataset 1",
      "pointCount": 150,
      "bounds": { "minX": 0, "maxX": 100, "minY": 0, "maxY": 100, "minZ": 0, "maxZ": 50 },
      "crs": "EPSG:32719",
      "status": "ready",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "surfaces": [
    {
      "id": "surface-id",
      "projectId": "project-id",
      "datasetId": "dataset-id",
      "name": "Generated Surface 1",
      "method": "delaunay",
      "status": "ready",
      "computeTimeMs": 1234,
      "createdAt": "2024-01-15T10:05:00Z"
    }
  ]
}
```

### 2. Create Dataset

**POST** `/api/projects/[id]/surfaces`

**Body:**
```json
{
  "action": "create_dataset",
  "name": "My Survey Dataset",
  "description": "Points from field survey",
  "sourceFilename": "survey.csv",
  "sourceFormat": "csv",
  "crs": "EPSG:32719",
  "points": [
    { "id": "P1", "x": 10.5, "y": 20.3, "z": 45.2, "code": "IP" },
    { "id": "P2", "x": 15.2, "y": 25.1, "z": 46.8, "code": "IP" }
  ],
  "bounds": { "minX": 10.5, "maxX": 15.2, "minY": 20.3, "maxY": 25.1, "minZ": 45.2, "maxZ": 46.8 },
  "statistics": { "pointCount": 2, "elevationMean": 46.0, "elevationStdDev": 0.8 }
}
```

**Response:**
```json
{
  "success": true,
  "dataset": { /* dataset object */ }
}
```

### 3. Create Surface (Manual)

**POST** `/api/projects/[id]/surfaces`

**Body:**
```json
{
  "action": "create_surface",
  "name": "Existing Ground Surface",
  "datasetId": "dataset-id",
  "method": "delaunay",
  "surface": {
    "vertices": [
      { "x": 10.5, "y": 20.3, "z": 45.2 },
      { "x": 15.2, "y": 25.1, "z": 46.8 }
    ],
    "triangles": [[0, 1, 2], [1, 2, 3]],
    "bounds": { "minX": 10.5, "maxX": 15.2, "minY": 20.3, "maxY": 25.1, "minZ": 45.2, "maxZ": 46.8 }
  },
  "metrics": {
    "rmse": 0.05,
    "mae": 0.03,
    "r2": 0.98
  },
  "status": "ready"
}
```

### 4. Generate Surface (Automatic)

**POST** `/api/projects/[id]/surfaces/generate`

Automatically generates a triangulated surface from points using Delaunay triangulation.

**Body:**
```json
{
  "name": "Auto-Generated Surface",
  "method": "delaunay",
  "points": [
    { "id": "P1", "x": 10.5, "y": 20.3, "z": 45.2 },
    { "id": "P2", "x": 15.2, "y": 25.1, "z": 46.8 },
    { "id": "P3", "x": 12.0, "y": 22.0, "z": 45.8 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "surfaceId": "surface-id",
  "datasetId": "dataset-id",
  "surface": {
    "id": "surface-id",
    "name": "Auto-Generated Surface",
    "method": "delaunay",
    "vertexCount": 3,
    "triangleCount": 1,
    "bounds": { "minX": 10.5, "maxX": 15.2, "minY": 20.3, "maxY": 25.1, "minZ": 45.2, "maxZ": 46.8 }
  },
  "metrics": {
    "rmse": 0.04,
    "mae": 0.03,
    "r2": 0.95,
    "pointCount": 3
  },
  "computeTimeMs": 156
}
```

### 5. Update Dataset

**PUT** `/api/projects/[id]/surfaces`

**Body:**
```json
{
  "action": "update_dataset",
  "id": "dataset-id",
  "name": "Updated Dataset Name",
  "description": "Updated description",
  "status": "ready"
}
```

### 6. Update Surface

**PUT** `/api/projects/[id]/surfaces`

**Body:**
```json
{
  "action": "update_surface",
  "id": "surface-id",
  "name": "Updated Surface Name",
  "status": "ready"
}
```

### 7. Delete Dataset

**DELETE** `/api/projects/[id]/surfaces?type=dataset&id=dataset-id`

Deletes a dataset. Returns error if surfaces depend on this dataset.

**Response:**
```json
{
  "success": true,
  "message": "Dataset deleted"
}
```

Or if there are dependencies:
```json
{
  "error": "Cannot delete dataset with dependent surfaces",
  "dependentSurfaces": ["surface-id-1", "surface-id-2"]
}
```

### 8. Delete Surface

**DELETE** `/api/projects/[id]/surfaces?type=surface&id=surface-id`

**Response:**
```json
{
  "success": true,
  "message": "Surface deleted"
}
```

## Simplified Features

This implementation is a simplified version of the leleCAD surface routes. The following features were removed (can be added later):

- **AI Analysis** - Terrain analysis using Google Gemini AI
- **Method Recommendation** - AI-powered interpolation method selection
- **Quality Validation** - AI-powered surface quality assessment
- **Satellite Detection** - Feature detection from satellite imagery
- **DEM Services** - Integration with IDE Chile DEM services
- **IDE Breaklines** - Automatic breakline extraction from government data

These features can be re-added incrementally by:
1. Installing the necessary dependencies
2. Adding the surface-ai functions from @ledesign/terrain
3. Updating the generate route to include AI analysis options

## Core Functionality Preserved

The following core features are fully functional:

- Survey dataset management (create, read, update, delete)
- Generated surface management (create, read, update, delete)
- Delaunay triangulation using @ledesign/terrain
- Point statistics and bounds calculation
- Dependency checking (prevent dataset deletion if surfaces reference it)
- Quality metrics estimation
- Surface export (vertices, triangles, bounds)

## Usage Example

```typescript
// 1. Create a dataset from survey points
const createDatasetResponse = await fetch(`/api/projects/${projectId}/surfaces`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create_dataset',
    name: 'Field Survey Jan 2024',
    points: surveyPoints,
    crs: 'EPSG:32719'
  })
});

const { dataset } = await createDatasetResponse.json();

// 2. Generate surface from points
const generateResponse = await fetch(`/api/projects/${projectId}/surfaces/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Existing Ground Surface',
    method: 'delaunay',
    points: surveyPoints
  })
});

const { surfaceId, surface, metrics } = await generateResponse.json();

// 3. List all surfaces
const listResponse = await fetch(`/api/projects/${projectId}/surfaces?type=all`);
const { datasets, surfaces } = await listResponse.json();

// 4. Delete a surface
await fetch(`/api/projects/${projectId}/surfaces?type=surface&id=${surfaceId}`, {
  method: 'DELETE'
});
```

## Migration Notes

### From leleCAD

The original leleCAD implementation included:
- AI-powered terrain analysis and method recommendations
- Satellite imagery feature detection
- IDE Chile DEM and breakline integration
- Advanced quality validation

These features have been removed for simplicity but can be incrementally added back.

### Database Changes

Run migrations to create the new tables:

```typescript
import { runMigrations } from '@ledesign/db';

await runMigrations();
```

The migration will create `survey_datasets` and `generated_surfaces` tables automatically.

## Testing

To test the routes:

```bash
# Start the development server
npm run dev

# Test with curl
curl -X POST http://localhost:4000/api/projects/PROJECT_ID/surfaces/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Surface",
    "points": [
      {"x": 0, "y": 0, "z": 10},
      {"x": 10, "y": 0, "z": 11},
      {"x": 5, "y": 10, "z": 12}
    ]
  }'
```

## Future Enhancements

Planned features to add:

1. **AI Integration** - Add back terrain analysis and method recommendations
2. **Satellite Detection** - Integrate Google Earth Engine for feature detection
3. **IDE Chile Services** - Connect to government DEM and breakline APIs
4. **Breakline Support** - Allow manual and automatic breakline constraints
5. **Advanced Interpolation** - Add IDW and Kriging methods
6. **Quality Validation** - Cross-validation and error analysis
7. **Export Formats** - DWG, DXF, GeoJSON, LandXML export
8. **Visualization** - 3D surface preview using Three.js
