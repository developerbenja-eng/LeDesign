# LeDesign Pricing & Infrastructure Cost Analysis
*Last Updated: January 2026*

## Current Pricing Structure

### Individual Plans (Promotional - First 3 Months)
- **Urbanización**: $50/mes (regular $100/mes)
- **Hidráulica**: $50/mes (regular $100/mes)
- **Estructural**: $50/mes (regular $100/mes)
- **Completo**: $100/mes (regular $200/mes)

### Promotional Terms
- 7 días de prueba gratis
- 50% OFF primeros 3 meses
- Sin tarjeta de crédito requerida

---

## Infrastructure Cost Analysis (2026)

### Google Cloud Storage (GCS) - File Storage

**Standard Storage Pricing:**
- **$0.020/GB/month** (US regions)
- Network egress: ~$0.12/GB (downloads to users)
- Operations: Class A $0.05 per 10k ops, Class B $0.004 per 10k ops

**Cost-Saving Strategies:**
- Use GCS Nearline ($0.010/GB) for projects older than 30 days → **50% storage savings**
- Compress files (DWG/PDF compression) → **30-50% size reduction**
- CDN caching (Cloudflare R2 for hot files) → reduce egress costs

### Turso Database - Metadata & Auth

**Free Tier:**
- 5GB storage
- 500M row reads/month
- 10M row writes/month
- Good for: ~1,000 users with metadata/auth/settings

**Developer Plan:**
- $4.99/month (yearly)
- 25M row writes/month
- 2.5B row reads/month
- Storage included in base plan

---

## Cost Scenarios & Profitability

### Scenario 1: Individual Engineer (50GB storage)

**Infrastructure Costs:**
- GCS Storage: 50GB × $0.020 = **$1.00/month**
- GCS Egress (5GB downloads): 5 × $0.12 = **$0.60/month**
- Turso: Free tier
- **Total: ~$1.60/month per user**

**Revenue:** $50-100/month
**Gross Margin: 96-98%** ✅

---

### Scenario 2: 100 Active Users (3TB total, 30GB avg each)

**Infrastructure Costs:**
- GCS Storage: 3,000GB × $0.020 = **$60/month**
- GCS Egress (300GB): 300 × $0.12 = **$36/month**
- Turso Developer: **$4.99/month**
- **Total: ~$101/month**

**Revenue:** 100 users × $75 avg = **$7,500/month**
**Gross Margin: 98.7%** ✅

---

### Scenario 3: 500 Active Users (15TB total)

**Infrastructure Costs:**
- GCS Storage: 15,000GB × $0.020 = **$300/month**
- GCS Egress (1.5TB): 1,500 × $0.12 = **$180/month**
- Turso Scaler: **$50-100/month** (estimate)
- **Total: ~$530-580/month**

**Revenue:** 500 users × $75 avg = **$37,500/month**
**Gross Margin: 98.5%** ✅

---

## Storage Allocation Strategy

### Recommended Storage Limits

**Individual Modules** (Urbanización, Hidráulica, Estructural):
- **50 GB de almacenamiento incluido**
- Safe, conservative limit
- Enough for 25-50 medium projects

**Completo Plan:**
- **100 GB de almacenamiento incluido**
- Double the individual limit
- Handles ~50-100 projects

**Future Team Plans:**
- Team (3-10 users): 200-500 GB compartido
- Empresa (11+ users): 1TB+ personalizable

### Storage Expansion Strategy
- Additional storage available for purchase
- $5/month per additional 50GB (competitive with competitors)
- Users can upgrade storage without changing plan tier

---

## Typical Engineering Project Sizes

Based on industry averages:
- DWG/DXF files: 5-50 MB each
- Project calculations/data: 5-20 MB
- Site photos/images: 2-10 MB each
- **Complete project: 50-200 MB average**
- **Active engineer (20-50 projects): 1-10 GB typical**

---

## Competitive Comparison

### Traditional Tools (Per User/Month)
- Civil 3D: ~$250/month
- RAM Elements/ETABS: ~$250-400/month
- Bentley OpenRoads: ~$300-400/month

### LeDesign Advantage
- **Complete suite**: $100/month ($50 promotional)
- **80-90% cost savings** vs buying separate tools
- **Integrated Chilean compliance** (NCh433, NCh430, NCh691, AASHTO)
- **Cloud-based** (no expensive workstation needed)
- **AI features** (Gemini AI for terrain analysis)

---

## Key Takeaways

1. **Infrastructure costs are <2% of revenue** at current pricing
2. **Safe to offer 50-100GB per user** without financial risk
3. **"Unlimited storage" would be profitable** up to ~200GB/user (still <5% infrastructure costs)
4. **Pricing is very sustainable** with excellent gross margins (96-98%)
5. **Room for growth**: Can support 500+ users before infrastructure becomes significant cost

---

## Sources

- [Google Cloud Storage Pricing](https://cloud.google.com/storage/pricing) - January 2026
- [GCS Pricing Examples](https://cloud.google.com/storage/pricing-examples)
- [Turso Database Pricing](https://turso.tech/pricing)
- [Turso Developer Plan](https://turso.tech/blog/turso-cloud-debuts-the-new-developer-plan)
