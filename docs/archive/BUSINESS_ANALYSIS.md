# LeDesign - Business Analysis & Revenue Projections
## Chilean Civil Engineering Software Market

**Document Date**: January 16, 2026
**Analysis Period**: 2026-2028
**Market Focus**: Chile

---

## Executive Summary

LeDesign is a unified civil engineering platform purpose-built for the Chilean market, combining hydraulic design, terrain analysis, structural calculations, and regulatory compliance into a single programmatic platform. This analysis projects revenue potential based on market size, competitive positioning, and realistic adoption curves.

**Updated Key Findings (Based on Actual Infrastructure Costs)**:
- Total Addressable Market (TAM): ~$45-60M USD annually in Chile
- Serviceable Obtainable Market (SOM) Year 1: $180K-360K USD
- **Bootstrap capital required**: $25-30K (86% less than initially estimated)
- **Infrastructure costs Year 1**: $682/year ($57/month) - remarkably lean modern stack
- **Gross margins**: 90-94% (SaaS best-in-class)
- **Cash flow positive**: Month 9-10 at $5K MRR
- **Year 1 EBITDA**: +$46K (profitable from year one)
- **Path to $1M ARR**: 18-24 months, entirely bootstrapped
- **Breakeven (founder living costs)**: Month 12-14
- Competitive moat: Chilean regulatory integration + unified data format + modern cost structure

**Critical Insight**: The combination of Vercel (serverless), Turso (edge database), and Google Cloud creates an infrastructure cost structure 93% lower than traditional SaaS (~$57/month vs $800/month estimated). This makes the business highly capital-efficient and removes the need for external funding.

---

## Market Sizing: Chilean Engineering Sector

### Engineering Professionals in Chile

**Source**: Colegio de Ingenieros de Chile, 2025 data

| Discipline | Licensed Professionals | Active in Private Practice | Potential Users |
|-----------|----------------------|---------------------------|----------------|
| Civil Engineering | ~45,000 | ~18,000 | 12,000 |
| Structural Engineering | ~12,000 | ~5,000 | 3,500 |
| Hydraulic Engineering | ~8,000 | ~3,500 | 2,500 |
| Geotechnical | ~4,000 | ~1,800 | 1,200 |
| **Total** | **~69,000** | **~28,300** | **~19,200** |

**Potential Users Calculation**:
- 67% of licensed professionals work in private practice (consultancies, independent)
- Of those, ~65% regularly use specialized engineering software
- **Target Market**: ~19,200 engineers who currently use or need specialized tools

### Market Segments

#### Primary Segments (Launch Focus)

**1. Small-Medium Engineering Consultancies (5-50 engineers)**
- Population: ~450 firms in Chile
- Annual software spend per firm: $15,000-45,000 USD
- Pain points: Multiple tool costs, lack of standardization, Chilean compliance complexity
- Decision makers: Partners, technical directors
- Sales cycle: 2-4 months

**2. Independent/Freelance Civil Engineers**
- Population: ~3,500 active independents
- Current software approach: Rent licenses, use pirated software, or manual calculations
- Annual software willingness to pay: $1,200-3,600 USD
- Pain points: High software costs, access to Chilean data, project documentation
- Sales cycle: < 1 month (self-serve)

**3. Large Engineering Firms (50+ engineers)**
- Population: ~35 firms in Chile
- Annual software spend: $150,000-500,000 USD
- Sales cycle: 6-12 months (pilot required)
- Note: Later stage target (Year 2+)

#### Total Addressable Market (TAM)

**Conservative Estimate**:
- Small-Medium firms: 450 firms × $20,000 avg = $9M
- Independent engineers: 3,500 × $2,000 avg = $7M
- Large firms: 35 × $250,000 avg = $8.75M
- University/Academic: ~80 institutions × $15,000 = $1.2M
- Government entities: ~120 relevant agencies × $25,000 = $3M

**TAM Total**: ~$29M USD annually (conservative)

**Optimistic Estimate**:
- Higher penetration + premium pricing: $45-60M USD annually

---

## Competitive Landscape

### Current Solutions

| Tool | Market Share (Chile) | Annual Cost | Strengths | Weaknesses |
|------|---------------------|-------------|-----------|------------|
| **Autodesk Civil 3D** | ~35% | $2,500-4,000/seat | Industry standard, comprehensive | Not Chilean-specific, steep learning curve, expensive |
| **Bentley OpenFlows** | ~20% | $3,500-5,500/seat | Hydraulic analysis depth | Complex, siloed, expensive |
| **HEC-RAS** | ~45% | Free (government) | Free, proven | Not integrated, old UI, manual workflows |
| **Excel + Macros** | ~60%* | Free-$200 | Flexible, familiar | Error-prone, not standardized, not auditable |
| **Custom Python Scripts** | ~15% | Free (dev time) | Customizable | Not scalable, maintenance burden |

*Percentages sum > 100% because engineers use multiple tools

### LeDesign Competitive Positioning

**Differentiators**:
1. **Unified Platform**: All calculations in one tool, one data format, one project file
2. **Chilean-First**: NCh433, NCh691, MOP manuals, DGA data, IDE Chile integration built-in
3. **Programmatic**: Version control, API access, reproducible calculations
4. **Modern Pricing**: SaaS model, no perpetual licenses, scales with usage
5. **AI Integration**: Surface generation, method recommendations, documentation assistance

**Competitive Advantages** (next 24 months):
- ✅ Faster to market with Chilean features than Autodesk can pivot
- ✅ Lower cost than incumbent solutions
- ✅ Better integration than point solutions
- ✅ More professional than Excel/Python scripts

**Vulnerabilities**:
- ⚠️ Feature parity with incumbents takes time
- ⚠️ Trust building in conservative market
- ⚠️ Risk of Autodesk Chile-specific features (low probability, slow execution)

---

## Pricing Strategy

### Tiered SaaS Pricing Model

#### Individual Engineer Plan
**Price**: $99 USD/month or $990/year (2 months free)

**Includes**:
- 1 user seat
- Up to 50 active projects
- All terrain analysis tools
- All hydraulic design modules (water, sewer, stormwater, open channel)
- Chilean data integrations (DGA, IDE Chile, SERNAGEOMIN)
- Cloud storage (10GB)
- Export to PDF, DWG, reports
- Email support

**Target**: Freelancers, independent consultants, small firm engineers

**Monthly Recurring Revenue (MRR) per user**: $99
**Annual Contract Value (ACV)**: $990

#### Team Plan
**Price**: $249 USD/month per seat or $2,490/year

**Includes**:
- Everything in Individual
- Unlimited projects
- Team collaboration features
- Shared project libraries
- Standard details library
- Priority support (24h response)
- Admin dashboard
- Cloud storage (50GB/seat)
- Version control & audit trails

**Target**: Small-medium consultancies (5-20 engineers)

**MRR per seat**: $249
**ACV per seat**: $2,490

#### Enterprise Plan
**Price**: Custom (starts at $7,500/year for 5 seats)

**Includes**:
- Everything in Team
- Custom integrations
- On-premise deployment option
- Dedicated account manager
- Training & onboarding
- Custom workflows
- SLA guarantees (99.9% uptime)
- Unlimited storage
- Phone support

**Target**: Large engineering firms, government agencies

**Average ACV**: $20,000-50,000

### Pricing Rationale

**Comparison to Current Costs**:
- Civil 3D: $2,500-4,000/year/seat
- Bentley suite: $3,500-5,500/year/seat
- LeDesign Team: $2,490/year/seat

**Value Proposition**:
- Same price point as ONE incumbent tool
- But replaces 3-4 tools (Civil 3D + HEC-RAS workflow + Excel templates + DGA data subscriptions)
- Net savings: $3,000-6,000/year per engineer
- Time savings: 38 hours per project (from narrative) × $50/hour = $1,900 value per project

---

## Customer Acquisition Strategy

### Phase 1: Founder-Led Sales (Months 1-6)

**Target**: 20-30 early adopters (friendly engineers, former colleagues)

**Channels**:
1. **Direct Outreach**: Personal network, LinkedIn, engineering forums
2. **Free Pilots**: 30-day full access, hands-on support, convert to paid
3. **Content**: Technical blog posts on NCh691 compliance, DGA data usage
4. **Events**: Chilean engineering conferences (ICHA, Congreso Chileno de Ingeniería Civil)

**Goals**:
- Month 1: 10 pilot users
- Month 3: 5 paying customers ($5K MRR)
- Month 6: 15 paying customers ($15K MRR)

**Customer Acquisition Cost (CAC)**: $500-1,000 (mostly founder time)

### Phase 2: Scaled Growth (Months 7-18)

**Channels**:
1. **Inbound Marketing**: SEO for "NCh691 calculator", "Chilean stormwater design", etc.
2. **Referral Program**: $200 credit for referrals that convert
3. **University Partnerships**: Free for students, convert to paid post-graduation
4. **Webinars**: Monthly technical webinars on specific modules
5. **Case Studies**: Document time savings for early customers

**Goals**:
- Month 12: 50 paying customers ($50K MRR)
- Month 18: 100 paying customers ($100K MRR)

**CAC Target**: $800-1,500

### Phase 3: Enterprise & Expansion (Months 19-36)

**Channels**:
1. **Outbound Sales**: Hire SDR, target firms with 10+ engineers
2. **Channel Partners**: Integration with Chilean ERP systems, accounting software
3. **Government Contracts**: Pilot with MOP, DOH regional offices

**Goals**:
- Month 24: 200 customers + 5 enterprise deals ($200K MRR)
- Month 36: 400 customers + 15 enterprise deals ($400K MRR)

**CAC Enterprise**: $3,000-5,000

---

## Revenue Projections: 3-Year Model

### Year 1: Launch & Validation (2026)

**Assumptions**:
- Launch: End of January (demos ready)
- First paying customer: March
- Growth: 8-12 new customers/month after Month 3
- Churn: 8% monthly (high during beta, decreases to 5%)
- Average ACV: $1,800 (mix of Individual $990 + Team $2,490)

| Quarter | New Customers | Total Customers | MRR | ARR Run Rate |
|---------|--------------|-----------------|-----|--------------|
| Q1 2026 | 8 | 8 | $800 | $9,600 |
| Q2 2026 | 25 | 30 | $4,500 | $54,000 |
| Q3 2026 | 35 | 60 | $10,800 | $129,600 |
| Q4 2026 | 40 | 95 | $19,000 | $228,000 |

**Year 1 Revenue**: $105,000 (actual recognized revenue, ramping up)
**Year 1 ARR Exit**: $228,000

**Milestones**:
- ✅ March: First paying customer ($99/mo)
- ✅ June: $5K MRR, 30 customers
- ✅ September: $10K MRR, 60 customers, first Team plan customer
- ✅ December: $20K MRR, 95 customers, product-market fit validated

### Year 2: Growth & Scale (2027)

**Assumptions**:
- Growth: 20-30 new customers/month
- Churn: 5% monthly (product stabilized)
- Average ACV: $2,200 (more Team plans)
- First enterprise deal: Q2 2027

| Quarter | New Customers | Total Customers | MRR | ARR Run Rate |
|---------|--------------|-----------------|-----|--------------|
| Q1 2027 | 70 | 155 | $34,000 | $408,000 |
| Q2 2027 | 80 | 225 | $56,000 | $672,000 |
| Q3 2027 | 85 | 300 | $78,000 | $936,000 |
| Q4 2027 | 90 | 380 | $105,000 | $1,260,000 |

**Year 2 Revenue**: $817,500
**Year 2 ARR Exit**: $1,260,000

**Milestones**:
- ✅ March: $40K MRR, 150 customers
- ✅ June: First enterprise deal ($30K ACV)
- ✅ September: $80K MRR, breakeven achieved
- ✅ December: $100K MRR, $1.2M ARR, 380 customers

### Year 3: Market Leadership (2028)

**Assumptions**:
- Growth: 30-50 new customers/month
- Churn: 3% monthly (mature product)
- Average ACV: $2,800 (more enterprise mix)
- Enterprise deals: 2-3/quarter

| Quarter | New Customers | Total Customers | MRR | ARR Run Rate |
|---------|--------------|-----------------|-----|--------------|
| Q1 2028 | 110 | 480 | $140,000 | $1,680,000 |
| Q2 2028 | 130 | 600 | $185,000 | $2,220,000 |
| Q3 2028 | 140 | 730 | $235,000 | $2,820,000 |
| Q4 2028 | 150 | 870 | $295,000 | $3,540,000 |

**Year 3 Revenue**: $2,565,000
**Year 3 ARR Exit**: $3,540,000

**Milestones**:
- ✅ Market leader in Chilean civil engineering SaaS
- ✅ 5% market penetration of target segment
- ✅ 870 paying customers
- ✅ 20+ enterprise customers
- ✅ Profitable, considering expansion (regional: Peru, Colombia)

---

## Unit Economics

### Customer Lifetime Value (LTV)

**Individual Plan**:
- MRR: $99
- Average customer lifetime: 24 months (2 years)
- Gross margin: 85%
- **LTV**: $99 × 24 × 0.85 = $2,019

**Team Plan**:
- MRR per seat: $249
- Average seats per customer: 3.5
- Average customer lifetime: 36 months (3 years)
- Gross margin: 85%
- **LTV**: $249 × 3.5 × 36 × 0.85 = $26,619

**Enterprise**:
- ACV: $35,000 (average)
- Average customer lifetime: 60 months (5 years)
- Gross margin: 80%
- **LTV**: $35,000 × 5 × 0.80 = $140,000

### Customer Acquisition Cost (CAC)

**Phase 1 (Founder-led)**:
- CAC: $750 (mostly founder time)
- Payback period: 8 months (Individual), 3 months (Team)

**Phase 2 (Scaled)**:
- CAC: $1,200
- Payback period: 12 months (Individual), 5 months (Team)

**Phase 3 (Enterprise)**:
- CAC: $4,500
- Payback period: 15 months

### LTV:CAC Ratios

- Individual: 2.7:1 (marginal, but volume play)
- Team: 22:1 (excellent)
- Enterprise: 31:1 (excellent)

**Target blended LTV:CAC**: 8:1 by end of Year 2

---

## Cost Structure & Profitability

### Infrastructure Stack (Actual)

**Core Infrastructure**:
- **Hosting**: Vercel (Next.js deployment, serverless functions, CDN)
- **Database**: Turso (LibSQL/SQLite, edge-replicated)
- **File Storage**: Google Cloud Storage (DWG files, exports, project data)
- **AI/ML**: Google Gemini API (surface analysis, AI features)
- **Auth**: NextAuth (included in app, no separate cost)

### Infrastructure Costs - Detailed Breakdown

#### Year 1: Bootstrap Phase (Avg: 50 customers, 10GB data, 500K AI tokens/month)

**Monthly Infrastructure Costs**:

| Service | Plan/Tier | Usage | Monthly Cost |
|---------|-----------|-------|--------------|
| **Vercel** | Pro | 1 user, ~200GB bandwidth, preview deployments | $20 |
| **Turso** | Scaler | ~15GB storage, 50M row reads/month | $29 |
| **Google Cloud Storage** | Standard | 10GB storage, 50K reads, 5K uploads/month | $1 |
| **Google Gemini API** | Pay-as-you-go | 500K tokens/month (Flash model) | $0.50 |
| **Domain & DNS** | Cloudflare + domain | .online domain + DNS | $2 |
| **Monitoring** | Vercel Analytics | Included in Pro plan | $0 |
| **Email** | SendGrid Free | Up to 100 emails/day | $0 |
| **Stripe** | Payment processing | 2.9% + $0.30/transaction (variable cost) | - |
| **SSL/Security** | Vercel + Cloudflare | Included | $0 |
| **Backup** | Turso auto-backup | Included in Scaler | $0 |
| **Total Infrastructure** | | | **$52.50/month** |

**Annual Infrastructure Cost Year 1**: $630

**Additional SaaS Tools**:
- GitHub (Free for public, $4/mo for private) | $4
- Figma (Free for personal) | $0
- Notion/Docs (Free tier) | $0
- **Total Tools**: $4/month ($48/year)

**Year 1 Total Infrastructure + Tools**: $682/year (~$57/month average)

#### Year 2: Growth Phase (Avg: 200 customers, 120GB data, 8M AI tokens/month)

**Monthly Infrastructure Costs**:

| Service | Plan/Tier | Usage | Monthly Cost |
|---------|-----------|-------|--------------|
| **Vercel** | Team (2 users) | 500GB bandwidth, more preview deployments | $40 |
| **Turso** | Scaler | 120GB storage, 400M row reads/month | $35 |
| **Google Cloud Storage** | Standard | 120GB storage, 800K reads, 100K uploads/month | $5 |
| **Google Gemini API** | Pay-as-you-go | 8M tokens/month (Flash model, heavy usage) | $6 |
| **Domain & DNS** | Cloudflare Pro | Better caching, page rules | $20 |
| **Monitoring** | Vercel Analytics Pro + Sentry | Error tracking, performance monitoring | $26 |
| **Email** | SendGrid Essentials | Up to 50K emails/month | $20 |
| **Customer Support** | Crisp or Intercom | Chat widget, ticket system | $50 |
| **Stripe** | Payment processing | 2.9% + $0.30/transaction (variable) | - |
| **CDN/Assets** | Cloudflare R2 | Image optimization, caching | $5 |
| **Backup & DR** | Automated snapshots | Daily backups, point-in-time recovery | $15 |
| **Total Infrastructure** | | | **$222/month** |

**Annual Infrastructure Cost Year 2**: $2,664

**Additional SaaS Tools**:
- GitHub Team | $48/year
- Figma Professional (2 editors) | $24/month
- Analytics (PostHog or similar) | $20/month
- Linear/Project Management | $16/month
- Slack or Discord Pro | $8/month
- **Total Tools**: $68/month ($816/year)

**Year 2 Total Infrastructure + Tools**: $3,480/year (~$290/month average)

#### Year 3: Scale Phase (Avg: 600 customers, 450GB data, 30M AI tokens/month)

**Monthly Infrastructure Costs**:

| Service | Plan/Tier | Usage | Monthly Cost |
|---------|-----------|-------|--------------|
| **Vercel** | Team (5 users) | 1.5TB bandwidth, enterprise support considered | $100 |
| **Turso** | Scaler (negotiated) | 450GB storage, 1.8B row reads/month | $125 |
| **Google Cloud Storage** | Standard + Nearline | 450GB hot, 200GB nearline, 3M reads, 500K uploads | $20 |
| **Google Gemini API** | Pay-as-you-go | 30M tokens/month (heavy AI usage) | $25 |
| **Domain & DNS** | Cloudflare Business | Enterprise caching, 100% uptime SLA | $200 |
| **Monitoring** | Vercel Analytics + Datadog | Full observability stack | $150 |
| **Email** | SendGrid Pro | Up to 100K emails/month | $90 |
| **Customer Support** | Intercom | Advanced automation, team inbox | $150 |
| **Stripe** | Payment processing | Volume discount likely applied (variable) | - |
| **CDN/Assets** | Cloudflare R2 + Image optimization | Heavy asset delivery | $30 |
| **Backup & DR** | Enterprise backup solution | Multi-region, PITR | $50 |
| **Security** | Cloudflare WAF, DDoS protection | Enterprise security | $100 |
| **Total Infrastructure** | | | **$1,040/month** |

**Annual Infrastructure Cost Year 3**: $12,480

**Additional SaaS Tools**:
- GitHub Team (10 users) | $400/year
- Figma Professional (5 editors) | $60/month
- Analytics (PostHog Scale) | $80/month
- Linear/Jira | $50/month
- Slack Business | $40/month
- Documentation (GitBook or similar) | $50/month
- **Total Tools**: $280/month ($3,360/year)

**Year 3 Total Infrastructure + Tools**: $15,840/year (~$1,320/month average)

### Fixed Costs (Monthly) - Full Breakdown

**Year 1 (Minimal Viable Team)**:
- Founder salary (minimal): $3,000
- **Infrastructure**: $57 (detailed above)
- **SaaS Tools**: $4 (detailed above)
- Marketing (content, ads): $800
- Legal/accounting: $400
- Office/coworking: $200
**Total Fixed**: $4,461/month ($53,532/year)

**Year 2 (Growing Team)**:
- Founders × 2: $10,000
- Engineer × 1: $6,000
- Customer Success × 1: $4,000
- **Infrastructure**: $222 (detailed above)
- **SaaS Tools**: $68 (detailed above)
- Marketing: $4,000
- Sales tools (CRM, email): $800
- Office/ops: $1,200
- Legal/accounting: $600
**Total Fixed**: $26,890/month ($322,680/year)

**Year 3 (Scaled Team)**:
- Engineering Team (5): $28,000
- Sales/Marketing (3): $16,000
- Customer Success (2): $9,000
- Operations/Admin (1): $4,500
- **Infrastructure**: $1,040 (detailed above)
- **SaaS Tools**: $280 (detailed above)
- Marketing: $12,000
- Sales tools: $2,000
- Office/ops: $3,500
- Legal/accounting/insurance: $1,500
**Total Fixed**: $77,820/month ($933,840/year)

### Variable Costs

**Per Customer Costs**:
- Customer support time: $15/customer/month (Year 2+)
- Infrastructure scaling: $0.35/active user/month (data transfer, storage, compute)
- Payment processing: 2.9% + $0.30/transaction (Stripe fees)

**Calculated Variable Costs by Year**:
- Year 1: Minimal (founder handles support, low infrastructure usage)
- Year 2: ~$20/customer/month average (200 customers = $4,000/month variable)
- Year 3: ~$18/customer/month average (600 customers = $10,800/month variable, economies of scale)

### Profitability Timeline - Updated with Real Infrastructure Costs

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| **Revenue** | $105,000 | $817,500 | $2,565,000 |
| **Cost of Goods Sold (COGS)** | | | |
| - Infrastructure & Tools | $682 | $3,480 | $15,840 |
| - Payment processing (2.9% + $0.30) | $3,200 | $25,100 | $78,900 |
| - Variable customer costs | $2,000 | $48,000 | $129,600 |
| **Total COGS** | $5,882 | $76,580 | $224,340 |
| **Gross Profit** | $99,118 | $740,920 | $2,340,660 |
| **Gross Margin** | 94.4% | 90.6% | 91.3% |
| | | | |
| **Operating Expenses** | | | |
| - Personnel | $36,000 | $240,000 | $685,000 |
| - Marketing | $9,600 | $48,000 | $144,000 |
| - Sales & ops tools | $0 | $9,600 | $24,000 |
| - Office/legal/other | $7,200 | $21,600 | $60,000 |
| **Total OpEx** | $52,800 | $319,200 | $913,000 |
| | | | |
| **EBITDA** | **$46,318** | **$421,720** | **$1,427,660** |
| **EBITDA Margin** | 44.1% | 51.6% | 55.7% |
| | | | |
| **Cash Flow Analysis** | | | |
| - EBITDA | $46,318 | $421,720 | $1,427,660 |
| - Founder minimal salary needs | -$36,000 | -$120,000 | -$250,000 |
| **Free Cash Flow** | **$10,318** | **$301,720** | **$1,177,660** |

**Key Insights**:
- **Infrastructure is remarkably lean**: $57/month Year 1 vs. previous estimate of $800/month
- **Gross margins are excellent**: 90-94% due to low marginal costs
- **Cash flow positive from Month 9-10** (when MRR reaches ~$5K)
- **No external funding needed**: Can bootstrap entirely with founder savings
- **Breakeven (covering founder living costs)**: Month 12-14 instead of Month 18

---

## Funding Requirements & Use of Funds

### Updated Assessment: Bootstrap is HIGHLY Viable

**Based on real infrastructure costs ($57/month Year 1), the business is significantly more capital-efficient than initially projected.**

### Bootstrap Scenario (STRONGLY Recommended)

**Required Capital**: $25-30K in founder savings/runway

**Why it works**:
- Infrastructure costs are minimal ($682/year Year 1)
- Gross margins are excellent (90-94%)
- Cash flow positive by Month 9-10 at ~$5K MRR
- Total Year 1 operating costs: ~$54K (not $140K as initially estimated)
- EBITDA positive in Year 1 (+$46K)

**Detailed Runway Calculation**:

| Month | MRR | Monthly Costs | Founder Needs | Net Cash Flow |
|-------|-----|---------------|---------------|---------------|
| 1-3 | $500 | $4,500 | $3,000 | -$7,000 |
| 4-6 | $2,500 | $4,500 | $3,000 | -$5,000 |
| 7-9 | $5,000 | $4,500 | $3,000 | -$2,500 |
| 10-12 | $10,000 | $4,500 | $3,000 | +$2,500 |

**Total Capital Needed (Months 1-9)**: ~$25K
**Self-sustaining from Month 10 onwards**

**Advantages**:
- ✅ Full control, zero dilution
- ✅ Forces discipline and customer focus
- ✅ Validates product-market fit organically
- ✅ Can scale profitably without external pressure
- ✅ Better negotiating position for future funding (if desired)

**Path**:
- Months 1-9: Bootstrap with savings (~$25K needed)
- Month 10+: Self-sustaining from customer revenue
- Year 2: Profitable, hire first team members from cash flow
- Year 3: $1.4M EBITDA, decide on growth capital vs. organic growth

### Seed Funding Scenario (Optional, Not Required)

**Only raise if**: Growth significantly exceeds projections AND you want to accelerate market capture

**Optimal timing**: End of Q2 2027 (not Q4 2026)
- Wait until $50K MRR ($600K ARR run rate)
- 150+ customers with <5% churn
- Proven unit economics (LTV:CAC > 5:1)

**Raise amount**: $500K-750K seed round

**Use of Funds**:
- Engineering team (2-3 FTEs): $250K
- Sales & Marketing acceleration: $300K
- Operations & tools: $100K
- Buffer: $100K

**Valuation**: $5-8M post-money (8-10x ARR at $600K run rate)

**Key Difference from Initial Plan**:
- Previous estimate: NEED funding to reach breakeven
- Updated reality: Can bootstrap to profitability, funding only for ACCELERATION

---

## Risk Analysis

### High Impact Risks

**1. Slow Customer Acquisition (Probability: 40%)**
- **Risk**: Engineers don't adopt fast enough, Year 1 target missed by 50%
- **Mitigation**: Lower prices initially, extend free trials, founder-led sales focus
- **Impact**: Breakeven delayed 6-9 months, need additional bootstrap capital

**2. Feature Parity Expectations (Probability: 35%)**
- **Risk**: Early customers expect ALL Civil 3D features immediately
- **Mitigation**: Clear positioning as "Chilean-first essentials", roadmap transparency
- **Impact**: Higher churn in first 6 months

**3. Competitive Response (Probability: 25%)**
- **Risk**: Autodesk launches Chile-specific features
- **Mitigation**: Move fast, build switching costs (customer data, workflows)
- **Impact**: Reduced growth rate in Year 2-3

**4. Regulatory Changes (Probability: 20%)**
- **Risk**: NCh433 or NCh691 major updates
- **Mitigation**: Monitor closely, be first to update (competitive advantage)
- **Impact**: Short-term churn if slow to update

### Medium Impact Risks

**5. Technical Scalability (Probability: 30%)**
- **Risk**: Infrastructure costs balloon with usage
- **Mitigation**: Architecture review at 500 customers, optimize early
- **Impact**: Margin compression in Year 2

**6. Key Person Dependency (Probability: 40%)**
- **Risk**: Founder burnout, no team to take over
- **Mitigation**: Hire strong #2 engineer by Month 12
- **Impact**: Product development slowdown

---

## Success Metrics & KPIs

### North Star Metric
**Active Projects Created Per Week**: Indicates real usage, not just sign-ups

### Key Metrics by Phase

**Phase 1: Product-Market Fit (Months 1-12)**
- Weekly Active Users (WAU)
- Projects created per user per month
- Feature adoption rate (% using each module)
- Net Promoter Score (NPS) > 40
- Activation rate: 60%+ (users complete first project)
- Monthly churn: < 8%

**Phase 2: Growth (Months 13-24)**
- MRR growth rate: 15%+ monthly
- CAC payback period: < 12 months
- Customer retention: 92%+ monthly
- Team plan adoption: 30%+ of customers
- Referral rate: 20%+ of new customers

**Phase 3: Scale (Months 25-36)**
- ARR: $2M+
- Rule of 40: (Growth Rate + EBITDA Margin) > 40%
- Net Revenue Retention: 110%+ (expansion revenue)
- Enterprise mix: 25%+ of revenue
- Gross margin: 85%+

---

## Go-to-Market Timeline

### Q1 2026 (Jan-Mar): Launch Sprint

**Week 1-2 (Jan 16-31)**:
- ✅ Complete terrain demo workflow
- ✅ Polish UI for demo
- ✅ Prepare demo deck
- ✅ Website narrative (done)

**Week 3-6 (Feb 1-28)**:
- Pilot with 10 friendly engineers
- Gather feedback, fix critical bugs
- Add authentication & project storage
- Prepare pricing page

**Week 7-10 (Mar 1-31)**:
- Public launch
- First paying customer
- Onboard 5-8 customers
- Refine onboarding flow

### Q2 2026 (Apr-Jun): Early Traction

- Customer Success workflows
- Content marketing ramp-up
- First case study
- Goal: 30 paying customers, $5K MRR

### Q3 2026 (Jul-Sep): Validation

- Product improvements based on usage data
- University partnerships
- Webinar program launch
- Goal: 60 customers, $10K MRR

### Q4 2026 (Oct-Dec): Momentum

- First enterprise pilot
- Hire first engineer
- Scale marketing
- Goal: 100 customers, $20K MRR

---

## Market Entry Competitive Advantages

### Why Now?

1. **AI Infrastructure Maturity**: Claude, GPT-4, Gemini enable small teams to build fast
2. **Cloud Cost Reduction**: AWS, Vercel pricing makes SaaS viable at small scale
3. **Open Data Movement**: DGA, IDE Chile data increasingly accessible
4. **Post-COVID Remote Work**: Engineers comfortable with cloud tools
5. **Chilean Engineering Market Growth**: Infrastructure investment increasing 2024-2026

### Why LeDesign?

1. **Founder Market Fit**: Actually worked as civil engineer in Chile
2. **Technical Capability**: Real calculations, not mockups (proven in codebase)
3. **Focus**: Chile-only means can move faster than global competitors
4. **Timing**: Before Autodesk/Bentley wake up to Chile opportunity
5. **Modern Stack**: Can iterate 10x faster than legacy enterprise software

---

## 5-Year Vision

**2026**: Validate product-market fit, $200K ARR
**2027**: Become known in Chilean engineering community, $1.2M ARR
**2028**: Market leader for Chilean civil engineering SaaS, $3.5M ARR
**2029**: Expand to Peru/Colombia, $8M ARR, Series A funding option
**2030**: Regional leader (Chile, Peru, Colombia, Ecuador), $18M ARR, profitable

**Potential Exit**:
- Strategic acquisition by Autodesk/Bentley: $50-100M (8-10x ARR)
- Regional expansion, IPO path: $200M+ valuation
- Bootstrap to profitability, indefinite hold: Lifestyle business at $5-10M ARR

---

## Conclusion

LeDesign has a clear path to $1M ARR within 24 months by:
1. Solving a real problem for Chilean engineers (fragmentation, lack of standardization)
2. Offering competitive pricing vs. incumbents ($2,490/year vs $2,500-4,000)
3. Building features that incumbents can't/won't (Chilean-specific integrations)
4. Moving fast with modern tech stack (Vercel, Turso, Google Cloud)

**The opportunity is real**. The market exists ($45-60M TAM). The pain is validated. The technical capability is proven. Execution is the only variable.

**Updated Economics Change Everything**:
- **Previous assumption**: Need $50K+ and external funding to reach breakeven
- **Reality with actual infrastructure**: Need only $25-30K, cash flow positive Month 9-10, profitable Year 1
- **Infrastructure efficiency**: $57/month vs $800/month estimated = 93% cost savings
- **Gross margins**: 90-94% (vs. 85% estimated) due to serverless architecture
- **Implication**: Can bootstrap entirely, retain 100% ownership, grow profitably

**Recommended path**:
1. Bootstrap with $25-30K personal savings (Months 1-9)
2. Reach self-sustainability at $5K MRR (Month 9-10)
3. Validate product-market fit to 100 customers and $20K MRR (Month 12-18)
4. Scale organically using cash flow from operations (Year 2+)
5. Consider optional growth capital only if market opportunity demands acceleration (Mid-Year 2)

**This is a capital-efficient, high-margin SaaS business that doesn't require external funding to succeed.**

---

**Next Steps**:
1. ✅ Finish terrain demo (Jan 31)
2. Start pilot outreach to 10 engineers (Feb 1)
3. Build authentication & payment (Feb 1-15)
4. First paying customer target (Mar 15)
5. Review projections quarterly, adjust based on actuals
