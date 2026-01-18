# LEICO Calibration Data Reference

*Reference guide for accessing historical LEICO engineering project data for LeDesign calibration and demo videos*

---

## Purpose

This document catalogs engineering projects from LEICO (2015-2019) stored in OneDrive. These projects will be used to:

1. **Calibrate LeDesign modules** - Compare outputs against proven designs done with industry-standard software (ETABS, RAM, Civil 3D)
2. **Create demo videos** - Show LeDesign replicating real Chilean engineering projects
3. **Validate NCh compliance** - Verify LeDesign's Chilean code implementations match professional work

---

## Accessing OneDrive via CLI

### Prerequisites

Microsoft Graph CLI is installed at `~/.local/bin/mgc`

### Authentication

If session expired, re-authenticate:

```bash
~/.local/bin/mgc login --scopes "Files.ReadWrite.All"
```

Follow the device code flow:
1. Go to https://microsoft.com/devicelogin
2. Enter the code displayed in terminal
3. Sign in with benjaledesma@leicoltda.com

### Verify Access

```bash
# List drives
~/.local/bin/mgc drives list

# Your main OneDrive ID is: CA5613F09764E903
```

---

## Navigation Commands

### List Folder Contents

```bash
# List LEICO root
~/.local/bin/mgc drives items children list \
  --drive-id CA5613F09764E903 \
  --drive-item-id "root:/LEICO:" | jq -r '.value[] | .name'

# List PROYECTOS
~/.local/bin/mgc drives items children list \
  --drive-id CA5613F09764E903 \
  --drive-item-id "root:/LEICO/PROYECTOS:" | jq -r '.value[] | .name'

# List specific project (replace PROJECT_NAME)
~/.local/bin/mgc drives items children list \
  --drive-id CA5613F09764E903 \
  --drive-item-id "root:/LEICO/PROYECTOS/PROJECT_NAME:" | jq -r '.value[] | .name'
```

### Download Files

```bash
# Download a single file
~/.local/bin/mgc drives items content get \
  --drive-id CA5613F09764E903 \
  --drive-item-id "root:/LEICO/PROYECTOS/029_EDIFICIO FIGUZ/ETABS/029_FIGUZ_E.e2k:" \
  --output ./downloads/029_FIGUZ_E.e2k

# Get file metadata (size, dates, etc.)
~/.local/bin/mgc drives items get \
  --drive-id CA5613F09764E903 \
  --drive-item-id "root:/LEICO/PROYECTOS/029_EDIFICIO FIGUZ/ETABS/029_FIGUZ_E.EDB:"
```

### Search Files

```bash
# Search for files by name
~/.local/bin/mgc drives search \
  --drive-id CA5613F09764E903 \
  --q "029_FIGUZ"
```

---

## LEICO Folder Structure

```
LEICO/
├── PROYECTOS/                    # 33 engineering projects
│   ├── 001_URB_GENERAL CRUZ/     # Urban development (complete)
│   ├── 002_SS_QUILLÓN ORIENTE/   # Sewer system
│   ├── 003_EST_ED OSSA/          # Structural - building
│   ├── ...
│   ├── 029_EDIFICIO FIGUZ/       # Structural - multi-story (ETABS+RAM)
│   └── ...
├── COLECCIÓN PLANOS ESTRUCTURALES/  # 44 structural drawing templates
├── GUIAS Y MANUALES/             # Reference materials (ACI, NCh, manuals)
├── Espectro Nch 2369/            # Seismic spectrum spreadsheets
├── DETALLES/                     # Construction details
└── COTIZACIONES/                 # Quotes/proposals
```

---

## Project Inventory

### Structural Projects (EST_) - 8 projects

| ID | Project | Description | Key Data |
|----|---------|-------------|----------|
| 003 | EST_ED OSSA | Building | DWG structural drawings |
| 006 | EST_EDIFICIO LIBERTAD | Building | DWG files |
| 007 | EST_EDIFICIO PRATT | Building | DWG files |
| 008 | MC_MURO SAN NICOLAS | Retaining wall | RAM analysis |
| 009 | EST_EDIFICIO VICUÑA MACKENA | Building | DWG files |
| 010 | EST_GALPON INDEPENDENCIA | Industrial shed | DWG files |
| 014 | EST_CASA HUERTOS FAMILIARES | House | DWG files |
| 019 | EST_CASA LIMACHE | House | DWG files |
| 025 | EST_FOCOS ILUMINACION_QUILLON | Light poles | DWG files |
| **029** | **EDIFICIO FIGUZ** | **Multi-story building** | **ETABS (.EDB, .e2k) + RAM (.fem, .etz) + DWG** |
| 27 | ESTRUCTURA NAAMAN F_PARRAL | Structure | DWG files |

### Pavement Projects (PAV_) - 5 projects

| ID | Project | Items | Key Data |
|----|---------|-------|----------|
| 011 | PAV_LOTEO QUELTEHUE | 6 | Basic pavement |
| **015** | **PAV_COLLIPULLI 2018** | **42** | **Soil mechanics, stormwater calcs, SERVIU docs** |
| 021 | PAV_AGUA LINDA B QUILLON | 23 | C3D files |
| 022 | PAV_LAS MARIPOSAS | 61 | Full documentation |
| **023** | **PAV_EL ROBLE** | **67** | **C3D, cubicaciones, EETT, memoria, profiles** |

### Urban/Hydraulic Projects (URB_, SS_) - 5 projects

| ID | Project | Systems | Key Data |
|----|---------|---------|----------|
| **001** | **URB_GENERAL CRUZ** | **AA.LL + AA.PP + AA.SS + PAV** | **Complete urban: C3D, calcs, SERVIU docs** |
| 002 | SS_QUILLÓN ORIENTE | AA.PP + AA.SS | Sewer + water network |
| 004 | URB_MONTE CRUZ | Urban subdivision | C3D files |
| 005 | URB_CONDOMINIO QUILLÓN | Subdivision | Basic files |
| 016 | SS_SANTA MARGARITA 18 SEPT | Sewer | Network design |

### Access Road Projects (ACC_) - 4 projects

| ID | Project | Items | Key Data |
|----|---------|-------|----------|
| 012 | ACC_VALLE CENTRAL | 1 | Basic |
| 017 | ACC_CORONEL | 16 | Road design |
| 024 | ACC_VIRGINIO GOMEZ | 4 | Basic |
| 026 | ACCESOS PyH | 12 | Access roads |
| **028** | **ACC_CANCHA CORONEL** | **60** | **Complete access road project** |

### Other Projects

| ID | Project | Type |
|----|---------|------|
| 013 | RIESGO_CASA LONCO | Risk assessment |
| 017 | TP_LOTEO SANTA AUGUSTA | Land subdivision |
| 018 | OA_KM2 RUTA750 QUILLON | Drainage structures |
| 030 | RODAMENDEZ_TALCA | Mixed |
| 031 | Pemuco 2019 | Mixed |

---

## Recommended Calibration Projects

### Priority 1: Structural Calibration

**Project**: `029_EDIFICIO FIGUZ`

**Why**: Complete multi-story building with:
- ETABS seismic analysis (NCh433)
- RAM Elements wall/beam design
- Multiple iterations (versions A through H)
- Exportable formats (.e2k text format)

**Files to Download**:
```bash
# ETABS model (text format - can parse)
root:/LEICO/PROYECTOS/029_EDIFICIO FIGUZ/ETABS/029_FIGUZ_E.e2k

# ETABS database
root:/LEICO/PROYECTOS/029_EDIFICIO FIGUZ/ETABS/029_FIGUZ_H3.EDB

# RAM model
root:/LEICO/PROYECTOS/029_EDIFICIO FIGUZ/RAM/ESTRUCTURA FIGUZ-B.fem

# Structural drawings
root:/LEICO/PROYECTOS/029_EDIFICIO FIGUZ/PLANOS ESTRUCTURAS/
```

**Calibration Goals**:
- Match fundamental periods (T1, T2, T3)
- Match base shear (Qo)
- Match story drifts
- Match member forces

---

### Priority 2: Pavement Calibration

**Project**: `023_PAV_EL ROBLE`

**Why**: Complete pavement project with:
- Civil 3D models with profiles
- Technical specifications (EETT)
- Design memory
- Cubicaciones (quantities)
- SERVIU approval process docs

**Files to Download**:
```bash
# Civil 3D model
root:/LEICO/PROYECTOS/023_ PAV_ EL ROBLE/022_C3D_EL ROBLE_D.dwg

# Technical specs
root:/LEICO/PROYECTOS/023_ PAV_ EL ROBLE/023-EETT-PAV-A.pdf

# Design memory
root:/LEICO/PROYECTOS/023_ PAV_ EL ROBLE/023-MEMORIA-PAV-B.pdf

# Quantities
root:/LEICO/PROYECTOS/023_ PAV_ EL ROBLE/023_Cubicaciones_C.xlsx
```

**Calibration Goals**:
- Match pavement layer thicknesses
- Match CBR analysis results
- Match quantity takeoffs

---

### Priority 3: Hydraulic Calibration

**Project**: `001_URB_GENERAL CRUZ`

**Why**: Complete urban project with all three water systems:
- AA.LL (Stormwater drainage)
- AA.SS (Sanitary sewer)
- AA.PP (Potable water)

**Files to Download**:
```bash
# Stormwater design
root:/LEICO/PROYECTOS/001_URB_GENERAL CRUZ/AA.LL/001-C3D-AL.dwg
root:/LEICO/PROYECTOS/001_URB_GENERAL CRUZ/AA.LL/Cubicaciones.xlsx

# Sanitary sewer
root:/LEICO/PROYECTOS/001_URB_GENERAL CRUZ/AA.SS/001-C3D-AS.dwg

# Potable water
root:/LEICO/PROYECTOS/001_URB_GENERAL CRUZ/AA.PP/
```

**Calibration Goals**:
- Match pipe diameters
- Match flow velocities
- Match hydraulic slopes
- Match network topology

---

## Reference Materials

Located in `LEICO/GUIAS Y MANUALES/`:

| File | Description |
|------|-------------|
| `Especro NCH 2369.xlsx` | Seismic spectrum for industrial structures |
| `aci 318-08.pdf` | ACI concrete code |
| `especificacion_ansi-aisc_360-10...pdf` | Steel design code |
| `103230924-Manual-RAM-ELEMENTS-12-5.pdf` | RAM Elements manual |
| `Bienvenido_a_ETABS.pdf` | ETABS manual |
| `Manual de Carreteras/` | Chilean road design manual |
| `Plan Maestro de Aguas Lluvias/` | Stormwater master plan |

---

## Demo Video Plan

### Video 1: "ETABS vs LeDesign - Seismic Analysis Comparison"

1. Show original ETABS model of Edificio FIGUZ
2. Input same geometry/loads into LeDesign
3. Run NCh433 seismic analysis
4. Compare results side-by-side
5. Highlight: "Same results, one integrated platform"

### Video 2: "Complete Urban Project in LeDesign"

1. Show General Cruz project scope
2. Design water network in LeDesign
3. Design sewer in LeDesign
4. Design stormwater in LeDesign
5. Design pavement in LeDesign
6. Generate all documentation
7. Highlight: "4 software → 1 platform"

### Video 3: "From Topography to Pavement Design"

1. Import terrain data from El Roble project
2. Design alignment in LeDesign
3. Generate profiles
4. Design pavement structure
5. Generate quantities
6. Highlight: "Civil 3D workflow, but simpler"

---

## Quick Reference

```bash
# OneDrive Drive ID
CA5613F09764E903

# LEICO path
root:/LEICO:

# Check auth status
~/.local/bin/mgc me get

# Re-login if needed
~/.local/bin/mgc login --scopes "Files.ReadWrite.All"
```

---

*Last updated: January 2026*
*Account: benjaledesma@leicoltda.com*
