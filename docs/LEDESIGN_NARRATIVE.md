# LeDesign: The Complete Narrative

**LEdesma + ChiLE + LE Diseño**

*The definitive story of LeDesign - from vision to execution*

**Last Updated**: January 18, 2026
**Author**: Benja Ledesma, Founder & CEO

---

## Table of Contents

1. [The Journey: How I Got Here](#the-journey-how-i-got-here)
2. [The Problem I Lived](#the-problem-i-lived)
3. [The Fundamental Insight: Schema Ownership](#the-fundamental-insight-schema-ownership)
4. [The Solution: LeDesign's Three Foundations](#the-solution-ledesigns-three-foundations)
5. [The Business Opportunity](#the-business-opportunity)
6. [The Product](#the-product)
7. [Go-to-Market Strategy](#go-to-market-strategy)
8. [Fundraising Plan](#fundraising-plan)
9. [The Team & Equity Model](#the-team--equity-model)
10. [Financial Projections](#financial-projections)
11. [The Vision](#the-vision)

---

## The Journey: How I Got Here

**2016**: Graduated from Universidad de Concepción (UdeC) as a civil engineer. The education was rigorous, the Chilean standards (NCh433, NCh691, NCh432) were drilled into us, but the tools we had to use were fragmented, expensive, and not built for our reality.

**2016-2019**: Worked at LEICO with my father. Three years of hands-on civil engineering in Chile. This is where I **lived the problem**:
- Hidrología in one software (HEC-RAS), estructural in another (SAP2000), planos in AutoCAD
- Every analysis locked in PDFs and Excel files
- Client asks "what if we change the slope?" → Start from scratch
- Data scattered across incompatible formats
- Each discipline working in isolation

**2019**: Left Chile for a PhD in Hydrology in the USA. Exposure to modern infrastructure:
- Research centers with unified data pipelines
- Python scripts connecting everything
- Version control for calculations
- APIs for data access
- But these tools were built for American standards, American data sources, not Chilean engineering

**2019-2024**: Research Center work. Five years seeing the **solution**:
- Cloud infrastructure making servers essentially free (Vercel, Railway, Fly.io)
- AI (GPT-3, then GPT-4, now Claude) writing production-quality code
- Modern databases (Turso, PlanetScale) with generous free tiers
- The realization: **The barriers that made domain-specific software impossible for individual developers are gone**

**2026**: LeDesign. The synthesis:
- **3 años en Chile** viendo el problema (2016-2019)
- **5 años en USA** descubriendo la solución (2019-2024)
- **Ahora**: Building the platform I wish had existed when I was at LEICO

---

## The Problem I Lived

### The Two-Sided Problem

The pain I experienced—and every Chilean engineer still experiences—has two dimensions:

#### 1. Contenido Estático (Static Content)

**The formats**:
- PDFs, TIFFs, GIS files, DWG, Excel spreadsheets

**The pain**:
- You only see what the author decided to show
- You can't change parameters and re-run analysis
- Impossible to re-analyze with different assumptions
- Each format requires specific software (AutoCAD for DWG, ArcGIS for GIS, Adobe for PDFs)
- Want to check a calculation? Hope they included the Excel file

**Real example from LEICO**:
Client receives hydraulic analysis PDF. Three weeks later: "Can we increase the pipe diameter by 50mm?"

Answer: "Let me re-run the entire analysis, re-export to PDF, and send you a new 40-page document."

Should be: Change parameter in web app, click "Recalculate", see results instantly.

#### 2. Data Aislada (Isolated Data)

**The silos**:
- Hidrología separated from estructural
- Planos disconnected from cálculos
- Each discipline working in its own island
- Difficult programmatic access
- Impossible to do cross-discipline analysis

**Real example from LEICO**:
Designing a water treatment plant. The structural engineer needs the hydraulic loads. The hydraulic engineer exports to PDF, the structural engineer manually transcribes values into SAP2000. Error-prone, time-consuming, not auditable.

Should be: One unified project file. Hydraulic analysis outputs directly feed structural analysis inputs.

### The Result

**Ingenieros luchando con formatos, no haciendo ingeniería.**

Engineers fighting with file formats, not doing engineering.

We spend:
- 30% of time converting between formats
- 20% of time re-entering data
- 15% of time tracking down the "latest version"
- Only 35% actually engineering

This is unacceptable. And it's solvable.

---

## The Fundamental Insight: Schema Ownership

### The Core Realization

**La data es solo números en un esquema.**

Data is just numbers in a schema.

All software boils down to:
1. Numbers (the actual data)
2. A schema (how those numbers are structured and related)

The question is: **Who defines the schema?**

### Before: Big Tech Dictated

**The companies**: AutoCAD (Autodesk), ArcGIS (ESRI), Photoshop/Acrobat (Adobe)

**The model**:
- They invested millions developing their schemas (.dwg format, .shp format, .pdf format)
- They needed to dominate the market to recover those investments
- Economies of scale required they serve EVERYONE with ONE schema
- Customization per use case was economically impossible
- Everyone was forced to use THEIR schemas

**The result**:
- Data bloqueada en formatos propietarios (data locked in proprietary formats)
- Schemas optimized for generality, not your specific case
- Vendor lock-in
- High prices ($2,500-5,500 per seat annually)
- Slow innovation (annual release cycles)

### Now: Domain Experts Can Build

**The shift**:

What changed in the last 3 years that makes LeDesign possible now?

1. **AI writes the code (Claude: 90%+ of LeDesign)**
   - I describe what I need, Claude writes production TypeScript
   - What would have taken 3 engineers 2 years, I built in 6 months
   - Cost: $20/month for Claude Pro

2. **Infrastructure is essentially free**
   - Vercel: Free tier, $20/month for pro features
   - Turso: Free tier handles 500GB
   - Google Cloud: Free tier for most services
   - **Total infrastructure cost Year 1**: $682/year (~$57/month)
   - Compare to 2015: $5,000-10,000/month for equivalent infrastructure

3. **We define the schema**
   - Not Autodesk's schema
   - Not ESRI's schema
   - **OUR schema, optimized for Chilean civil engineering**

4. **Optimized for OUR case**
   - NCh433 (seismic) is a first-class citizen, not an afterthought
   - DGA (Dirección General de Aguas) data built-in
   - IDE Chile (Infraestructura de Datos Espaciales) integration
   - Chilean soil types, Chilean climate data, Chilean construction methods

**The result**:
- Data dinámica conectada a análisis (dynamic data connected to analysis)
- Schemas optimized for fast, iterative analysis
- No vendor lock-in (you own your data)
- Accessible pricing ($99-249/month vs $2,500-5,500/year)

### The Moment

**Por primera vez: ingenieros definen los esquemas, no las empresas de software.**

For the first time: engineers define the schemas, not software companies.

This is the paradigm shift. This is why LeDesign exists now and couldn't exist 5 years ago.

---

## The Solution: LeDesign's Three Foundations

LeDesign is built on three foundational principles that directly solve the problems I lived:

### 1. Contenido Dinámico (Dynamic Content)

**NOT**: PDFs, static exports, locked-down files

**INSTEAD**:
- Data stored in OUR database (Turso/LibSQL)
- Connected to dynamic frontends (React, Three.js)
- Live calculations, instant updates
- Version control built-in (every change tracked)
- Collaborative editing

**Example**:
Change pipe diameter → Hydraulic analysis recalculates → Structural loads update → Cost estimates adjust → All in real-time, all auditable

### 2. Acceso Expedito (Fast Access)

**NOT**: Vendor-specific formats, proprietary schemas, slow export workflows

**INSTEAD**:
- Schemas optimized for fast analysis
- API-first architecture
- Programmatic access to all data
- Export to industry standards when needed (DWG, PDF, Excel)
- But work in native format for speed

**Example**:
Need to run 100 scenarios? Write a Python script that hits our API. Impossible with traditional tools.

### 3. DB Centralizada (Centralized Database)

**NOT**: Estructural in one file, hidráulico in another, planos in a third

**INSTEAD**:
- One unified project database
- Estructural + Hidráulico + Planos + Terrain in one place
- Cross-discipline analysis becomes trivial
- Single source of truth
- No more "which version is latest?"

**Example**:
Terrain analysis feeds pavement design, which feeds structural loads, which feeds hydraulic drainage. All in one project, all connected.

---

## The Business Opportunity

### Market Size: Chile

**Total Addressable Market (TAM)**: $45-60M USD annually

| Segment | Population | Avg Spend/Year | Market Size |
|---------|-----------|----------------|-------------|
| Small-Medium Consultancies (5-50 eng) | 450 firms | $20,000 | $9M |
| Independent/Freelance Engineers | 3,500 professionals | $2,000 | $7M |
| Large Engineering Firms (50+ eng) | 35 firms | $250,000 | $8.75M |
| Universities/Academic | 80 institutions | $15,000 | $1.2M |
| Government Entities | 120 agencies | $25,000 | $3M |

**Serviceable Obtainable Market (SOM) Year 1**: $180K-360K USD
- Conservative: 100 users @ $1,800/year = $180K
- Optimistic: 200 users @ $1,800/year = $360K

### Regional Focus: Biobío & Ñuble (Launch Market)

**Why start here?**

1. **Personal connections**: My father (Waldo) has 30+ years of relationships with SERVIU, MOP, ESSBIO, and private consultancies in the region
2. **Market size**: 2.1M inhabitants (11.5% of Chile), 3,500-5,000 active civil engineers
3. **Active construction market**:
   - SERVIU Biobío: $518,453M CLP budget 2025 (+17% YoY)
   - SERVIU Ñuble: $221,176M CLP execution 2024
   - 150-200 engineering consultancies
4. **Proof of concept**: If it works in Biobío/Ñuble, it works anywhere in Chile (same NCh standards)

**Path to 45 clients** (minimum for sustainability):
- Total addressable engineers in region: 3,500-5,000
- Realistic potential users: 1,000-1,500 (engineers who use specialized software)
- To reach 45 clients: **Need to capture 3-4% of market**
- With Waldo's connections: Highly achievable

### Competitive Landscape

| Competitor | Market Share (Chile) | Price/Year | Our Advantage |
|-----------|---------------------|------------|---------------|
| **Autodesk Civil 3D** | ~35% | $2,500-4,000/seat | We're Chilean-first, 75% cheaper, unified platform |
| **Bentley OpenFlows** | ~20% | $3,500-5,500/seat | We're 90% cheaper, better UX, integrated |
| **HEC-RAS** | ~45% | Free (gov't) | We integrate with it, but offer modern UX + Chilean data |
| **Excel + Macros** | ~60% | Free-$200 | We're auditable, professional, automated |

**Our moat**:
1. Chilean regulatory integration (NCh433, NCh691, MOP manuals) - takes competitors 2-3 years to replicate
2. Unified data format - no competitor offers this
3. Modern cost structure - we can undercut by 70-90% and still maintain 90%+ margins
4. Domain expertise - I'm a Chilean civil engineer who lived the problem

---

## The Product

### Modules

LeDesign integrates 5 engineering disciplines into one platform:

#### 1. Diseño Estructural (Structural Engineering)
- Finite Element Analysis (FEA)
- Seismic analysis (NCh433 - automatic response spectra)
- Steel design (AISC)
- Concrete design (ACI 318)
- Timber design (NDS)
- Masonry design (TMS)
- Load combinations (NCh3171)

#### 2. Diseño Hidráulico (Hydraulic Engineering)
- Water distribution networks (NCh691)
- Sewer systems (NCh1105)
- Stormwater drainage
- Open channel flow (Manning, HEC-RAS integration)
- Pump sizing and selection

#### 3. Diseño de Pavimentos (Pavement Design)
- AASHTO flexible pavement design
- AASHTO rigid pavement design
- CBR-based design
- Traffic analysis (ESAL)
- Pavement performance prediction

#### 4. Diseño Vial (Road Design)
- Horizontal alignment (curves, spirals, tangents)
- Vertical alignment (grades, vertical curves)
- Superelevation calculations
- Sight distance analysis
- Earthwork volumes

#### 5. Análisis de Terreno (Terrain Analysis)
- DEM processing (import GeoTIFF, process elevation data)
- Earthwork volume calculations (cut/fill)
- Surface interpolation (TIN, Kriging)
- **AI-powered surface generation** (Google Gemini 2.0 Flash)
- Surveying tools

### Technology Stack

**Frontend**:
- Next.js 16.1+ (React 19.0+)
- Three.js / React Three Fiber (3D visualization)
- Tailwind CSS + Glassmorphism design system
- Lucide React icons

**Backend**:
- Next.js API routes
- Turso (LibSQL) - edge database
- NextAuth.js v5 (authentication)

**AI Integration**:
- Google Gemini 2.0 Flash (terrain feature detection, surface generation)
- Claude 3.5 Sonnet (development assistant - 90% of code)

**Infrastructure**:
- Vercel (hosting, edge functions)
- Google Cloud Storage (large files, DEMs)
- GitHub (version control)

**Cost**: $57/month average (Year 1)

---

## Development Status: Technical Assessment

*Independent evaluation by Claude Code (Opus 4.5) - January 2026*

### The Question

Can a web-based platform achieve professional-level engineering visualization comparable to AutoCAD, Civil 3D, and RAM Elements?

### The Verdict: Yes, Unequivocally

After comprehensive analysis of the LeDesign codebase, the answer is clear: **modern web technologies can match and exceed traditional desktop CAD software for specialized engineering applications**.

### What Has Been Built

LeDesign implements a **professional-grade, multi-modal CAD and engineering visualization system**:

| Capability | Status | Technology | Assessment |
|------------|--------|------------|------------|
| 2D CAD Drawing | ✅ Complete | HTML5 Canvas, 19 tools | Professional-grade |
| 3D Structural | ✅ Complete | Three.js 0.182, React Three Fiber | Production-ready |
| Geospatial | ✅ Complete | Leaflet + R-tree indexing | 10,000+ entities |
| Hydraulics | ✅ Complete | Network solvers, visualization | Chilean standards |
| Infrastructure | ✅ Advanced | 40+ entity types | Domain-specific |
| Performance | ✅ Optimized | LOD, caching, throttling | Professional |

### 2D CAD Capabilities

**19 Drawing Tools Implemented:**
- Geometric creation: Point, Line, Polyline, Circle, Arc, Text, Dimension, Hatch
- Operations: Offset, Trim, Extend, Fillet, Array
- Transformations: Translate, Rotate, Copy/Move
- Snap system: Intersection, perpendicular, tangent, nearest point
- Grid and ortho mode
- Real-time measurement

**Advanced Geometry Operations:**
- Fillet with radius validation
- Offset with self-intersection handling
- Intelligent trim/extend with boundary selection
- Hatch pattern generation for enclosed regions
- Dimension styles (linear, aligned, angular, radial)

### 3D Structural Visualization

**Rendering Technology:**
- Three.js 0.182.0 (latest stable)
- React Three Fiber 9.5.0
- Physically Based Rendering (PBR) materials
- Shadow mapping (2048x2048)
- Multi-point lighting system

**Structural Elements:**
- **Nodes**: 3D spheres, color-coded by support type (free, pinned, fixed, roller, spring)
- **Beams**: Extruded section profiles with proper orientation
- **Columns**: Vertical members with K-factor properties
- **Braces**: Diagonal, chevron, X-brace types
- **Deformed shapes**: Post-analysis visualization with configurable scale
- **Force diagrams**: Vector arrows for reactions and internal forces

**Section Geometry (200+ lines of implementation):**
- Steel: W-shapes, Channels, Angles, HSS tubes, Tees
- Concrete: Rectangular, Circular, T-beams
- Timber: Rectangular sections
- Cold-formed steel and aluminum profiles
- Geometry caching system for performance

**Material System:**
- Steel: Blue-gray, metalness 0.6, roughness 0.4
- Concrete: Light gray, metalness 0.2, roughness 0.8
- Timber: Brown with wood-appropriate properties
- Demand/Capacity ratio coloring (green → yellow → red)

### Geospatial Integration

**GeoCanvas Component (666 lines):**
- Seamless CAD overlay on real-world maps
- Automatic coordinate transformation (CAD ↔ Geographic)
- Georeferencing via control points

**Map Styles:**
- Satellite (Esri World Imagery)
- Streets (OpenStreetMap)
- Terrain (OpenTopoMap)
- Dark (CartoDB)
- Custom backgrounds

**Performance Architecture:**
- R-tree spatial indexing for O(log n) viewport queries
- Douglas-Peucker line simplification (70-90% point reduction)
- Zoom-dependent Level of Detail (LOD)
- Throttled rendering at 30 FPS
- Handles 10,000+ entities without degradation

### Why Web Can Match Desktop

**1. RAM Elements is OLD technology**

RAM was built in the 1990s-2000s using DirectX/OpenGL 1.x rendering. Modern WebGL 2.0:
- Better shader support than old DirectX
- PBR (Physically Based Rendering) - LeDesign already implements this
- Shadow mapping, post-processing effects
- Can handle millions of triangles smoothly

LeDesign's `material-rendering.ts` with metalness/roughness properties is already more sophisticated than what RAM Elements provides.

**2. The computation argument is solved**

The old argument was "browsers can't do heavy calculations." This is now false:
- **WebAssembly (WASM)**: Native-speed execution in browser
- **Web Workers**: True multi-threading for FEA
- **GPU.js / WebGPU**: GPU-accelerated matrix operations

Browser-based CFD (computational fluid dynamics) runs in real-time. Structural FEA is computationally simpler.

**3. The niche strategy is correct**

LeDesign is NOT trying to replicate all of AutoCAD or Civil 3D. It's building tools for **Chilean civil engineering specifically**. This focused scope makes the problem tractable and the solution superior for its target users.

### Technology Trajectory

```
2020: "Can web do CAD?" - Questionable
2024: "Can web do CAD?" - Mostly yes
2026: "Can web do CAD?" - Definitively yes (WebGPU, better WASM)
```

WebGPU (Chrome 113+) brings compute shaders to the browser:
- GPU-accelerated FEA matrix solvers
- Real-time mesh manipulation
- Native-speed rendering pipelines

LeDesign is building on the technology that will dominate the next decade.

### Where Web EXCEEDS Desktop

| Capability | Desktop (AutoCAD, SAP2000) | Web (LeDesign) | Winner |
|------------|---------------------------|----------------|--------|
| AI Integration | Impossible retrofit | Native (Gemini API) | ✅ Web |
| Collaboration | Clunky add-ons | Real-time, native | ✅ Web |
| Update Velocity | Annual releases | Daily if needed | ✅ Web |
| Cross-Platform | Separate builds | Works everywhere | ✅ Web |
| Installation | Hours of setup | Zero | ✅ Web |
| Chilean Standards | Expensive add-ons | First-class citizens | ✅ Web |

### Honest Limitations

**1. DWG Compatibility (Permanent)**
DWG is proprietary. Import via libredwg will never be 100% perfect. Mitigation:
- Focus on subset of DWG features Chilean engineers actually use
- Provide excellent DXF support (open format)
- Generate clean exports rather than perfect imports

**2. Very Large Models**
10,000+ entities is good. 100,000+ requires more optimization. For target market (civil engineering projects, not mega-infrastructure), current performance is adequate.

**3. Rendering Ceiling**
For photorealistic renders, desktop still wins. But engineering visualization doesn't need photorealism—it needs clarity and accuracy, which LeDesign provides.

### Feature Maturity Assessment

| Feature | Status | Notes |
|---------|--------|-------|
| 2D Drawing | ✅ Complete | 19 tools, snapping, layers, full geometry ops |
| 3D Structural | ✅ Complete | Beams, columns, braces, sections, materials |
| Hydraulic Analysis | ✅ Complete | Pipe sizing, head loss, demand, water quality |
| Terrain/DEM | ✅ Complete | GeoTIFF parsing, triangulation, AI feature detection |
| Map Integration | ✅ Complete | 5 map styles, georeferencing, tile caching |
| Infrastructure | ✅ Advanced | 40+ entity types, network solvers, design standards |
| Analysis Results | ✅ Complete | D/C ratios, deformed shape, force diagrams |
| Presentations | ⚠️ In Progress | Video generation, audio narration framework |

### Key Implementation Files

**Core Architecture:**
- CAD Store: `/stores/cad-store.ts` (450+ lines, Zustand state)
- Editor Store: `/stores/editor-store.ts` (structural analysis state)
- Types: `/types/cad.ts`, `/types/structural`, `/types/infrastructure-entities.ts`

**2D Rendering:**
- DrawingCanvas2D: `/components/cad/DrawingCanvas2D.tsx` (2500+ lines)
- Toolbar: `/components/cad/Toolbar.tsx`
- Infrastructure Renderer: `/components/cad/InfrastructureRenderer.tsx`

**3D Rendering:**
- Scene: `/components/editor/Canvas3D/Scene.tsx` (465 lines)
- Element Meshes: `/components/editor/Canvas3D/elements/` (6 files)
- Section Geometry: `/lib/three-geometry/section-geometry.ts`
- Material Rendering: `/lib/three-geometry/material-rendering.ts`

**Mapping:**
- GeoCanvas: `/components/cad/GeoCanvas.tsx` (666 lines)
- Spatial Index: `/lib/spatial-index.ts`
- LOD System: `/lib/lod-system.ts`
- WebGL Renderer: `/lib/webgl-renderer.ts`

**Geometry Library:**
- CAD Geometry: `/lib/cad-geometry/` (7 modules, 100+ lines each)
- Open Channel: `/lib/open-channel/channel-geometry.ts`
- Road Geometry: `/lib/road-geometry/`
- Triangulation: `/lib/triangulation/`

### Conclusion

LeDesign's frontend is **production-ready and professional-grade**. It successfully integrates:

1. Multiple rendering technologies (Canvas 2D, Three.js 3D, Leaflet mapping, WebGL)
2. Comprehensive CAD drafting with advanced geometry operations
3. 3D structural analysis with realistic material rendering
4. Geospatial integration with coordinate transformation and spatial indexing
5. Domain-specific infrastructure and hydraulic simulation
6. Performance optimizations for 10,000+ entities
7. Modern React/Next.js architecture

**The bet you're making on LeDesign's technology is sound.** The web stack is mature enough for professional CAD/engineering software. The key advantage is focus: Chilean civil engineering, not trying to replicate everything.

The engineers at Bentley, Autodesk, and Trimble are starting to move to web because they see where technology is going. LeDesign is already there.

---

### Integrations

**Chilean Data Sources**:
- DGA (Dirección General de Aguas) - river flow data, flood frequency
- IDE Chile (Infraestructura de Datos Espaciales) - geographic data
- SERNAGEOMIN - geology, soil data
- Open-Meteo - weather data

**Standards**:
- NCh433 (seismic)
- NCh432 (wind)
- NCh431 (snow)
- NCh691 (water systems)
- NCh1105 (sewers)
- NCh1537 (live loads)
- NCh3171 (load combinations)

**Export Formats**:
- PDF (reports)
- DWG (AutoCAD)
- Excel (tables)
- GeoJSON (GIS)
- JSON/CSV (data)

---

## Go-to-Market Strategy

### Pricing Model

**Three-tier SaaS pricing**:

| Plan | Price | Target | Includes |
|------|-------|--------|----------|
| **Gratis** | $0/month | Acquisition, students | 1 user, 5 projects, basic features, exports limited |
| **Profesional** | $49/month | Primary revenue | 1 user, unlimited projects, all 5 modules, full exports, API access |
| **Empresarial** | Custom | High-value contracts | Multi-user, custom integrations, priority support, SLA |

**Early Access Program** (Pre-launch funding):

| Tier | Price | Users | Access | Extras |
|------|-------|-------|--------|--------|
| **Individual** | $250 | 1 user | Lifetime access | From April 2026 |
| **Equipo** | $1,000 | 3 users | Lifetime access | +$250/user extra |
| **Socio Fundador** | $5,000 | 5 users | From March 2026 | +$200/user extra, custom adaptations |

### Launch Timeline

**January 2026** (Now):
- Goal: Find 2 Founding Partners ($5,000 each)
- Waldo searches and negotiates with potential partners
- Benja develops full-time
- Revenue target: $10,000

**February 2026**:
- Goal: First individual and team donations
- Partners start getting involved (no salary yet)
- Seek individual donations ($250+) and team ($1,000+)
- Revenue target: $6,000

**March 2026**:
- **First payment to partners** ($1,000 each)
- Founding Partners get access
- Custom adaptations based on their feedback
- Revenue target: $5,000

**April 2026**:
- Early Access for all donors
- Mass testing before public launch
- Bug fixes, UI polish
- Revenue target: $5,000

**May 2026**:
- **PUBLIC LAUNCH**
- Monthly subscriptions begin (50% off promo)
- Marketing and outreach
- Lifetime donations end or increase price

**June-July 2026**:
- Growth phase
- Convert free users to paid
- Pipeline of enterprise clients
- Revenue target: Reach sustainability ($6,000 MRR)

### Sales Strategy

**Phase 1 (Biobío/Ñuble)**: Leverage Waldo's connections
- Direct outreach to consultancies where he has relationships
- Demos at SERVIU, MOP offices
- Presentations at CChC Concepción
- Target: 45 clients by July 2026

**Phase 2 (Santiago)**: Expand to RM
- Online marketing (SEO, content marketing)
- LinkedIn outreach to engineering firms
- Partnerships with universities (UChile, PUC)
- Target: 100 additional clients by December 2026

**Phase 3 (All Chile)**: National rollout
- Same NCh standards apply everywhere
- Regional representatives in key cities
- Government contracts (municipalities, SERVIU regional)
- Target: 500 clients by June 2027

### Sustainability Math

**To cover $6,000/month in salaries**:

| Scenario | Clients Needed |
|----------|----------------|
| Only Individual plans ($49/month) | 122 clients |
| Only Professional plans ($99/month) | 61 clients |
| **Realistic mix** (70% individual, 30% professional) | **~90 clients** |

**Divided among 3 partners** (excluding Benja who develops):
- Each partner needs to bring/maintain: **~30 clients**

**Is this realistic?**
- Waldo: Decades of contacts in Biobío with SERVIU, MOP, ESSBIO, consultancies → 30 clients achievable
- Waldo chico: Network of engineers, can provide technical support → 30 clients achievable
- Pichi: Access to LAN engineering departments, real user validation → 30 clients achievable

---

## Fundraising Plan

### The Ask

**Goal**: $36,000 USD (February - July 2026)

This pre-launch funding bridges us from development to sustainability. We're offering **lifetime access** to LeDesign in exchange for supporting the platform before public launch.

### Why We're Fundraising

**The challenge**: We need to pay salaries while we build the user base to become self-sustaining through subscriptions.

**The timeline**:
- **Now - April 2026**: Finish development, testing, polish
- **May 2026**: Public launch with monthly subscriptions
- **July 2026**: Self-sustaining from subscriptions ($6K/month MRR)

**The gap**: $33,000 in operating expenses (salaries + infrastructure) between February and July 2026.

**The opportunity for donors**: Get **lifetime access** for a one-time payment instead of paying $49-99/month forever.

### Understanding "The Pot"

All pre-launch money flows into **"the pot"** - a unified fund that includes contributions from different participant types:

**Who contributes to the pot:**

1. **Usuario Pionero ($250)**: Engineers paying for lifetime product access
2. **Equipo Pionero ($1,000)**: Teams paying for lifetime team access
3. **Patrocinador Premium ($5,000)**: Sponsors paying for access + influence + priority
4. **Amigos (LeCoin)**: **BONUS** - fraternal support NOT counted in minimum goal

**The minimum goal**: $32,500 from users and sponsors (excluding friends).

**After May 4th launch**: The pot converts to a reserve/investment fund. Only monthly subscriptions count as recurring revenue for ongoing operations.

**Why this structure?**

- Clear separation between revenue (users/sponsors) and fraternal support (friends)
- Predictable funding timeline with defined milestones
- Transparency about what counts toward sustainability vs. bonus support
- Friends can participate without pressure of being "counted" in the business model

### The 25% Fraternal Network Sacrifice

**Benja's personal contribution to runway:**

Instead of converting my fraternal network into paying customers, I'm dedicating **25% of my personal network** to fundraising through the LeCoin model. This is my way of contributing to the project's runway without expecting financial return.

**What this means:**

- Friends and family who believe in the project can support it
- Their contributions are **BONUS** - not counted in the $32,500 minimum
- I'm sacrificing potential revenue from these relationships for early-stage funding
- This is trust-based support, not a business transaction

**The commitment**: Any money from friends is contributed with the understanding that:

- It helps bridge the gap to sustainability
- It may be "paid back" based on trust once LeDesign exceeds $6K/month (survival point)
- There's no formal obligation - this is fraternal support
- Friends know they're supporting a person, not investing in equity

### LeCoin Model: Fraternal Support

**What is LeCoin?**

LeCoin is a **symbolic token of fraternity**, not a product purchase or equity investment. It represents the support of friends and family who believe in the project before public launch.

**How it works:**

- **1 LeCoin = $1,000 donated**
- Maximum 10 LeCoins per person
- Closes May 4, 2026 (launch day)
- Transferable within the LeDesign family

#### The Three-Pot Transparency System

LeDesign operates with complete financial transparency through three separate "pots" that friends can monitor in real-time:

#### Pot 1: Operations ($0-12K/month MRR)

- Running the business: salaries, infrastructure, core expenses
- All subscription revenue up to $12K/month goes here
- Priority: Keep the lights on and team paid

#### Pot 2: Growth ($12K-15K/month MRR)

- Target: $3K/month for development, marketing, ads, investments
- Activated once Pot 1 is filled ($12K/month achieved)
- Purpose: Expand and improve the platform

#### Pot 3: Family Fund (Above $15K/month MRR)

- Excess subscription revenue after Pots 1 & 2 are filled
- **This is where LeCoin value comes from**
- Designed specifically to help friends who helped us
- Only grows when LeDesign is doing REALLY well

#### LeCoin Value Calculation

- **1 LeCoin = 1% of Pot 3 (Family Fund)**, NOT total revenue
- If Pot 3 has $5,000 → 1 LeCoin = $50 symbolic value
- If Pot 3 has $20,000 → 1 LeCoin = $200 symbolic value
- LeCoin only has value when LeDesign exceeds $15K/month (success threshold)

#### Transparency Dashboard (LeCoin Holders Only)

All friends who donate get access to a private dashboard showing:

- Current MRR (Monthly Recurring Revenue)
- All three pot values in real-time
- How much is in the Family Fund (Pot 3)
- Current symbolic value of 1 LeCoin
- Subscription growth trends

#### Why This Matters

Friends are treated as **FAMILY, not customers**. They can see honest numbers and decide for themselves:

- "Is Benja doing well? How much is in Pot 3?"
- "Do I need help right now? Is there capacity?"
- "Should I reach out or wait?"

#### Redemption Mechanics

- **Trust-based**, not contractual
- Friends can ask for help once Pot 3 has meaningful funds
- Decided by Benja based on Pot 3 balance and friend's need
- Optional - friends understand this is symbolic support
- Dignity-preserving: friends see real numbers and decide themselves

**Product access:**

- **Friends (LeCoin holders)**: Explorer access only - can view and test features
- **For professional/commercial use**: Must purchase separate subscription
- Friends can be users by paying separately
- **LeCoin ≠ Product access** - these are separate

### Participant Taxonomy

LeDesign has three distinct participant categories:

#### 👥 Fundadores (Founders)

- **Equity holders**: Benja (70%), Waldo/Waldo V/Pichi (10% each)
- **Compensation**: Salaries from "the pot" ($2K-1K/month)
- **Contribution**: Building the company (development, sales, connections)
- **Rights**: Governance, decision-making, profit distribution

#### 🤝 Amigos (LeCoin Holders)

- **Fraternal support**: Trust-based contributions ($1K-10K)
- **Compensation**: Symbolic LeCoin (1% revenue per $1K)
- **Contribution**: Financial runway without business pressure
- **Rights**: Explorer access, real-time dashboard, optional redemption

#### 💼 Usuarios (Users)

- **Product buyers**: Pioneer tiers + monthly subscriptions
- **Compensation**: Lifetime or monthly product access
- **Contribution**: Revenue for sustainability
- **Rights**: Full product access, support, updates

**Key distinction**: Fundadores build equity. Amigos provide trust-based support. Usuarios buy the product.

### Detailed Use of Funds

Every dollar raised goes directly to building the platform and reaching launch:

| Month | Amount | Allocation |
|-------|--------|------------|
| **February 2026** | $3,000 | • Benja salary: $2,000<br>• Infrastructure (Vercel, Turso, Google Cloud): $1,000 |
| **March 2026** | $6,000 | • Full team salaries: $5,000 ($2K + $1K + $1K + $1K)<br>• Infrastructure: $1,000<br>• **Founding Partners get access** |
| **April 2026** | $6,000 | • Full team salaries: $5,000<br>• Infrastructure: $1,000<br>• **All donors get early access** |
| **May 2026** | $6,000 | • Full team salaries: $5,000<br>• Infrastructure: $1,000<br>• **Public launch** |
| **June 2026** | $6,000 | • Full team salaries: $5,000<br>• Infrastructure: $1,000<br>• Growth & marketing |
| **July 2026** | $6,000 | • Full team salaries: $5,000<br>• Infrastructure: $1,000<br>• **Target: Self-sustaining** |
| **TOTAL** | **$33,000** | **Salaries: $27,000 \| Infrastructure: $6,000** |

**Buffer**: $3,000 ($36K raised - $33K expenses) for contingencies.

### Infrastructure Breakdown

Where your infrastructure contribution goes:

| Service | Purpose | Cost/Month |
|---------|---------|-----------|
| **Vercel Pro** | Hosting, edge functions, global CDN | $20 |
| **Turso Pro** | Edge database (LibSQL), instant queries | $29 |
| **Google Cloud** | Gemini AI API, Earth Engine data | $5-15 |
| **Domain & DNS** | ledesign.cl registration and management | ~$1 |
| **Email & Services** | SendGrid, monitoring, analytics | $3 |
| **TOTAL** | | **~$60/month** |

**Key insight**: Modern infrastructure costs 93% less than traditional SaaS ($60/month vs. $800/month estimated). This is why we can offer lifetime access - our marginal costs are nearly zero.

### Donation Tiers

Three ways to support LeDesign and get lifetime access:

#### 🥉 Individual Tier - $250 USD

**What you get**:
- ✅ **Lifetime access** to all 5 modules (Estructural, Pavimentos, Hidráulico, Vial, Terreno)
- ✅ 1 user account
- ✅ Unlimited projects
- ✅ All future updates and features
- ✅ Priority email support
- ✅ Early access from **April 2026** (before public launch)
- ✅ Your name on the "Early Supporters" page

**Value**: $49/month × 12 months = $588/year → You save $338 in year one alone.

**Perfect for**: Individual engineers, freelancers, students who want professional-grade tools.

---

#### 🥈 Team Tier - $1,000 USD

**What you get**:
- ✅ **Lifetime access** to all 5 modules
- ✅ 3 user accounts (add more at $250/user)
- ✅ Unlimited projects
- ✅ All future updates and features
- ✅ Priority support
- ✅ Early access from **April 2026**
- ✅ Team name featured on "Early Supporters" page

**Value**: $99/month × 12 months = $1,188/year → You save $188 in year one.

**Perfect for**: Small consultancies, engineering teams, firms with 2-5 engineers.

---

#### 🥇 Founding Partner - $5,000 USD

**What you get**:
- ✅ **Lifetime access** to all 5 modules
- ✅ 5 user accounts (add more at $200/user)
- ✅ Unlimited projects
- ✅ All future updates and features
- ✅ **VIP early access from March 2026** (2 months before public)
- ✅ **Custom adaptations** based on your specific needs
- ✅ Direct line to Benja (founder) for feature requests
- ✅ Quarterly check-in calls
- ✅ "Founding Partner" badge on your profile
- ✅ Featured prominently on website and marketing materials
- ✅ Input on product roadmap

**Value**: $199/month × 12 months = $2,388/year → You save annually forever.

**Perfect for**: Engineering firms, consultancies, or engineers who want to actively shape the platform.

**Only 2 available** - exclusive founding partner status.

---

### Why Donate Now Instead of Waiting for Subscriptions?

**Financial savings**:
- **Individual**: $250 now vs. $588/year forever = Break-even in 6 months
- **Team**: $1,000 now vs. $1,188/year forever = Break-even in 11 months
- **Founding Partner**: $5,000 now vs. $2,388/year forever = Break-even in 25 months

**After 3 years**:
- Individual subscription cost: $1,764 | Your cost: $250 → **$1,514 saved**
- Team subscription cost: $3,564 | Your cost: $1,000 → **$2,564 saved**
- Founding Partner cost: $7,164 | Your cost: $5,000 → **$2,164 saved**

**After 10 years**:
- Individual subscription cost: $5,880 | Your cost: $250 → **$5,630 saved**
- Team subscription cost: $11,880 | Your cost: $1,000 → **$10,880 saved**
- Founding Partner cost: $23,880 | Your cost: $5,000 → **$18,880 saved**

**Non-financial benefits**:
- ✅ Shape the product before public launch
- ✅ Early access to test and integrate into your workflow
- ✅ Priority feature requests
- ✅ Direct relationship with founder
- ✅ Recognition as an early supporter
- ✅ Guaranteed access even if we raise prices later

### Accountability & Transparency

**How we'll keep you informed**:

1. **Monthly email updates** (all donors):
   - Development progress
   - Financial transparency (revenue, expenses, runway)
   - Product roadmap updates
   - Early access to new features

2. **Quarterly check-ins** (Founding Partners):
   - 30-minute video call with Benja
   - Product demo and feedback session
   - Roadmap planning input

3. **Public development log**:
   - GitHub commits (code is visible)
   - Feature release notes
   - Usage statistics (anonymized)

4. **Financial transparency**:
   - Monthly revenue reports
   - MRR (Monthly Recurring Revenue) tracking
   - Client acquisition numbers

**If we don't hit sustainability by July 2026**:
- We'll continue developing with remaining runway
- Donors still get lifetime access (no refunds needed - you get the product)
- Honest communication about challenges and pivots

**If we exceed expectations**:
- Faster feature development
- Earlier expansion to Santiago and beyond
- Potential to increase team salaries or hire additional help
- All donors benefit from success

### The Value Proposition

**You're not just donating - you're investing in**:

1. **A tool you'll actually use**: Chilean engineering software built by a Chilean engineer who lived your problems
2. **Long-term savings**: Lifetime access means you never pay another subscription
3. **Industry influence**: Early supporters shape the product roadmap
4. **Professional advantage**: Be the first engineers in Chile using integrated design tools
5. **Community building**: Connect with other early adopters and innovative engineering firms

**The bet you're making**:
- ✅ That Chilean engineering needs modern, integrated tools → **Proven by years of using fragmented software**
- ✅ That Benja can build it → **90% of code already written by Claude AI under his direction**
- ✅ That there's a market → **$45-60M TAM in Chile, Biobío connections ready to buy**
- ✅ That we'll reach sustainability → **Only need 90 clients at $49-99/month by July**

**The downside protection**:
- Even if we take longer to reach sustainability, you still get lifetime access
- Your "donation" is really a deeply discounted lifetime license
- Worst case: You paid $250-5,000 for software that would cost $588-2,388/year

### How to Become a Donor

**Ready to support LeDesign?**

1. **Email Benja**: benja@ledesign.cl
2. **Choose your tier**: Individual ($250), Team ($1,000), or Founding Partner ($5,000)
3. **Payment options**:
   - Bank transfer (Chile - CLP or USD)
   - PayPal / Stripe (International)
   - Cryptocurrency (BTC, ETH, USDC)
4. **Receive confirmation**: Account setup within 24 hours
5. **Get early access**: March (Founding Partners) or April (Individual/Team)

**Questions?** Email benja@ledesign.cl or WhatsApp: [contact info]

---

## The Paradigm Shift: Why This is Possible Now

### Old Model vs. New Model

Building engineering software in 2015 vs. 2026:

| Cost Category | **2015 Model** (Traditional) | **2026 Model** (LeDesign) |
|---------------|------------------------------|---------------------------|
| Infrastructure | $100,000/year (datacenter) | $1,000/year (cloud services) |
| Development Team | $250,000/year (5 engineers) | $0 (founder + AI) |
| Hardware | $25,000 (servers, equipment) | $5,000 (2-3 MacBooks) |
| Office | $24,000/year (rent) | $0 (remote) |
| **Minimum to Start** | **$350,000+** | **$6,000** |
| **Annual Operating** | **$374,000+** | **$132,000** |

**The insight**: LeDesign needs **65% less revenue** to be sustainable, AND the product is already built.

**What made this possible**:
1. **AI writes code**: Claude Code built 90% of LeDesign
2. **Free infrastructure**: Vercel ($20/mo), Turso ($5/mo), Google Cloud (free tier)
3. **No office needed**: Remote-first, async collaboration
4. **Development subsidized**: Built during university postdoc

---

## The Team & Equity Model

### Core Team Structure

| Name | Role | Equity | Bonus (Monthly) | Location | Responsibilities |
|------|------|--------|-----------------|----------|------------------|
| **Benja Ledesma** | Founder & CEO | 70% | $2,000 → $2,500 | USA (Memphis) | 100% technical development, product vision, architecture |
| **Waldo Ledesma** | Chief Connections Officer | 10% | $1,000 → $2,500 | Biobío, Chile | Sales, client relationships, government connections |
| **Waldo Ledesma V.** | CTO | 10% | $1,000 → $2,500 | Chile | Documentation, technical support, user training |
| **Pichi** | Engineering Lead | 10% | $1,000 → $2,500 | Chile | User validation, product feedback, sales to LAN contacts |

### Bonus Progression Model

Bonuses grow as the company grows, with fairness built in:

| Stage | Benja | Co-founders | Total Monthly | MRR Required |
|-------|-------|-------------|---------------|--------------|
| **Survival** | $2,000 | $1,000 each | $5,000 + $1K infra = **$6,000** | $6,000 |
| **Growing** | $2,000 (stays flat) | $2,000 each | $8,000 + $1K infra = **$9,000** | $9,000 |
| **Doing Good** | $2,500 | $2,500 each | $10,000 + $1K infra = **$11,000** | $11,000 |

**Key principle**: Benja doesn't grow until co-founders catch up. Then everyone grows together to the $2,500 cap.

### Co-Founder Commitment Fee

Each co-founder contributes a **$1,000 commitment fee** to join:

| Aspect | Details |
|--------|---------|
| **Amount** | $1,000 per co-founder (3 × $1,000 = $3,000 total) |
| **Purpose** | Skin in the game + counts toward January fundraising goal |
| **Risk** | If we DON'T close 2 Socios Fundadores → they lose $1,000 |
| **Reward** | If we DO close 2 Socios Fundadores → they get $1,000 back in March |
| **Max Downside** | Co-founders risk losing $1,000 (not $1,500 as initially stated) |

**Why this structure?**
1. **Skin in the game**: They're invested, not just along for the ride
2. **Shared risk**: Benja isn't bearing 100% of financial risk
3. **Counts toward goal**: The $3,000 helps reach the January $10K target
4. **Psychological commitment**: People value what they pay for
5. **Fair exit**: If we succeed, they get it back; if we fail, loss is capped

### Equity Rationale

**Why 70/10/10/10?**

**Benja's 70% represents**:
- The idea and vision (years thinking about this)
- All code developed (backends nearly complete)
- 7 years of civil engineering experience in Chile
- Technical architecture (Turso, Vercel, integrations)
- Chilean standards research and implementation
- The risk (left Chile, did PhD, betting on this)
- Ongoing development (100% of technical work)

**Each partner's 10% represents**:
- $1,000 commitment fee (refundable if successful)
- No need to quit current jobs (freelance basis)
- Start earning in March ($1,000/month if funded)
- Results-based, not hours-based
- 10% of ALL of LeDesign, forever

**The reality**:
- 10% of $0 = $0
- 10% of $100K/year revenue = $10K/year passive income
- 10% of $1M/year revenue = $100K/year passive income

### Module Ownership Model

**Critical principle**: Whoever builds a module owns 70% of that module's revenue.

**Core modules** (Benja built):

| Module | Developer | Revenue Split |
|--------|-----------|---------------|
| Diseño Estructural | Benja | Benja 70%, Waldo 10%, Waldo V. 10%, Pichi 10% |
| Diseño de Pavimentos | Benja | Benja 70%, Waldo 10%, Waldo V. 10%, Pichi 10% |
| Diseño Hidráulico | Benja | Benja 70%, Waldo 10%, Waldo V. 10%, Pichi 10% |
| Diseño Vial | Benja | Benja 70%, Waldo 10%, Waldo V. 10%, Pichi 10% |
| Análisis de Terreno | Benja | Benja 70%, Waldo 10%, Waldo V. 10%, Pichi 10% |

**Future modules** (whoever builds them):

| Module | If built by... | Revenue Split |
|--------|---------------|---------------|
| Seguimiento de Obras | Pichi | **Pichi 70%**, Benja 10%, Waldo 10%, Waldo V. 10% |
| Topografía Avanzada | Waldo V. | **Waldo V. 70%**, Benja 10%, Waldo 10%, Pichi 10% |
| Inspección Técnica (ITO) | Waldo | **Waldo 70%**, Benja 10%, Waldo V. 10%, Pichi 10% |
| Presupuestos/Cubicación | Anyone | **That person 70%**, others 10% each |
| Gestión Documental | Anyone | **That person 70%**, others 10% each |
| Geotecnia | Anyone | **That person 70%**, others 10% each |

**This means**:
1. I built the core → I have 70% of core revenue
2. You build something new → You have 70% of that module's revenue
3. Everyone earns 10% passive from all modules
4. If you want more equity, earn it by building

---

## Financial Projections

### Subscription Pricing (Post-Launch)

| Plan | Price | What's Included |
|------|-------|-----------------|
| **Estructural** | $100/mes | FEA, NCh433 sísmico, Acero/Hormigón |
| **Pavimentos** | $100/mes | AASHTO, CBR, Perfiles |
| **Hidráulico** | $100/mes | NCh691, Alcantarillado, Aguas lluvia |
| **Plan Completo** | $200/mes | All 3 modules |

### Pre-Launch Revenue (Fundraiser)

**Target**: $36,000 (January-July 2026)

| Source | Quantity | Price | Total |
|--------|----------|-------|-------|
| Co-Founder Commitment Fees | 3 | $1,000 | $3,000 |
| Socios Fundadores | 2 | $5,000 | $10,000 |
| Individual Donations | 50 | $250 | $12,500 |
| Team Donations | 10 | $1,000 | $10,000 |
| Extra Users | ~2 | ~$250 avg | $500 |
| **TOTAL** | | | **$36,000** |

**Note**: Co-founder fees are refundable in March IF we close 2 Socios Fundadores.

### Operating Expenses

**February-July 2026**: $33,000 total

| Month | Amount | Breakdown |
|-------|--------|-----------|
| February | $3,000 | Benja $2,000 + Infrastructure $1,000 |
| March | $6,000 | Full team ($2k + $1k + $1k + $1k) + Infra $1k |
| April | $6,000 | Full team + Infra |
| May | $6,000 | Full team + Infra |
| June | $6,000 | Full team + Infra |
| July | $6,000 | Full team + Infra |

**Buffer**: +$3,000 (revenue $36K - expenses $33K)

### Infrastructure Costs

**Year 1 Actual Costs**: ~$1,000/year (~$83/month with buffer)

| Service | Cost/Month | Cost/Year |
|---------|-----------|-----------|
| Vercel Pro | $20 | $240 |
| Turso Pro | $29 | $348 |
| Google Cloud | $10-20 | $120-240 |
| Domain | - | $12 |
| Misc (SendGrid, etc) | $5 | $60 |
| **TOTAL** | **~$83** | **~$1,000** |

**Gross Margin**: 90-94% (SaaS best-in-class)

### Client Targets by Stage

Based on subscription pricing ($100-200/month, ~$133 average mix):

| Stage | Monthly Need | Clients @ $100 | Clients @ $200 | Realistic Mix |
|-------|--------------|----------------|----------------|---------------|
| **Survival** | $6,000 | 60 | 30 | **45 clients** |
| **Growing** | $9,000 | 90 | 45 | **68 clients** |
| **Doing Good** | $11,000 | 110 | 55 | **83 clients** |

### Post-Launch Projections

**July 2026** (Launch + 2 months):
- Target: $6,000 MRR (survival)
- Requires: **45 paying clients** (mix of $100-200/month)
- ~15 clients per co-founder with sales responsibilities

**December 2026** (Month 7):
- Target: $9,000 MRR (growing)
- Requires: **68 paying clients**
- Co-founders reach $2,000/month each

**June 2027** (Month 13):
- Target: $11,000 MRR (doing good)
- Requires: **83 paying clients**
- Everyone at $2,500/month cap
- Expansion to Santiago begins

**December 2027** (Month 19):
- Target: $25,000 MRR ($300K ARR)
- Requires: ~190 paying clients
- Possible to hire additional staff

**2028-2029**:
- Target: $83,000 MRR ($1M ARR)
- Requires: ~556 paying clients (1.6% of Chilean market)
- National presence established
- Enterprise contracts signed

### Path to Profitability

**Survival Point**: 45 clients = $6,000 MRR
**Doing Good**: 83 clients = $11,000 MRR
**$1M ARR**: 556 clients = $83,000 MRR (achievable in 2-3 years)

**Key insight**: Modern infrastructure (Vercel + Turso + Google Cloud) creates 93% lower costs vs traditional SaaS. With only 45 clients needed for survival, LeDesign is highly capital-efficient and removes the need for external funding.

---

## Future Investment Opportunities

### The Investment Evolution Path

LeDesign is designed as a **bootstrapped-first** company, but our trajectory opens doors for strategic investment at key milestones. Here's how early supporters and future investors fit into our growth story.

### Current Stage: Pre-Seed (Donations/Early Access)

**Status**: January 2026 - May 2026

| Opportunity | Amount | What You Get |
|-------------|--------|--------------|
| Usuario Pionero | $250 | Lifetime access, no equity |
| Equipo Pionero | $1,000 | Lifetime access (3 users), no equity |
| Patrocinador Premium | $5,000 | Lifetime access (5 users), priority for future rounds |

**Purpose**: Fund development runway until sustainability ($6K MRR by July 2026)

**Current Pioneers Benefit**: All early supporters get **first right of refusal** for future investment rounds, plus a **20% discount** on any future equity purchase.

### Stage 1: Angel Round (Optional)

**Trigger**: $10K MRR achieved OR strategic partner identified
**Timeline**: Q4 2026 - Q1 2027 (if pursued)

| Parameter | Details |
|-----------|---------|
| Round Size | $50,000 - $150,000 |
| Valuation | $500K - $1M pre-money |
| Equity Offered | 10-15% |
| Ideal Investors | Chilean engineering firms, construction companies, strategic angels |

**Use of Funds**:
- Accelerate NCh validation certifications
- Hire 2 additional engineers
- Santiago market expansion
- Enterprise sales team

**Pioneer Advantage**: Patrocinador Premium holders ($5K tier) get **priority allocation** and can invest at a **15% valuation discount**.

### Stage 2: Seed Round

**Trigger**: $25K MRR and national presence established
**Timeline**: Q3 2027 - Q1 2028

| Parameter | Details |
|-----------|---------|
| Round Size | $300,000 - $500,000 |
| Valuation | $2M - $4M pre-money |
| Equity Offered | 15-20% |
| Ideal Investors | VC funds focused on LATAM, infrastructure tech investors, strategic corporates |

**Use of Funds**:
- LATAM expansion (México, Perú)
- Product team expansion (5-8 engineers)
- Enterprise features (SSO, compliance, audit)
- Marketing and brand building

**Pioneer Advantage**: All early supporters (any tier) get **10% valuation discount** and **pro-rata rights** to maintain ownership percentage.

### Stage 3: Series A

**Trigger**: $100K MRR and proven LATAM traction
**Timeline**: 2028-2029

| Parameter | Details |
|-----------|---------|
| Round Size | $2M - $5M |
| Valuation | $15M - $30M pre-money |
| Equity Offered | 15-20% |
| Ideal Investors | Tier-1 LATAM VCs, international infrastructure funds, strategic acquirers |

**Use of Funds**:
- Full LATAM coverage
- US/European market exploration
- Advanced AI features
- Potential acquisitions of complementary tools

### Exit Scenarios & Returns

**Scenario 1: Strategic Acquisition (Most Likely)**

Target acquirers: **Autodesk, Bentley Systems, Trimble, Hexagon**

| Timeline | Likely Valuation | Pioneer $5K Return |
|----------|------------------|-------------------|
| 2027 (early) | $5M - $10M | 2-4x (if invested in angel round) |
| 2028 (growth) | $20M - $40M | 8-16x (if invested in seed) |
| 2030 (mature) | $50M - $100M | 20-40x (if invested early) |

**Scenario 2: IPO Path (Ambitious)**

If LeDesign becomes the LATAM standard for engineering software:
- Target: $100M+ ARR
- Timeline: 2030-2032
- Potential valuation: $300M - $500M (3-5x ARR)

**Scenario 3: Profitable Bootstrap (Conservative)**

Continue as profitable private company:
- $1M+ ARR by 2027
- Annual dividends to shareholders
- Founders maintain control
- Steady 20-30% annual growth

### Why Invest in LeDesign?

**1. Proven Technology**
- 90% of core product already built
- Claude AI-assisted development = faster iteration
- Modern tech stack (Vercel, Turso) = 93% lower infrastructure costs

**2. Clear Market Opportunity**
- $45-60M TAM in Chile alone
- $500M+ TAM in LATAM
- No integrated competitor exists
- Chilean engineering standards create moat

**3. Capital-Efficient Model**
- $57/month infrastructure costs
- 90%+ gross margins
- Bootstrapped to sustainability
- Only raise if strategically valuable

**4. Founder-Market Fit**
- 7 years Chilean civil engineering experience
- Built by engineer who lived the problems
- Family connections in Biobío engineering community
- PhD in Hydrology (USA) for technical credibility

**5. Pioneer Advantages**
- Early supporters get preferential investment terms
- First right of refusal on all future rounds
- Valuation discounts (10-20%)
- Pro-rata rights to maintain ownership

### How to Express Investment Interest

If you're interested in future equity participation beyond the current early access tiers:

1. **Join as Patrocinador Premium ($5,000)** - Gets you priority for angel round
2. **Email**: investors@ledesign.cl
3. **Subject**: "Investment Interest - [Your Name/Company]"
4. **Include**: Investment range, timeline, strategic interest (if any)

We'll add you to our investor updates list and reach out when we open formal rounds.

**Important**: We are NOT currently raising equity investment. The current early access program offers lifetime product access, not equity. Future rounds will be announced to our community first.

---

## The Vision

### 2026: Chile Launch
- Biobío/Ñuble validation (45+ clients)
- Santiago expansion (100+ clients)
- National presence (500+ clients)
- Revenue: $300K-500K ARR

### 2027: Chilean Dominance
- 1,250+ clients across Chile
- Revenue: $1M+ ARR
- Team: 6-8 people
- Enterprise contracts with large consultancies
- Government partnerships (SERVIU, MOP)

### 2028: Latinoamérica Expansion
- México launch (similar codes, large market)
- Perú consideration
- Revenue: $3M+ ARR
- Platform in Spanish, Portuguese ready

### 2030: Industry Standard
- **The** platform Chilean engineers use
- International presence (LATAM)
- Revenue: $10M+ ARR
- Acquisition target for Autodesk, Bentley, or IPO path

### The Ultimate Goal

**Make engineering software accessible to domain experts.**

We prove the thesis:
1. Modern AI + cloud infrastructure enables domain experts to build specialized platforms
2. Domain expertise > generalist software companies for niche markets
3. Engineers defining their own schemas produces better tools

LeDesign is the proof of concept. After this works:
- Geological engineers build tools for geologists
- Architects build tools for architects
- Electrical engineers build tools for electrical engineering

**The revolution**: Software defined by those who use it, not by those who need to dominate markets.

---

## Summary: The Story in One Page

**I'm Benja Ledesma**. Chilean civil engineer (UdeC 2016), worked at LEICO with my father (2016-2019), got a PhD in Hydrology in the USA (2019-2024), saw the problem and discovered the solution.

**The problem**: Engineering data scattered in incompatible formats (PDFs, DWG, Excel), each discipline isolated, impossible to iterate or do cross-discipline analysis. Engineers fighting with file formats, not doing engineering.

**Why now**: For the first time, infrastructure is free (Vercel, Turso) and AI writes code (Claude built 90% of LeDesign). Domain experts can finally define their own data schemas instead of being forced into Big Tech's generalist formats.

**The paradigm shift**: Building this in 2015 would have cost $350,000+ minimum. In 2026, it costs $6,000 to start and $1,000/month to operate. The product is already built.

**The solution**: LeDesign - unified Chilean civil engineering platform with 3 integrated modules (structural, hydraulic, pavement). Pricing: $100/month per module or $200/month for all three.

**The business model**:
- **Survival**: 45 clients = $6,000 MRR
- **Doing Good**: 83 clients = $11,000 MRR (everyone at $2,500/month)
- **$1M ARR**: 556 clients = 1.6% of Chilean market (achievable in 2-3 years)

**Co-founder model**: Each co-founder contributes $1,000 commitment fee. If we close 2 Socios Fundadores ($10K), they get it back. If we don't, they lose $1,000. Maximum risk is capped and clear.

**The team**: 70% Benja (built everything), 10% each to Waldo (sales/connections), Waldo V. (CTO/support), Pichi (user validation). Bonuses start at $1,000-2,000/month, grow together to $2,500 cap.

**The vision**: Become the standard for Chilean civil engineering by 2027, expand to LATAM by 2028, prove that domain experts can build better tools than generalist software companies.

**Por primera vez: ingenieros definen los esquemas, no las empresas de software.**

---

*This narrative is the living document of LeDesign. All pitch materials, marketing copy, and strategic decisions derive from this source of truth.*

**Contact**: Benja Ledesma, Memphis TN USA
**Website**: ledesign.cl
**Launch**: May 2026
