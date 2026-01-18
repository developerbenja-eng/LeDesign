#!/bin/bash

# Download reference materials from Google Cloud Storage
# These large files are not stored in git to keep the repository lightweight

set -e

echo "📚 Downloading reference materials from GCS..."
echo ""

# Base URL for public GCS bucket
GCS_BASE="https://storage.googleapis.com/ledesign-reference-materials"

# Create directories
mkdir -p docs/reference-software/hec-ras

# Download HEC-RAS reference manuals
echo "📥 Downloading HEC-RAS reference manuals..."

files=(
  "HEC-RAS_2D_Users_Manual_v6.6.pdf"
  "HEC-RAS_Users_Manual_v6.4.1.pdf"
  "HEC-RAS_Applications_Guide_v5.0.pdf"
  "HEC-RAS_Hydraulic_Reference_Manual_v6.5.pdf"
)

for file in "${files[@]}"; do
  if [ -f "docs/reference-software/hec-ras/$file" ]; then
    echo "✓ $file (already exists)"
  else
    echo "  Downloading $file..."
    curl -L -o "docs/reference-software/hec-ras/$file" \
      "$GCS_BASE/hec-ras/$file" \
      --progress-bar
    echo "✓ $file"
  fi
done

echo ""
echo "✅ Reference materials downloaded successfully!"
echo ""
echo "Total size: ~166 MB"
echo "Location: docs/reference-software/hec-ras/"
