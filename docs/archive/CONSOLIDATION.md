# LeDesign Consolidation Plan

**Goal**: Merge leleCAD and lele-design into the unified LeDesign monorepo

---

## Current Status

### ✅ LeDesign Monorepo - Foundation Complete
- TypeScript build system working (9 packages)
- Turborepo configuration
- Web app shell with Next.js 14
- Authentication package (@ledesign/auth)
- Database package (@ledesign/db) with unified schema
- Core engineering packages:
  - @ledesign/structural
  - @ledesign/pavement
  - @ledesign/road
  - @ledesign/hydraulics
  - @ledesign/terrain
  - @ledesign/chilean-codes

### 📦 leleCAD - Advanced CAD Features to Migrate
**Location**: `/Users/benjaledesma/Benja/leleCAD`

**Key Components**:
- **GeoCanvas** - Main CAD drawing interface
- **3D Surface Viewer** - Terrain visualization with Three.js
- **AI Assistant** - Natural language CAD operations
- **Georeferencing Tool** - Coordinate system management
- **IDE Data Browser** - Project data exploration

**Infrastructure Panels**:
- SewerPanel - Sewer network design
- StormwaterPanel - Stormwater management
- OpenChannelPanel - Open channel hydraulics
- SurfaceGeneratorPanel - Terrain surface creation
- StandardDetailsPanel - Engineering details library

**Calculation Libraries** (`src/lib/`):
- `urban-road/` - Urban road design
- `water-network/` - Water distribution systems
- `surface-ai/` - AI-powered surface generation
- `sewer/` - Sewer hydraulics
- `road-geometry/` - Road alignment geometry
- `stormwater/` - Stormwater calculations
- `pavement/` - Pavement design (AASHTO)
- `open-channel/` - Manning's equation, flow profiles
- `triangulation/` - Delaunay triangulation
- `cubicacion/` - Earthwork volume calculations
- `reports/` - PDF/LaTeX report generation
- `export/` - DXF/DWG export utilities
- `validation/` - Data validation utilities

**Database**: 38MB SQLite database with real project data

### 📐 lele-design - Structural Design Plan to Migrate
**Location**: `/Users/benjaledesma/Benja/lele-design`

**PLAN.md Status**: Marked as ✅ COMPLETE (9 phases)

**Key Features from Plan**:
1. Wall & Slab CRUD APIs
2. ACI 318 concrete wall design checks (Chapter 11)
3. ACI 318 slab design checks (Chapter 21)
4. TMS 402 masonry wall design integration
5. Shell element FEM formulation (Quad4 isoparametric)
6. Mesh generation for walls and slabs
7. Design visualization (D/C ratio coloring)
8. ResultsPanel integration for shell elements
9. RebarSectionViewer component

**Implementation Status**: Needs verification if code exists or just plan

---

## Migration Phases

### Phase 1: Database Integration (Week 1)
**Priority**: Critical - Foundation for everything

- [ ] Connect NextAuth to actual database (update [apps/web/src/lib/auth.ts](apps/web/src/lib/auth.ts:36-42))
- [ ] Implement user registration API route
- [ ] Add project CRUD operations
- [ ] Run database migrations
- [ ] Test authentication flow end-to-end

**Files to Modify**:
- `apps/web/src/lib/auth.ts` (uncomment database queries)
- `apps/web/src/app/api/auth/register/route.ts` (new)
- `apps/web/src/app/api/projects/route.ts` (new)
- `packages/db/src/migrate.ts` (run on startup)

---

### Phase 2: 3D Structural Editor (Week 2-3)
**Priority**: High - Core functionality

Based on plan at `/Users/benjaledesma/.claude/plans/happy-wondering-bunny.md`

**Components to Create**:
- [ ] EditorLayout.tsx - Main layout orchestrator
- [ ] Toolbar with selection, drawing, view tools
- [ ] Canvas3D with Scene, Grid, OrbitControls
- [ ] Element mesh components:
  - [ ] NodeMesh.tsx (sphere)
  - [ ] BeamMesh.tsx (extruded section)
  - [ ] ColumnMesh.tsx (extruded profile)
  - [ ] BraceMesh.tsx (diagonal member)
  - [ ] WallMesh.tsx (extruded boundary)
  - [ ] SlabMesh.tsx (horizontal surface)
- [ ] PropertiesPanel for element editing
- [ ] TreePanel for model hierarchy
- [ ] Command pattern for undo/redo

**State Management**:
- [ ] Zustand store with slices (model, selection, viewport, history)
- [ ] Command executor for UI + AI operations

**Files to Create**: ~30 new component files under `apps/web/src/components/editor/`

---

### Phase 3: Migrate GeoCanvas from leleCAD (Week 4)
**Priority**: High - CAD drawing capability

**Source**: `/Users/benjaledesma/Benja/leleCAD/src/components/cad/GeoCanvas.tsx`

**Strategy**: Extract core CAD engine and adapt to monorepo structure

- [ ] Create `packages/cad/` package
- [ ] Extract drawing primitives (line, polyline, arc, circle)
- [ ] Port snap system
- [ ] Migrate coordinate transformation utilities
- [ ] Add CAD toolbar to web app
- [ ] Integrate with terrain module

**New Package Structure**:
```
packages/cad/
├── src/
│   ├── canvas/
│   │   ├── GeoCanvas.tsx
│   │   └── Renderer.ts
│   ├── tools/
│   │   ├── LineTool.ts
│   │   ├── PolylineTool.ts
│   │   └── SelectTool.ts
│   └── utils/
│       ├── snap.ts
│       └── transform.ts
└── package.json
```

---

### Phase 4: Migrate Infrastructure Libraries (Week 5-6)
**Priority**: Medium - Module completeness

**From leleCAD `src/lib/`**:

#### 4.1 Water/Sewer Systems
- [ ] Migrate `water-network/` → `packages/hydraulics/src/networks/`
- [ ] Migrate `sewer/` → `packages/hydraulics/src/sewer/`
- [ ] Migrate `stormwater/` → `packages/hydraulics/src/stormwater/`
- [ ] Create SewerPanel component in web app
- [ ] Create StormwaterPanel component

#### 4.2 Road Design
- [ ] Migrate `urban-road/` → `packages/road/src/urban/`
- [ ] Migrate `road-geometry/` → `packages/road/src/geometry/`
- [ ] Enhance existing road module

#### 4.3 Terrain/Surface
- [ ] Migrate `surface-ai/` → `packages/terrain/src/ai/`
- [ ] Migrate `triangulation/` → `packages/terrain/src/triangulation/`
- [ ] Migrate `cubicacion/` → `packages/terrain/src/earthwork/`
- [ ] Migrate `interpolation/` → `packages/terrain/src/interpolation/`
- [ ] Create SurfaceGeneratorPanel
- [ ] Create 3D SurfaceViewer

#### 4.4 Pavement (Already exists - verify completeness)
- [ ] Compare leleCAD `pavement/` with `packages/pavement/src/`
- [ ] Migrate any missing features

---

### Phase 5: Wall & Slab Design Implementation (Week 7)
**Priority**: High - Structural module completion

**From lele-design PLAN.md** (verify if code exists)

- [ ] Verify CRUD APIs for walls/slabs exist in lele-design
- [ ] Migrate ACI 318 wall design functions
- [ ] Migrate ACI 318 slab design functions
- [ ] Migrate TMS 402 masonry wall integration
- [ ] Create WallMesh and SlabMesh components
- [ ] Implement design visualization features

**Files to Check in lele-design**:
- `src/lib/structural/design/aci-concrete.ts`
- `src/lib/structural/design/tms-masonry.ts`
- `src/app/api/structural/projects/[id]/walls/route.ts`
- `src/app/api/structural/projects/[id]/slabs/route.ts`

---

### Phase 6: Shell Element FEM Analysis (Week 8)
**Priority**: High - Critical for wall/slab design

**From plan at `/Users/benjaledesma/.claude/plans/happy-wondering-bunny.md`**

- [ ] Implement Quad4 shell element formulation
- [ ] Create mesh generation for walls and slabs
- [ ] Integrate shell elements into static analysis
- [ ] Implement area load distribution
- [ ] Store shell_results in database
- [ ] Validate with benchmark test cases

**Files to Create**:
- `packages/structural/src/analysis/shell-element.ts`
- `packages/structural/src/analysis/mesh-generation.ts`
- Modify: `packages/structural/src/analysis/static-analysis.ts`

---

### Phase 7: AI Assistant & Tools (Week 9)
**Priority**: Medium - Enhanced UX

**From leleCAD**:
- [ ] Migrate AIAssistant component
- [ ] Port command parser
- [ ] Integrate with structural editor command pattern
- [ ] Add natural language model creation
- [ ] Create AIChatPanel for structural editor

**Files to Migrate**:
- `leleCAD/src/components/cad/AIAssistant.tsx`
- Adapt to LeDesign command pattern

---

### Phase 8: Report Generation & Export (Week 10)
**Priority**: Low - Nice to have

**From leleCAD**:
- [ ] Migrate `reports/` library
- [ ] Migrate `latex/` template system
- [ ] Migrate `export/` utilities (DXF/DWG)
- [ ] Create report generation UI
- [ ] Add PDF export for design calculations

---

### Phase 9: Advanced Features (Week 11+)
**Priority**: Low - Future enhancements

- [ ] Georeferencing tools
- [ ] Map integration (Mapbox/Leaflet)
- [ ] Data discovery panel
- [ ] Study site wizard
- [ ] Standard details library
- [ ] Real-time collaboration
- [ ] Cloud deployment

---

## File Organization Strategy

### Keep Modular
- Each engineering domain stays in its package (`@ledesign/structural`, `@ledesign/hydraulics`, etc.)
- Web app only imports from packages, never duplicates logic
- Shared utilities go to appropriate package

### Avoid Duplication
- If leleCAD and lele-design have overlapping code, keep the most complete version
- Compare implementations before migrating

### Database Consolidation
- Merge leleCAD's SQLite database schema into LeDesign schema
- Use prefixed table names (e.g., `hydraulic_pipes`, `sewer_networks`)
- Keep all data in single Turso/LibSQL database

---

## Critical Decisions

### 1. Which Code to Keep?
**Rule**: When both leleCAD and lele-design have similar features, compare:
- Code quality
- Test coverage
- Integration completeness
- Choose the better implementation

### 2. Package Structure
**Decision**: Create new packages as needed:
- `@ledesign/cad` - CAD drawing primitives
- `@ledesign/reports` - Report generation
- `@ledesign/export` - DXF/DWG export

### 3. 3D Rendering
**Decision**: Use React Three Fiber consistently
- leleCAD uses plain Three.js
- Refactor to R3F for React integration
- Leverage existing Three.js expertise

### 4. Database Migration
**Strategy**: Incremental migration
- Start with user/project tables (already done)
- Migrate CAD data schema from leleCAD
- Keep backward compatibility during transition

---

## Success Criteria

### Phase 1-3 Complete (MVP)
- ✅ User can sign in/register
- ✅ User can create projects
- ✅ 3D structural editor functional
- ✅ Can create beams, columns, walls, slabs
- ✅ Can run basic analysis

### Phase 4-6 Complete (Feature Parity)
- ✅ All infrastructure modules migrated
- ✅ Wall & slab design checks working
- ✅ Shell FEM analysis running
- ✅ Terrain/surface tools available

### Phase 7-9 Complete (Enhanced)
- ✅ AI assistant integrated
- ✅ Report generation working
- ✅ Export to CAD formats
- ✅ Advanced georeferencing tools

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Code incompatibility between projects | High | Review before migrating, refactor as needed |
| Database schema conflicts | Medium | Use prefixed table names, test migrations |
| Performance with large models | High | Optimize FEM solver, use web workers |
| Three.js version conflicts | Low | Standardize on v0.171.0 |
| Breaking changes during migration | Medium | Keep old projects intact until migration complete |

---

## Timeline Summary

| Phase | Duration | Priority | Status |
|-------|----------|----------|--------|
| 1. Database Integration | 1 week | Critical | 🔴 Pending |
| 2. 3D Structural Editor | 2 weeks | High | 🔴 Pending |
| 3. GeoCanvas Migration | 1 week | High | 🔴 Pending |
| 4. Infrastructure Libraries | 2 weeks | Medium | 🔴 Pending |
| 5. Wall/Slab Design | 1 week | High | 🔴 Pending |
| 6. Shell FEM Analysis | 1 week | High | 🔴 Pending |
| 7. AI Assistant | 1 week | Medium | 🔴 Pending |
| 8. Reports & Export | 1 week | Low | 🔴 Pending |
| 9. Advanced Features | 2+ weeks | Low | 🔴 Pending |

**Total Estimated Time**: 12+ weeks for full migration

---

## Next Immediate Actions

1. **Start with Phase 1: Database Integration**
   - Wire up NextAuth to database
   - Test user registration
   - Verify project CRUD works

2. **Verify lele-design Implementation Status**
   - Check if wall/slab design code actually exists or is just a plan
   - If code exists, migrate it
   - If only plan exists, implement it

3. **Create `@ledesign/cad` Package**
   - Begin migrating GeoCanvas
   - Set up package structure
   - Port core drawing primitives

---

**Last Updated**: January 15, 2026
**Status**: Migration planning complete, ready to execute Phase 1
