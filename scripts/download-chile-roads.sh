#!/bin/bash

# Download Chile Road Surface Data from HeiGIT/HDX
# Source: https://data.humdata.org/dataset/chile-road-surface-data
# License: Open Data Commons Open Database License (ODbL)

DATA_DIR="$(dirname "$0")/../data/chile-roads"
mkdir -p "$DATA_DIR"

echo "=============================================="
echo "Chile Road Surface Data Downloader"
echo "=============================================="
echo ""
echo "Source: HeiGIT / Humanitarian Data Exchange"
echo "Data: Mapillary-derived road surface classification"
echo "Coverage: ~440,900 km of roads in Chile"
echo ""

# GeoPackage is smaller (609 MB vs 1.3 GB for GeoJSON)
GPKG_URL="https://downloads.ohsome.org/hdx/mapillary_road_surface/heigit_chl_roadsurface_lines.gpkg"
GPKG_FILE="$DATA_DIR/chile_road_surface.gpkg"

if [ -f "$GPKG_FILE" ]; then
    echo "File already exists: $GPKG_FILE"
    echo "Delete it first if you want to re-download."
    exit 0
fi

echo "Downloading GeoPackage (609 MB)..."
echo "URL: $GPKG_URL"
echo ""

curl -L --progress-bar -o "$GPKG_FILE" "$GPKG_URL"

if [ $? -eq 0 ]; then
    echo ""
    echo "Download complete!"
    echo "File: $GPKG_FILE"
    echo "Size: $(du -h "$GPKG_FILE" | cut -f1)"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run filter-roads-biobio"
    echo "  2. Or use QGIS to explore the data"
else
    echo "Download failed!"
    exit 1
fi
