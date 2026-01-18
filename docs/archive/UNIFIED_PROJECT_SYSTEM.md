# Unified Project System - Implementation Guide

**Date**: January 16, 2026
**Status**: ✅ Implemented and Ready for Testing

---

## What Changed

The project system has been **unified** so all projects have access to all design modules. Previously, projects were separated into "Civil" and "Structural" types, which created unnecessary complexity and prevented users from accessing all features.

---

## Key Changes

### 1. Dashboard UI Updates

**Removed**:
- ❌ Civil/Structural filter buttons (All, Civil, Structural)
- ❌ Project type badges in project list
- ❌ Different icons for civil vs structural projects
- ❌ Separate routing logic based on project type

**Updated**:
- ✅ All projects load from single `/api/projects` endpoint
- ✅ All projects use unified FileText icon
- ✅ All projects route to `/projects/[id]` (civil editor with all modules)
- ✅ Delete functionality uses single endpoint

**Files Modified**:
- [apps/web/src/app/dashboard/page.tsx](apps/web/src/app/dashboard/page.tsx:36-45)
- [apps/web/src/components/dashboard/ProjectsList.tsx](apps/web/src/components/dashboard/ProjectsList.tsx:6-19)
- [apps/web/src/components/dashboard/QuickAccessPanel.tsx](apps/web/src/components/dashboard/QuickAccessPanel.tsx:70-79)

### 2. Module Access

**All Projects Now Have Access To**:
1. **Hydraulic Design** (Diseño Hidráulico) - Water distribution networks
2. **Sewer Systems** (Aguas Servidas) - Sanitary sewer networks
3. **Stormwater** (Aguas Lluvias) - Stormwater drainage
4. **Structural Design** (Diseño Estructural) - Structural analysis & modeling
5. **Pavement Design** (Diseño de Pavimentos) - Road and pavement design
6. **General CAD** - General CAD drawing tools

**How It Works**:
- Quick Access Panel shows all 6 module cards
- Clicking any card opens that module in the design room
- All modules route to `/projects/[id]?designType=<module>`
- The civil editor layout dynamically loads the appropriate panel

---

## Available UI Components

### Hydraulic Design UI
**Component**: [WaterNetworkPanel.tsx](apps/web/src/components/cad/WaterNetworkPanel.tsx)

**Features**:
- Network topology design
- Hydraulic calculations (Hazen-Williams, Darcy-Weisbach)
- Pipe sizing and head loss analysis
- Demand analysis (population, land use, climate factors)
- Pump sizing and selection
- Water quality standards (Chilean NCh standards)
- Interactive 3D hydraulics viewer

**Tabs**: Network | Hydraulics | Demand | Pump | Quality | Reference

### Structural Design UI
**Component**: [StructuralDesignPanel.tsx](apps/web/src/components/cad/StructuralDesignPanel.tsx)

**Features**:
- Node and joint definition
- Structural members (beams, columns, braces)
- Material properties and libraries
- Load cases and combinations
- Static and dynamic analysis
- Design code checks (AISC, ACI, etc.)
- 3D structural visualization

**Tabs**: Nudos | Elementos | Materiales | Cargas | Análisis | Diseño

### Alternative Structural Editor
**Component**: [EditorLayout.tsx](apps/web/src/components/editor/EditorLayout.tsx)

Full 3D structural modeling environment with:
- Three.js-based 3D viewport
- Resizable panels (tree view, properties, results)
- Command palette (⌘K)
- Real-time analysis results
- AI-powered structural assistance

---

## Manual Testing Steps

### Test 1: Verify Filter Buttons Removed

1. Navigate to: `http://localhost:4000/dashboard`
2. Log in with valid credentials
3. Check the header area
4. **Expected**: Only search box and "New Project" button visible
5. **Expected**: NO "All", "Civil", "Structural" filter buttons

### Test 2: Create Unified Project

1. Click "New Project" button
2. Enter project details:
   - Name: "Test Unified Project"
   - Description: "Testing all module access"
3. Click "Next"
4. Choose location or skip
5. **Expected**: Redirects to `/projects/[id]`
6. **Expected**: Civil editor loads with design room

### Test 3: Verify Module Access

1. In the project editor, look at bottom panel
2. **Expected**: "Quick Access to Design Room" panel visible
3. **Expected**: All 6 module cards visible:
   - Diseño Hidráulico (blue)
   - Aguas Servidas (amber)
   - Aguas Lluvias (sky blue)
   - Diseño Estructural (purple)
   - Diseño de Pavimentos (slate)
   - General (emerald)

### Test 4: Test Hydraulic Design Access

1. Click "Diseño Hidráulico" card
2. **Expected**: URL updates to `/projects/[id]?designType=water`
3. **Expected**: WaterNetworkPanel opens in right side panel
4. **Expected**: Panel shows tabs: Network, Hydraulics, Demand, Pump, Quality
5. Test network calculations work

### Test 5: Test Structural Design Access

1. Click "Diseño Estructural" card
2. **Expected**: URL updates to `/projects/[id]?designType=structural`
3. **Expected**: StructuralDesignPanel opens in right side panel
4. **Expected**: Panel shows tabs: Nudos, Elementos, Materiales, Cargas, Análisis, Diseño
5. Try adding a node or member

### Test 6: Verify Project List Shows Unified Projects

1. Return to dashboard (`/dashboard`)
2. Check projects list on right side
3. **Expected**: Test project appears in list
4. **Expected**: Single icon (FileText, blue color)
5. **Expected**: NO type badge displayed
6. Click project name
7. **Expected**: Navigates to `/projects/[id]` (not `/projects/[id]/editor`)

### Test 7: Verify Delete Works

1. Hover over test project in list
2. **Expected**: Trash icon appears on right
3. Click trash icon
4. **Expected**: Delete confirmation modal appears
5. **Expected**: Modal shows project name
6. **Expected**: NO project type mentioned
7. Click "Delete Project"
8. **Expected**: Project removed from list

---

## Architecture Diagram

```
Dashboard
    │
    ├─ ProjectsMap (shows all projects)
    ├─ ProjectsList (unified list)
    └─ QuickAccessPanel (all 6 modules)
        │
        └─ Clicking any module card →
            │
            /projects/[id]?designType=<module>
            │
            └─ CivilEditorLayout
                │
                ├─ Design Type → water → WaterNetworkPanel
                ├─ Design Type → sewer → SewerPanel
                ├─ Design Type → stormwater → StormwaterPanel
                ├─ Design Type → structural → StructuralDesignPanel
                ├─ Design Type → pavement → RoadGeometryPanel
                └─ Design Type → general → (default CAD tools)
```

---

## API Endpoints

### Unified Project Endpoints
- `GET /api/projects` - List all user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `DELETE /api/projects/[id]` - Delete project

### Legacy Endpoints (Optional - Can Be Deprecated)
- `GET /api/structural/projects` - Old structural-only endpoint
- Can remain for backward compatibility or be removed

---

## Database Schema

All projects stored in `projects` table:

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Geographic data
  center_lat REAL,
  center_lon REAL,
  bounds_south REAL,
  bounds_north REAL,
  bounds_west REAL,
  bounds_east REAL,
  region TEXT,
  comuna TEXT,

  -- Project metadata
  project_type TEXT, -- Optional: 'pavement', 'sewer', 'drainage', 'mixed', null
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Note**: The `project_type` field is optional and does NOT restrict module access. It's only for organizational/filtering purposes if needed in the future.

---

## Module Tracking

Each module automatically tracks usage when opened:

```typescript
// Inside each panel component
useModuleTracking(projectId, 'hydraulic'); // or 'structural', 'pavement', etc.
```

This creates records in `module_usage` table for:
- Billing/subscription management
- Usage analytics
- Feature adoption tracking

---

## Benefits of Unified System

1. **Simpler UX** - No need to choose project type upfront
2. **More Flexible** - Access any module at any time
3. **Better Workflow** - Switch between disciplines seamlessly
4. **Easier Onboarding** - One project type to understand
5. **Future-Proof** - Easy to add new modules without type restrictions

---

## Next Steps (Optional Improvements)

### Short Term
- [ ] Add module favorites/recents to Quick Access
- [ ] Add "Recently Used" section showing last 3 modules
- [ ] Add module usage statistics to project details

### Medium Term
- [ ] Add inter-module data sharing (e.g., structural loads → foundation design)
- [ ] Add module templates for common workflows
- [ ] Add module permissions/subscriptions per user

### Long Term
- [ ] Deprecate `/api/structural/projects` endpoint entirely
- [ ] Migrate any structural-specific data to unified schema
- [ ] Add BIM integration across all modules

---

## Troubleshooting

### Issue: "Civil" and "Structural" buttons still visible
**Solution**: Clear browser cache and hard refresh (`Cmd+Shift+R`)

### Issue: Quick Access panel not showing all modules
**Solution**: Check [QuickAccessPanel.tsx](apps/web/src/components/dashboard/QuickAccessPanel.tsx:9-64) has all 6 design types defined

### Issue: Module panel not opening when clicked
**Solution**: Check [CivilEditorLayout.tsx](apps/web/src/components/editor/CivilEditorLayout.tsx:127-145) has correct design type → panel mapping

### Issue: Projects still showing type badges
**Solution**: Check [ProjectsList.tsx](apps/web/src/components/dashboard/ProjectsList.tsx) removed type-based rendering

---

## Testing Checklist

- [ ] Dashboard loads without filter buttons
- [ ] Can create new project
- [ ] Quick Access shows 6 modules
- [ ] Can click Hydraulic Design module
- [ ] WaterNetworkPanel opens
- [ ] Can click Structural Design module
- [ ] StructuralDesignPanel opens
- [ ] Can switch between modules
- [ ] Project appears in unified list
- [ ] Can delete project without errors
- [ ] Module tracking records usage

---

## Support

For questions or issues:
- Check dev server logs at `/tmp/claude/-Users-benjaledesma-Benja/tasks/ba63d55.output`
- Review component implementations in `apps/web/src/components/`
- Test with browser DevTools Network tab open

**Status**: ✅ Ready for Production Testing
