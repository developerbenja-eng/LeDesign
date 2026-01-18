# Dashboard Components

This directory contains the reusable components for the LeDesign dashboard.

## Components

### ProjectsMap.tsx

Interactive map component that displays all user projects geographically.

**Features**:
- Shows located projects as colored markers (blue = civil, purple = structural)
- Groups non-located projects at user's address (grey marker)
- Auto-fits bounds to show all projects
- Click markers to navigate to projects
- Legend with project counts

**Props**:
```typescript
interface ProjectsMapProps {
  projects: Project[];
  userAddress?: { lat: number; lon: number };
  onProjectClick: (projectId: string) => void;
}
```

**Usage**:
```tsx
<ProjectsMap
  projects={filteredProjects}
  userAddress={{ lat: -33.4489, lon: -70.6693 }}
  onProjectClick={(id) => router.push(`/projects/${id}`)}
/>
```

---

### ProjectsList.tsx

Scrollable list component showing project details.

**Features**:
- Compact display with name, type, description
- Location indicator for georeferenced projects
- Delete action on hover
- Empty state when no projects
- Click to navigate to project

**Props**:
```typescript
interface ProjectsListProps {
  projects: Project[];
  onDelete: (projectId: string, projectName: string, projectType: 'civil' | 'structural') => void;
}
```

**Usage**:
```tsx
<ProjectsList
  projects={projects}
  onDelete={(id, name, type) => {
    setDeleteConfirm({ projectId: id, projectName: name, projectType: type });
  }}
/>
```

---

### QuickAccessPanel.tsx

Quick navigation buttons for design disciplines.

**Features**:
- Six design type buttons with gradient icons
- Opens Design Room with pre-selected discipline
- Disabled state when no recent project
- Bilingual labels (Spanish/English)

**Props**:
```typescript
interface QuickAccessPanelProps {
  recentProjectId?: string;
}
```

**Usage**:
```tsx
<QuickAccessPanel recentProjectId={projects[0]?.id} />
```

**Design Types**:
- Water (Diseño Hidráulico)
- Sewer (Aguas Servidas)
- Stormwater (Aguas Lluvias)
- Structural (Diseño Estructural)
- Pavement (Diseño de Pavimentos)
- General (General CAD)

---

## Project Type

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  project_type?: string;
  updated_at: string;
  type: 'civil' | 'structural';
  center_lat?: number;
  center_lon?: number;
}
```

---

## Styling

All components use Tailwind CSS and follow the dark theme:
- Background: `slate-800/30`, `slate-900`
- Borders: `slate-700`
- Text: `white`, `slate-300`, `slate-400`
- Hover states with smooth transitions

---

## Dependencies

- **react-leaflet**: For map functionality
- **leaflet**: Map library
- **lucide-react**: Icons
- **next/navigation**: Routing

---

## Notes

- All components are client-side only (`'use client'`)
- Map components should be dynamically imported to avoid SSR issues
- Projects are fetched from `/api/projects` and `/api/structural/projects`
