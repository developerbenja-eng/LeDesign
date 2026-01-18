# New UX Implementation - Dashboard & Design Room

This document summarizes the new user experience implementation for the LeDesign civil engineering platform.

## Overview

The application has been redesigned with two main areas:
1. **Dashboard** - Project management and navigation hub
2. **Design Room** - Enhanced CAD interface with modular design types

---

## 1. Dashboard (`/dashboard`)

### Layout Structure (2x2 Grid)

The dashboard uses a 2-row, 2-column grid layout:

#### Top Row (Split Columns)

**Left: Projects Map**
- Interactive Leaflet map showing project locations
- Blue markers: Civil projects
- Purple markers: Structural projects
- Grey marker at user's address: Groups all projects without location
- Click any marker to navigate to that project
- Auto-fits bounds to show all projects
- Legend shows project counts by type

**Right: Projects List**
- Scrollable list of all projects
- Displays: name, type, description, last updated date
- Location indicator (green pin) for georeferenced projects
- Hover actions: Delete button
- Click to navigate to project detail

#### Bottom Row (Full Width)

**Quick Access Panel**
- Six design discipline buttons with gradient icons:
  - **Diseño Hidráulico** (Hydraulic Design) - Blue
  - **Aguas Servidas** (Sewer Systems) - Amber
  - **Aguas Lluvias** (Stormwater) - Sky Blue
  - **Diseño Estructural** (Structural Design) - Purple
  - **Diseño de Pavimentos** (Pavement Design) - Slate
  - **General** (General CAD) - Emerald
- Click any button to open the Design Room with that discipline pre-selected
- Disabled when no project is available

### Features

- **Search**: Filter projects by name or description
- **Type Filters**: All / Civil / Structural
- **Create New Project**: Modal with location setting
- **Delete Projects**: Confirmation modal for safety
- **Responsive**: Adapts to different screen sizes

### Layout Implementation

The dashboard uses a **flexbox-based layout** for better responsiveness and maintainability:

**Main Structure**:
```
<main> (flex column, h-[calc(100vh-80px)])
  ├── Header section (flex-shrink-0, fixed height)
  └── Grid container (flex-1, fills remaining space)
      ├── Top row (flex-1, 50% of remaining height)
      │   ├── ProjectsMap (left column)
      │   └── ProjectsList (right column)
      └── Bottom row (flex-1, 50% of remaining height)
          └── QuickAccessPanel (full width)
```

**Key Benefits**:
- No nested `calc()` functions - cleaner and more maintainable
- Consistent spacing with `gap-4` throughout
- `min-h-0` prevents overflow issues in flexbox and grid
- Proper height distribution using `flex-1`
- Responsive without complex viewport calculations

### Files
- `apps/web/src/app/dashboard/page.tsx` - Main dashboard page with flexbox layout
- `apps/web/src/components/dashboard/ProjectsMap.tsx` - Map component
- `apps/web/src/components/dashboard/ProjectsList.tsx` - List component
- `apps/web/src/components/dashboard/QuickAccessPanel.tsx` - Quick access buttons

---

## 2. Design Room (`/projects/[id]`)

### New Components

#### Bottom Panel - Design Types

**Location**: Collapsible panel at the bottom of the editor
**File**: `apps/web/src/components/editor/DesignTypesBottomPanel.tsx`

**Features**:
- **Collapsed by default** (only 40px header visible)
- Click header to expand/collapse
- When expanded: Horizontally scrollable panel with design type cards
- Shows 6 design disciplines:
  - Diseño Hidráulico (Hydraulic) - Blue
  - Aguas Servidas (Sewer) - Amber
  - Aguas Lluvias (Stormwater) - Sky
  - Diseño Estructural (Structural) - Purple
  - Diseño de Pavimentos (Pavement) - Slate
  - Canales Abiertos (Open Channels) - Cyan
- Each card shows:
  - Icon with color-coded gradient background
  - Spanish name
  - English translation
  - Active indicator (green dot)
- Selecting a type automatically:
  - Opens the corresponding design panel
  - Highlights the selected type
  - Sets the active design context

#### Right Panel - Views

**Location**: Right side panel in the editor
**File**: `apps/web/src/components/editor/ViewsPanel.tsx`

**Features**:
- **Default Views** (4 built-in):
  - Plan View (top-down 2D)
  - Details View (zoomed sections)
  - Profile View (longitudinal section)
  - 3D Perspective
- **Custom Views**:
  - Users can create custom views with the + button
  - Rename custom views (edit icon)
  - Delete custom views (X icon)
  - Views persist during the session
- **View Preview**: Placeholder section at bottom for view thumbnails
- **Toggle Button**: "Views" button in toolbar to show/hide panel
- Active view indicated with:
  - Blue highlight
  - Green dot indicator
  - Scaled icon on hover

### Integration

#### URL Query Parameters

The Design Room now supports URL parameters for direct navigation:

```
/projects/{projectId}?designType=water
```

Supported design types:
- `water` - Diseño Hidráulico
- `sewer` - Aguas Servidas
- `stormwater` - Aguas Lluvias
- `structural` - Diseño Estructural
- `pavement` - Diseño de Pavimentos
- `channel` - Canales Abiertos

When a design type is provided in the URL:
1. The bottom panel opens automatically
2. The specified design type is selected
3. The corresponding design panel opens on the left

#### Navigation Flow

**From Dashboard → Design Room**:
1. User clicks Quick Access button for a design type
2. Navigates to `/projects/{recentProjectId}?designType={type}`
3. Design Room opens with:
   - Specified design type active
   - Bottom panel expanded
   - Design panel open

**From Projects Map/List → Design Room**:
1. User clicks project marker or list item
2. Navigates to `/projects/{projectId}`
3. Design Room opens in default state

### Files Modified

- `apps/web/src/app/projects/[id]/page.tsx` - Added URL parameter support
- `apps/web/src/components/editor/CivilEditorLayout.tsx` - Integrated new panels

---

## 3. Design Types to Panels Mapping

The system maps design types to existing design panels:

| Design Type | Panel | Description |
|------------|-------|-------------|
| `water` | Water Network Panel | Hydraulic design and water distribution |
| `sewer` | Sewer Panel | Sanitary sewer systems |
| `stormwater` | Stormwater Panel | Stormwater drainage |
| `structural` | Structural Design Panel | Structural analysis |
| `pavement` | Road Geometry Panel | Pavement and road design |
| `channel` | Hydrology Panel | Open channel design |

---

## 4. Technical Details

### State Management

**Dashboard**:
- Local React state for UI (filters, search, modals)
- Fetches projects from `/api/projects` and `/api/structural/projects`
- Sorts by last updated date

**Design Room**:
- `activeDesignType`: Current selected design type
- `activeView`: Current selected view
- `showViewsPanel`: Toggle for views panel visibility
- `activePanel`: Current opened design panel (left side)

### Dynamic Imports

All new components are dynamically imported to avoid SSR issues:
```typescript
const DesignTypesBottomPanel = dynamic(
  () => import('@/components/editor/DesignTypesBottomPanel').then(
    (mod) => mod.DesignTypesBottomPanel
  ),
  { ssr: false }
);
```

### Responsive Design

- Dashboard adapts from 2-column to single-column on smaller screens
- Design types panel has horizontal scroll on all screen sizes
- Map and list components have minimum heights to prevent layout collapse

---

## 5. Future Enhancements

### Planned Features

1. **View System Integration**
   - Connect views to WorkspaceManager
   - Implement actual view switching
   - Add view-specific camera positions
   - Save view configurations to database

2. **View Previews**
   - Generate thumbnails of each view
   - Real-time preview updates
   - Canvas snapshot integration

3. **Custom Views Persistence**
   - Save custom views to database
   - Sync across devices
   - Share views between team members

4. **Design Type Memory**
   - Remember last used design type per project
   - Auto-open last used panel
   - Design type usage analytics

5. **Enhanced Quick Access**
   - Recent projects list
   - Favorite design types
   - Template shortcuts
   - Quick create from specific design type

6. **Map Enhancements**
   - Cluster markers for nearby projects
   - Filter by project properties on map
   - Draw project boundaries
   - Satellite/terrain layer options

---

## 6. User Workflows

### Creating and Starting a New Design

1. User logs in and lands on Dashboard
2. Sees map with existing projects and quick access panel
3. Clicks "New Project" button
4. Fills in project details and optional location
5. Project is created and appears on dashboard
6. User clicks design type (e.g., "Aguas Lluvias") in Quick Access
7. Opens Design Room with Stormwater panel ready

### Working with Existing Project

1. User sees projects on map and list
2. Clicks project marker or list item
3. Design Room opens with last used view
4. User clicks bottom panel to select design type
5. Appropriate design panel opens
6. User works on design, switches views as needed
7. Changes auto-save periodically

### Switching Between Design Types

1. In Design Room, user clicks bottom panel header
2. Panel expands showing all design types
3. User selects "Diseño Hidráulico"
4. Water network panel opens on left
5. Bottom panel stays expanded for easy switching
6. User can collapse panel when done

---

## 7. Color Scheme

All components follow the existing dark theme:

- **Background**: `slate-950`, `slate-900`, `slate-800`
- **Borders**: `slate-700`, `slate-600`
- **Text**: `white`, `slate-300`, `slate-400`
- **Accent**: `blue-600`, `blue-500`
- **Success**: `green-500`, `green-400`
- **Warning**: `amber-600`, `amber-500`
- **Danger**: `red-600`, `red-500`

Design type colors:
- Hydraulic: `blue-600`
- Sewer: `amber-600`
- Stormwater: `sky-600`
- Structural: `purple-600`
- Pavement: `slate-600`
- Channel: `cyan-600`

---

## 8. Accessibility

- All interactive elements have hover states
- Buttons include title attributes for tooltips
- Color coding supplemented with icons
- Keyboard navigation supported
- Focus states visible
- Adequate contrast ratios

---

## 9. Performance Considerations

- Dynamic imports reduce initial bundle size
- Map uses React-Leaflet for efficient rendering
- Leaflet markers clustered for many projects
- Virtual scrolling for long project lists (planned)
- Debounced search input
- Optimized re-renders with React.memo (planned)

---

## Conclusion

This new UX provides:
- **Clear navigation** between Dashboard and Design Room
- **Visual project management** with geographic context
- **Quick access** to different design disciplines
- **Flexible view system** for different perspectives
- **Intuitive workflows** for civil engineers

The modular architecture allows easy addition of new design types and views in the future.
