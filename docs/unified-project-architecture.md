# Unified Project Architecture

## Overview

LeDesign now has a **unified project system** where all engineering disciplines are accessible from a single project interface at `/projects/[id]`. Each project can have multiple disciplines active simultaneously based on subscription flags.

---

## Architecture Components

### 1. Database Schema

**Location:** `/packages/db/src/schema.ts`

The `projects` table contains module subscription flags and usage tracking:

```typescript
// Module access flags (subscription-based)
module_structural: boolean
module_hydraulic: boolean
module_pavement: boolean
module_road: boolean
module_terrain: boolean

// Module usage tracking (for reporting)
module_structural_last_used: Date | null
module_hydraulic_last_used: Date | null
module_pavement_last_used: Date | null
module_road_last_used: Date | null
module_terrain_last_used: Date | null
```

**Key Points:**
- Each project has boolean flags for module access
- Usage timestamps track when each module was last actively used
- This data drives both UI visibility and report generation

---

### 2. Module Access Control

**Location:** `/apps/web/src/lib/modules/module-access.ts`

Provides utilities for checking module subscription access:

```typescript
// Check if a project has access to a module
await hasModuleAccess(projectId, 'structural') // returns boolean

// Get all enabled modules for a project
await getProjectModules(projectId) // returns ['structural', 'hydraulic', ...]

// Enable/disable modules
await enableModule(projectId, 'structural')
await disableModule(projectId, 'pavement')
```

**API Endpoint:** `/api/projects/[id]/modules`
- GET: List enabled modules or check specific module access
- POST: Enable or disable modules

**React Hook:** `useModuleAccess(projectId)`
```typescript
const { hasAccess, modules, loading } = useModuleAccess(projectId);

if (hasAccess('structural')) {
  // Show structural UI
}
```

---

### 3. Module Usage Tracking

**Location:** `/apps/web/src/lib/modules/module-tracking.ts`

Automatically tracks when modules are actively used for report generation:

```typescript
// Track module usage (updates last_used timestamp)
await trackModuleUsage(projectId, 'structural')

// Get usage summary for all modules
await getModuleUsageSummary(projectId)

// Get only actively-used modules (for reports)
await getActiveModulesForReport(projectId) // returns only modules that have been used
```

**API Endpoint:** `/api/projects/[id]/modules/track`
- POST: Track module usage
- GET: Get usage summary
- GET with `?report=true`: Get active modules for reporting

**React Hook:** `useModuleTracking(projectId, module)`
```typescript
// Automatically tracks usage when component is mounted and every 5 minutes
useModuleTracking(projectId, 'structural');
```

**Automatic Tracking:**
- Tracks when a panel is opened
- Updates usage timestamp every 5 minutes while active
- Used to determine which disciplines to include in project reports

---

### 4. Unified Editor Layout

**Location:** `/apps/web/src/components/editor/CivilEditorLayout.tsx`

The main unified editor that shows all discipline panels:

```typescript
const { hasAccess } = useModuleAccess(projectId);

// Sidebar buttons are conditionally rendered based on subscription
{hasAccess('structural') && <StructuralButton />}
{hasAccess('hydraulic') && <WaterNetworkButton />}
{hasAccess('road') && <RoadButton />}
{hasAccess('terrain') && <TerrainButton />}
```

**Available Panels:**
- **Structural Design** - Structural analysis (NCh 430, NCh 433, NCh 2369)
- **Water Network** - Hydraulic design (NCh 691, EPANET)
- **Sewer System** - Sewer network design
- **Road Geometry** - Road alignment
- **Terrain** - Terrain modeling

---

## Module Integration Examples

### Structural Design Panel

**Location:** `/apps/web/src/components/cad/StructuralDesignPanel.tsx`

```typescript
export function StructuralDesignPanel({ projectId }: Props) {
  // Track module usage automatically
  useModuleTracking(projectId, 'structural');

  return (
    <div>
      {/* 6 tabs: Nudos, Elementos, Materiales, Cargas, Análisis, Diseño */}
      {/* Chilean standards: NCh 430, NCh 433, NCh 2369 */}
    </div>
  );
}
```

### Water Network Panel

**Location:** `/apps/web/src/components/cad/WaterNetworkPanel.tsx`

```typescript
export function WaterNetworkPanel({ projectId, projectName, onClose }: Props) {
  // Track module usage
  useModuleTracking(projectId, 'hydraulic');

  return (
    <div>
      {/* Quick calculators for pipe hydraulics, demand, pumps, quality */}
      {/* Link to full Water Network Studio */}
      <a href={`/water-network?projectId=${projectId}`}>
        Open Network Studio
      </a>
    </div>
  );
}
```

**Water Network Studio:** Full EPANET-style network designer at `/water-network`
- Accessible via link in WaterNetworkPanel
- Can be opened standalone or with `?projectId=xxx` to link to a project
- Features: Map-centric drawing, real-time solver, demand zones, AI assistance

---

## How It All Works Together

### 1. User Opens a Project

```
User navigates to: /projects/abc123
├─ CivilEditorLayout loads
├─ useModuleAccess(abc123) fetches enabled modules
└─ Sidebar shows only subscribed module buttons
```

### 2. User Opens Structural Panel

```
User clicks "Structural" button
├─ StructuralDesignPanel renders
├─ useModuleTracking tracks usage
│   ├─ POST /api/projects/abc123/modules/track
│   └─ Updates module_structural_last_used timestamp
└─ User can now work on structural design
```

### 3. Report Generation

```
System generates project report
├─ GET /api/projects/abc123/modules/track?report=true
├─ Returns: ['structural', 'hydraulic']  // Only used modules
└─ Report includes only actively-used disciplines
```

### 4. Module Activation/Deactivation

```
Admin enables/disables module
├─ POST /api/projects/abc123/modules
│   { "module": "pavement", "action": "enable" }
├─ Database updated: module_pavement = true
└─ UI automatically reflects new access
```

---

## Benefits of Unified Architecture

### For Users
- **Single Project View** - All disciplines accessible from one place
- **Seamless Workflow** - Switch between disciplines without context switching
- **Project-Centric** - Everything related to a project is in one location

### For Development
- **Modular** - Each discipline panel is independent
- **Scalable** - Easy to add new discipline modules
- **Maintainable** - Clear separation of concerns

### For Business
- **Subscription Control** - Fine-grained access control per project
- **Usage Analytics** - Track which disciplines are actively used
- **Accurate Reporting** - Reports include only relevant disciplines

---

## Adding a New Module

To add a new discipline module:

### 1. Database Schema
Add to `projects` table in `/packages/db/src/schema.ts`:
```typescript
module_newdiscipline: boolean
module_newdiscipline_last_used: Date | null
```

### 2. Module Type
Add to `ModuleType` in `/lib/modules/module-access.ts`:
```typescript
export type ModuleType = 'structural' | 'hydraulic' | ... | 'newdiscipline';
```

### 3. Create Panel Component
Create `/components/cad/NewDisciplinePanel.tsx`:
```typescript
export function NewDisciplinePanel({ projectId }: Props) {
  useModuleTracking(projectId, 'newdiscipline');
  // Panel implementation
}
```

### 4. Integrate into CivilEditorLayout
Add button and panel rendering:
```typescript
{hasAccess('newdiscipline') && (
  <ToolButton label="New Discipline" onClick={...} />
)}

{activePanel === 'newdiscipline' && (
  <NewDisciplinePanel projectId={projectId} />
)}
```

Done! The new module will:
- Respect subscription flags
- Track usage automatically
- Appear in the unified interface
- Be included in reports when used

---

## Migration Notes

### Before (Fragmented)
```
/structural → Structural design app
/hydraulics → Water network app
/pavement → Pavement design app
/road → Road geometry app
```

### After (Unified)
```
/projects/[id] → Unified editor with all disciplines
  ├─ Structural panel
  ├─ Water Network panel (+ link to full studio)
  ├─ Sewer panel
  ├─ Road panel
  └─ Terrain panel
```

**Standalone Routes Still Available:**
- `/water-network` - Full Water Network Studio (can be linked to project)
- Other specialty tools as needed

---

## Summary

✅ **One project, multiple disciplines**
✅ **Subscription-based access control**
✅ **Automatic usage tracking for reporting**
✅ **Modular, scalable architecture**
✅ **Chilean standards integration**

This architecture provides a professional, integrated experience while maintaining flexibility for subscription management and accurate project reporting.
