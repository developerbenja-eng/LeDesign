#!/usr/bin/env python3
"""
Upload IDE Chile GeoJSON data to Turso database
"""

import json
import os
import sqlite3
import subprocess
import sys
from typing import Dict, List, Any

DATA_DIR = "data/ide-chile"
DB_NAME = "ide-chile-data"
LOCAL_DB = f"{DATA_DIR}/{DB_NAME}.db"

# Schema for storing geospatial features
SCHEMA = """
-- Drop existing tables
DROP TABLE IF EXISTS features;
DROP TABLE IF EXISTS layers;
DROP TABLE IF EXISTS properties;

-- Layers metadata
CREATE TABLE layers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_file TEXT NOT NULL,
    geometry_type TEXT,
    feature_count INTEGER DEFAULT 0,
    bbox_west REAL,
    bbox_south REAL,
    bbox_east REAL,
    bbox_north REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Features table with geometry as GeoJSON text
CREATE TABLE features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer_id TEXT NOT NULL,
    geometry_type TEXT,
    geometry TEXT,  -- GeoJSON geometry as text
    centroid_lon REAL,
    centroid_lat REAL,
    properties TEXT,  -- JSON properties
    FOREIGN KEY (layer_id) REFERENCES layers(id)
);

-- Create spatial index using centroid
CREATE INDEX idx_features_layer ON features(layer_id);
CREATE INDEX idx_features_centroid ON features(centroid_lon, centroid_lat);
CREATE INDEX idx_features_geometry_type ON features(geometry_type);

-- Full text search for properties
CREATE VIRTUAL TABLE features_fts USING fts5(
    properties,
    content='features',
    content_rowid='id'
);

-- Trigger to keep FTS in sync
CREATE TRIGGER features_ai AFTER INSERT ON features BEGIN
    INSERT INTO features_fts(rowid, properties) VALUES (new.id, new.properties);
END;
"""


def get_centroid(geometry: Dict) -> tuple:
    """Calculate centroid from GeoJSON geometry"""
    if not geometry:
        return (None, None)

    geom_type = geometry.get("type", "")
    coords = geometry.get("coordinates", [])

    if not coords:
        return (None, None)

    try:
        if geom_type == "Point":
            return (coords[0], coords[1])

        elif geom_type == "LineString":
            lons = [c[0] for c in coords]
            lats = [c[1] for c in coords]
            return (sum(lons) / len(lons), sum(lats) / len(lats))

        elif geom_type == "Polygon":
            ring = coords[0] if coords else []
            if ring:
                lons = [c[0] for c in ring]
                lats = [c[1] for c in ring]
                return (sum(lons) / len(lons), sum(lats) / len(lats))

        elif geom_type == "MultiLineString":
            all_coords = [c for line in coords for c in line]
            if all_coords:
                lons = [c[0] for c in all_coords]
                lats = [c[1] for c in all_coords]
                return (sum(lons) / len(lons), sum(lats) / len(lats))

        elif geom_type == "MultiPolygon":
            all_coords = [c for poly in coords for ring in poly for c in ring]
            if all_coords:
                lons = [c[0] for c in all_coords]
                lats = [c[1] for c in all_coords]
                return (sum(lons) / len(lons), sum(lats) / len(lats))

        elif geom_type == "MultiPoint":
            lons = [c[0] for c in coords]
            lats = [c[1] for c in coords]
            return (sum(lons) / len(lons), sum(lats) / len(lats))

    except (IndexError, TypeError):
        pass

    return (None, None)


def get_bbox(features: List[Dict]) -> tuple:
    """Calculate bounding box from features"""
    lons = []
    lats = []

    for f in features:
        centroid = get_centroid(f.get("geometry"))
        if centroid[0] is not None:
            lons.append(centroid[0])
            lats.append(centroid[1])

    if lons and lats:
        return (min(lons), min(lats), max(lons), max(lats))
    return (None, None, None, None)


def create_local_db():
    """Create local SQLite database with schema"""
    print(f"Creating local database: {LOCAL_DB}")

    # Remove existing database
    if os.path.exists(LOCAL_DB):
        os.remove(LOCAL_DB)

    conn = sqlite3.connect(LOCAL_DB)
    cursor = conn.cursor()

    # Execute schema
    cursor.executescript(SCHEMA)
    conn.commit()

    return conn


def load_geojson_files(conn: sqlite3.Connection):
    """Load all GeoJSON files into database"""
    cursor = conn.cursor()

    geojson_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".geojson")]

    total_features = 0

    for filename in sorted(geojson_files):
        filepath = os.path.join(DATA_DIR, filename)

        # Skip empty files
        if os.path.getsize(filepath) < 700:
            continue

        print(f"\nLoading: {filename}")

        try:
            with open(filepath, "r") as f:
                data = json.load(f)

            features = data.get("features", [])

            if not features:
                print(f"  No features, skipping")
                continue

            # Determine layer ID from filename
            layer_id = filename.replace(".geojson", "")

            # Get geometry type from first feature
            geom_type = None
            for feat in features:
                if feat.get("geometry"):
                    geom_type = feat["geometry"].get("type")
                    break

            # Calculate bounding box
            bbox = get_bbox(features)

            # Insert layer metadata
            cursor.execute("""
                INSERT INTO layers (id, name, source_file, geometry_type, feature_count,
                                    bbox_west, bbox_south, bbox_east, bbox_north)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (layer_id, layer_id.replace("_", " ").replace("-", " ").title(),
                  filename, geom_type, len(features),
                  bbox[0], bbox[1], bbox[2], bbox[3]))

            # Insert features in batches
            batch_size = 500
            for i in range(0, len(features), batch_size):
                batch = features[i:i + batch_size]

                for feature in batch:
                    geometry = feature.get("geometry")
                    properties = feature.get("properties", {})

                    geom_json = json.dumps(geometry) if geometry else None
                    props_json = json.dumps(properties)

                    centroid = get_centroid(geometry)
                    feat_geom_type = geometry.get("type") if geometry else None

                    cursor.execute("""
                        INSERT INTO features (layer_id, geometry_type, geometry,
                                              centroid_lon, centroid_lat, properties)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (layer_id, feat_geom_type, geom_json,
                          centroid[0], centroid[1], props_json))

                conn.commit()

            total_features += len(features)
            print(f"  Loaded {len(features)} features ({geom_type})")

        except json.JSONDecodeError as e:
            print(f"  Error parsing JSON: {e}")
        except Exception as e:
            print(f"  Error: {e}")

    return total_features


def get_db_stats(conn: sqlite3.Connection):
    """Print database statistics"""
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM layers")
    layer_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM features")
    feature_count = cursor.fetchone()[0]

    cursor.execute("SELECT id, name, feature_count, geometry_type FROM layers ORDER BY feature_count DESC")
    layers = cursor.fetchall()

    print("\n" + "=" * 60)
    print("Database Statistics")
    print("=" * 60)
    print(f"Total layers: {layer_count}")
    print(f"Total features: {feature_count}")
    print(f"\n{'Layer':<35} {'Count':>10} {'Type':<15}")
    print("-" * 60)
    for layer in layers:
        print(f"{layer[1][:35]:<35} {layer[2]:>10} {layer[3] or 'N/A':<15}")


def upload_to_turso():
    """Upload local database to Turso"""
    print("\n" + "=" * 60)
    print("Uploading to Turso")
    print("=" * 60)

    # Check if database exists on Turso
    result = subprocess.run(
        ["turso", "db", "list", "--json"],
        capture_output=True, text=True
    )

    if result.returncode == 0:
        dbs = json.loads(result.stdout)
        db_exists = any(db.get("Name") == DB_NAME for db in dbs)

        if db_exists:
            print(f"Database '{DB_NAME}' already exists. Destroying and recreating...")
            subprocess.run(["turso", "db", "destroy", DB_NAME, "--yes"], check=True)

    # Create database from local file
    print(f"Creating Turso database from {LOCAL_DB}...")
    result = subprocess.run(
        ["turso", "db", "create", DB_NAME, "--from-file", LOCAL_DB],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"Error creating database: {result.stderr}")
        return False

    print(f"Database created successfully!")

    # Get database URL
    result = subprocess.run(
        ["turso", "db", "show", DB_NAME, "--json"],
        capture_output=True, text=True
    )

    if result.returncode == 0:
        db_info = json.loads(result.stdout)
        print(f"\nDatabase URL: {db_info.get('Hostname', 'N/A')}")

    # Create auth token
    result = subprocess.run(
        ["turso", "db", "tokens", "create", DB_NAME],
        capture_output=True, text=True
    )

    if result.returncode == 0:
        print(f"Auth Token: {result.stdout.strip()}")

    return True


def main():
    print("=" * 60)
    print("IDE Chile Data - Turso Upload")
    print("=" * 60)

    # Create local database
    conn = create_local_db()

    # Load GeoJSON files
    total = load_geojson_files(conn)
    print(f"\nTotal features loaded: {total}")

    # Print stats
    get_db_stats(conn)

    conn.close()

    # Get database file size
    db_size = os.path.getsize(LOCAL_DB) / (1024 * 1024)
    print(f"\nLocal database size: {db_size:.2f} MB")

    # Upload to Turso
    if "--skip-upload" not in sys.argv:
        upload_to_turso()
    else:
        print("\nSkipping Turso upload (--skip-upload flag)")

    print(f"\nLocal database saved to: {LOCAL_DB}")


if __name__ == "__main__":
    main()
