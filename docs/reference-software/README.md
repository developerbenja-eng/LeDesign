# Reference Software Documentation

*Official documentation and verification examples for calibrating LeDesign modules*

---

## 📦 Storage Architecture

**Large reference files are stored in Google Cloud Storage**, not in git, to keep the repository lightweight.

### Quick Start for Team Members

When setting up your development environment:

```bash
# 1. Clone repository
git clone https://github.com/developerbenja-eng/LeDesign.git

# 2. Install dependencies
npm install

# 3. Setup environment (API keys)
npm run setup

# 4. Download reference materials (PDFs, manuals)
npm run download:refs
```

### Why GCS Instead of Git/Git LFS?

- ✅ **Cost-effective**: ~$0.02/month for 200MB vs $5/month for Git LFS
- ✅ **No bandwidth charges**: Download once, not on every clone/pull
- ✅ **Lightweight repo**: Git stays fast, doesn't track 200MB of PDFs
- ✅ **Public access**: No authentication needed to download

### GCS Bucket Details

- **Bucket**: `ledesign-reference-materials`
- **Region**: `us-central1`
- **Access**: Public read (https://storage.googleapis.com/ledesign-reference-materials/)
- **Total Size**: ~166 MB currently (HEC-RAS manuals)

Files are automatically excluded from git via `.gitignore`:
```gitignore
docs/reference-software/**/*.pdf
```

---

## Purpose

This directory contains official documentation, user manuals, and verification examples from industry-standard engineering software. These resources are used to:

1. **Understand algorithms** - Learn the mathematical methods used by established software
2. **Validate LeDesign** - Compare LeDesign outputs against known correct solutions
3. **Replicate workflows** - Ensure LeDesign can handle the same problem types
4. **Create demo content** - Show side-by-side comparisons in marketing materials

---

## Directory Structure

```
reference-software/
├── hec-ras/                    # Open channel hydraulics
├── epanet/                     # Water distribution networks
├── swmm/                       # Stormwater management
├── ram-elements/               # Structural analysis
├── civil3d/                    # Civil engineering design
└── structural-verification/    # FEA benchmark problems
```

---

## HEC-RAS (Open Channel Hydraulics)

**LeDesign Module**: Hydraulics → Open Channel

| File | Size | Description |
|------|------|-------------|
| `HEC-RAS_Users_Manual_v6.4.1.pdf` | 62 MB | Complete user manual |
| `HEC-RAS_Hydraulic_Reference_Manual_v6.5.pdf` | 23 MB | **Algorithms & equations** |
| `HEC-RAS_2D_Users_Manual_v6.6.pdf` | 56 MB | 2D modeling guide |
| `HEC-RAS_Applications_Guide_v5.0.pdf` | 24 MB | **Worked examples** |

**Key Chapters for Validation**:
- Steady flow water surface profiles (Manning's equation)
- Energy equation solver
- Bridge/culvert hydraulics
- Floodplain mapping

**Source**: [USACE Hydrologic Engineering Center](https://www.hec.usace.army.mil/software/hec-ras/documentation.aspx)

**Example Projects**: Download from HEC-RAS software or [USACE Downloads](https://www.hec.usace.army.mil/software/hec-ras/download.aspx) (422 MB example pack)

---

## EPANET (Water Distribution Networks)

**LeDesign Module**: Hydraulics → Water Networks

| File | Size | Description |
|------|------|-------------|
| `EPANET_2.2_User_Manual.pdf` | 3.4 MB | Complete user manual with algorithms |
| `Net1.inp` | 6 KB | Simple network - chlorine decay example |
| `Net2.inp` | 15 KB | Tracer study with calibration data |
| `Net3.inp` | 29 KB | North Marin Water District model |

**Key Algorithms** (Chapter 12 of manual):
- Gradient method (Todini & Pilati)
- Hazen-Williams, Darcy-Weisbach, Chezy-Manning head loss
- Extended period simulation
- Water quality routing

**Validation Networks**:
- **Net1**: 1 reservoir, 1 tank, 1 pump, 12 pipes - tests basic hydraulics
- **Net2**: Real system with calibration data - tests accuracy
- **Net3**: 2.11 MGD system, 3 tanks, 2 pumps - tests complex networks

**Source**: [EPA Water Research](https://www.epa.gov/water-research/epanet)

**Online Algorithm Reference**: [EPANET 2.2 Analysis Algorithms](https://epanet22.readthedocs.io/en/latest/12_analysis_algorithms.html)

---

## SWMM (Stormwater Management)

**LeDesign Module**: Hydraulics → Stormwater

| File | Size | Description |
|------|------|-------------|
| `SWMM5_Users_Manual.pdf` | 5.0 MB | Complete user manual |
| `SWMM5_Reference_Manual_Hydrology.pdf` | 1.8 MB | **Hydrology algorithms** |

**Key Algorithms**:
- Rainfall-runoff (SCS, Green-Ampt, Horton)
- Kinematic wave routing
- Dynamic wave routing (Saint-Venant equations)
- LID/BMP modeling

**Source**: [EPA SWMM](https://www.epa.gov/water-research/storm-water-management-model-swmm)

---

## RAM Elements (Structural Analysis)

**LeDesign Module**: Structural

| File | Size | Description |
|------|------|-------------|
| `RAM_Elements_Product_DataSheet.pdf` | 245 KB | Feature overview |
| `RAM_Elements_V16_Masonry_Manual.pdf` | 1.6 MB | Masonry design guide |

**Note**: RAM Elements is proprietary (Bentley). Full documentation requires license. These files provide:
- Feature capabilities for comparison
- Masonry wall design procedures (TMS 402)

**Access Full Docs**: [Bentley Documentation](https://docs.bentley.com/LiveContent/web/RAM%20Structural%20System%20Help-v4/en/)

**Your LEICO Data**: ETABS/RAM files in OneDrive can be used for validation
- `029_EDIFICIO FIGUZ/ETABS/` - Complete building model
- `029_EDIFICIO FIGUZ/RAM/` - Wall/beam designs

---

## Civil 3D (Civil Engineering Design)

**LeDesign Module**: Road, Pavement, Terrain

| File | Size | Description |
|------|------|-------------|
| `Civil3D_2011_Tutorials.pdf` | 9.0 MB | Step-by-step tutorials |
| `Practical_Guide_Civil3D_2025_Sample.pdf` | 742 KB | Modern workflow guide (sample) |

**Key Topics**:
- Surface creation from points
- Alignment design (horizontal curves)
- Profile design (vertical curves)
- Corridor modeling
- Quantity takeoffs

**Source**: [Autodesk Civil 3D Tutorials](https://help.autodesk.com/cloudhelp/2025/ENU/Civil3D-Tutorials/)

**Your LEICO Data**: Civil 3D files in OneDrive
- `023_PAV_EL ROBLE/022_C3D_EL ROBLE_*.dwg`
- `001_URB_GENERAL CRUZ/001-C3D-*.dwg`

---

## Structural Verification Benchmarks

**LeDesign Module**: Structural (FEA validation)

| File | Size | Description |
|------|------|-------------|
| `NAFEMS_Standard_Benchmarks_Linear_Elastic.pdf` | 1.8 MB | Industry-standard FEA benchmarks |
| `ETABS_2016_Software_Verification.pdf` | 11 MB | **ETABS verification examples** |

**NAFEMS Benchmarks** (Linear Elastic):
- LE1: Plane stress elliptic membrane
- LE2: Cylindrical shell patch test
- LE3: Hemispherical shell
- LE5: Z-section cantilever
- LE6: Skew plate
- LE10: Thick plate under pressure
- LE11: Solid cylinder/taper/sphere

**ETABS Verification Examples**:
- Modal analysis benchmarks
- Response spectrum analysis
- P-Delta effects
- Concrete/steel design checks

**Sources**:
- [NAFEMS Publications](https://www.nafems.org/publications/resource_center/p18/)
- [CSI Knowledge Base](https://wiki.csiamerica.com/display/doc/Verification+examples)

---

## Validation Workflow

### Step 1: Select Benchmark Problem
Choose a problem with known analytical or verified solution from:
- NAFEMS benchmarks (structural)
- EPANET example networks (hydraulic)
- HEC-RAS Applications Guide (open channel)
- SWMM manual examples (stormwater)

### Step 2: Model in LeDesign
Create the same model in LeDesign using equivalent:
- Geometry
- Material properties
- Boundary conditions
- Loading

### Step 3: Compare Results
Check key outputs match within acceptable tolerance:
- **Structural**: Displacements, stresses, periods, reactions
- **Hydraulic**: Pressures, flows, velocities, head losses
- **Open Channel**: Water surface elevations, velocities, Froude numbers

### Step 4: Document
Record comparison in validation report for:
- Marketing demos
- Technical documentation
- Quality assurance

---

## Additional Resources Online

### HEC-RAS
- [Example Projects (422 MB)](https://www.hec.usace.army.mil/software/hec-ras/download.aspx)
- [Training Materials](https://www.hec.usace.army.mil/training/materials.aspx)
- [Online Tutorials](https://www.hec.usace.army.mil/confluence/rasdocs/hgt/latest/tutorials)

### EPANET
- [GitHub Repository](https://github.com/USEPA/EPANET2.2)
- [OpenWaterAnalytics](https://github.com/OpenWaterAnalytics/EPANET)
- [Algorithm Documentation](https://epanet22.readthedocs.io/en/latest/12_analysis_algorithms.html)

### Structural
- [CSI Analysis Reference Manual](https://wiki.csiamerica.com/display/doc/CSI+Analysis+Reference+Manual)
- [NAFEMS Publications](https://www.nafems.org/publications/pubguide/list/)

### Chilean Codes
- NCh433 (Seismic) - Already implemented in LeDesign
- NCh432 (Wind) - Already implemented in LeDesign
- NCh691 (Water systems) - Reference for hydraulic module

---

## Total Size

**~200 MB** of reference documentation

```
hec-ras/                 165 MB
epanet/                  3.4 MB  + example networks
swmm/                    6.8 MB
ram-elements/            1.9 MB
civil3d/                 9.7 MB
structural-verification/ 12.8 MB
```

---

*Last updated: January 2026*
