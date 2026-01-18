# LeDesign Configuration Bucket

**GCS Bucket**: `gs://ledesign-config/`
**Access**: Private - requires GCP project `ledesign` permissions

## Structure

```
gs://ledesign-config/
  ├── environments/
  │   ├── development.env       # Local development environment variables
  │   ├── production.env         # Production secrets (create when ready)
  │   └── staging.env            # Staging environment (create when needed)
  ├── service-accounts/
  │   └── earthengine-sa-key.json  # Google Earth Engine service account
  └── README.md                  # This file
```

## Usage

Team members with GCP access automatically download configs via:

```bash
npm run setup  # Fetches from gs://ledesign-config/environments/development.env
```

## Updating Configuration

When environment variables change:

```bash
# Update local .env file first, then sync to GCS
gsutil cp .env gs://ledesign-config/environments/development.env

# Or update service account key
gsutil cp earthengine-sa-key.json gs://ledesign-config/service-accounts/earthengine-sa-key.json
```

## Access Control

**Who can access:**
- Project owners (developer.benja@gmail.com)
- Project editors with `ledesign` GCP project access
- Team members you grant `Storage Object Viewer` role

**Grant access to new team member:**

```bash
# Grant read-only access to config bucket
gsutil iam ch user:teammate@example.com:objectViewer gs://ledesign-config
```

## Security Notes

- ✅ Bucket is **private** (not public like reference materials bucket)
- ✅ Requires Google Cloud authentication
- ✅ IAM controls who can read secrets
- ✅ Not tracked in git (secrets never in repository)
- ⚠️ Consider migrating to Google Secret Manager before public launch

## For Production

Before launching:

1. Create `production.env` with production secrets
2. Update deployment scripts to use production config
3. Consider Google Secret Manager for better secret rotation
4. Set up different IAM roles for prod vs dev access

## Troubleshooting

**"Access denied" errors:**
- Ensure you're authenticated: `gcloud auth login`
- Verify project: `gcloud config get-value project` (should be "ledesign")
- Ask project owner to grant you `Storage Object Viewer` role

**Missing .env after setup:**
- Check if `npm run setup` ran successfully
- Manually download: `gsutil cp gs://ledesign-config/environments/development.env .env`
