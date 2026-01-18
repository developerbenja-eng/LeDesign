# Turso Database Setup Guide

## 1. Install Turso CLI

```bash
# macOS
brew install tursodatabase/tap/turso

# Or using curl
curl -sSfL https://get.tur.so/install.sh | bash
```

## 2. Login to Turso

```bash
turso auth login
```

## 3. Create Database

```bash
# Create database in São Paulo, Brazil (closest to Chile)
turso db create caeser-civil-cad --location gru

# Alternative locations:
# - gru: São Paulo, Brazil (best for Chile)
# - scl: Santiago, Chile (if available)
# - mia: Miami, USA
```

## 4. Get Connection Details

```bash
# Get database URL
turso db show caeser-civil-cad --url

# Example output:
# libsql://caeser-civil-cad-[your-org].turso.io

# Create authentication token
turso db tokens create caeser-civil-cad

# Example output:
# eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

## 5. Update Environment Variables

Add to `.env.local`:

```bash
# Turso Production Database
TURSO_DATABASE_URL=libsql://caeser-civil-cad-[your-org].turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# Keep local for development
TURSO_DATABASE_URL_DEV=file:local.db
```

## 6. Initialize Schema

```bash
# Run schema migration
turso db shell caeser-civil-cad < schema.sql

# Or use Drizzle ORM migrations (recommended)
npm run db:push
```

## 7. Verify Connection

```bash
# Open shell
turso db shell caeser-civil-cad

# Test query
SELECT 1;

# List tables
.tables
```

## 8. Setup GCS Bucket

```bash
# Using gcloud CLI
gcloud auth login

# Create bucket for terrain data
gsutil mb -p ledesign -c STANDARD -l southamerica-west1 gs://caeser-terrain-data

# Create bucket for attachments
gsutil mb -p ledesign -c STANDARD -l southamerica-west1 gs://caeser-attachments

# Create bucket for exports (with lifecycle policy)
gsutil mb -p ledesign -c STANDARD -l southamerica-west1 gs://caeser-exports

# Set lifecycle policy for exports (delete after 7 days)
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 7}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://caeser-exports
```

## 9. Setup CORS for GCS

```bash
cat > cors.json << EOF
[
  {
    "origin": ["https://caeser-rp.online", "http://localhost:3000"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://caeser-terrain-data
gsutil cors set cors.json gs://caeser-attachments
gsutil cors set cors.json gs://caeser-exports
```

## 10. Test Setup

```bash
# Test Turso connection
npm run db:test

# Test GCS upload
npm run gcs:test
```

## Commands Reference

```bash
# List databases
turso db list

# Show database info
turso db show caeser-civil-cad

# Create replica in another region
turso db replicate caeser-civil-cad --location mia

# Backup database
turso db backup create caeser-civil-cad

# Monitor usage
turso db usage caeser-civil-cad
```
