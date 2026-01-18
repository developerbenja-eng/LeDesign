# CAD Quality-of-Life Improvements Plan

**Priority**: HIGH - Enhance user experience with existing tools
**Goal**: Make CAD tools more intuitive, efficient, and professional

---

## Priority 1: Essential UX Improvements (Implement First)

### 1.1 Status Bar Component ⭐⭐⭐
**Why**: Essential feedback - users need to see coordinates, modes, and current tool

**Features**:
- Current cursor position (X, Y) in world coordinates
- Current zoom level (%)
- Active tool name
- Snap mode indicator (ON/OFF - F3)
- Ortho mode indicator (ON/OFF - F8)
- Grid display indicator
- Current layer name
- Selection count (when entities selected)
- Distance/angle display during drawing operations

**Location**: Bottom of canvas viewport
**File**: New component `components/cad/StatusBar.tsx`

**Design**:
```
┌────────────────────────────────────────────────────────────────┐
│ TOOL: Line │ SNAP: ON │ ORTHO: OFF │ X: 125.43 Y: 67.82 │ ZOOM: 100% │ LAYER: 0 │ Selected: 3 │
└────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Tool Options Panel ⭐⭐⭐
**Why**: Users shouldn't have to use prompts for every parameter - preset common values

**Features**:
- **Offset Tool**: Distance input field, preset buttons (5, 10, 20, 50)
- **Fillet Tool**: Radius input field, preset buttons (0, 5, 10, 15, 20)
- **Array Tool**: Quick access to rectangular vs polar, parameter inputs
- **Dimension Tool**: Style settings (arrow size, text height, precision)
- **Hatch Tool**: Pattern selector, angle/scale sliders
- **Circle Tool**: Radius input field
- **Text Tool**: Font size, alignment options

**Location**: Collapsible panel on right side or floating panel
**File**: New component `components/cad/ToolOptionsPanel.tsx`

**Design**:
```
┌─────────────────────┐
│ OFFSET OPTIONS      │
├─────────────────────┤
│ Distance: [10    ]  │
│ Quick: [5][10][20]  │
│                     │
│ Side: ○ Left ● Right│
└─────────────────────┘
```

---

### 1.3 Grid Display Toggle ⭐⭐
**Why**: Visual reference for scale and alignment

**Features**:
- Toggle grid visibility (G key)
- Grid spacing input (default: 10 units)
- Major/minor grid lines (every 5th line thicker)
- Grid color customization
- Adaptive grid (thinner lines at high zoom, thicker at low zoom)
- Snap to grid option (separate from object snap)

**Location**: Grid settings in view menu or toolbar
**Implementation**: Enhance DrawingCanvas2D rendering

**Visual**:
```
Minor grid: Light gray (#e5e5e5), 1px
Major grid: Medium gray (#cccccc), 2px
Spacing: 10 units (configurable)
```

---

## Priority 2: Discoverability & Learning (Implement Second)

### 2.1 Keyboard Shortcuts Help Panel ⭐⭐
**Why**: Users forget shortcuts - need quick reference

**Features**:
- Press `?` or `F1` to open help overlay
- Categorized shortcuts (Tools, Editing, View, Selection)
- Search/filter shortcuts
- Visual key representations
- Context-sensitive (show relevant shortcuts for active tool)

**File**: New component `components/cad/KeyboardShortcutsHelp.tsx`

**Categories**:
```
DRAWING TOOLS
L       Line
PL      Polyline
C       Circle
A       Arc

EDITING TOOLS
O       Offset
TR      Trim
EX      Extend
F       Fillet
CO      Copy
MV      Move
RO      Rotate
AR      Array

VIEW
G       Toggle Grid
F3      Toggle Snap
F8      Toggle Ortho
Space   Pan
Scroll  Zoom

SELECTION
S       Select
Escape  Cancel
Delete  Delete selected
```

---

### 2.2 Toolbar Tooltips ⭐⭐
**Why**: New users don't know what icons mean

**Features**:
- Hover tooltip showing tool name
- Keyboard shortcut in tooltip
- Brief description of tool function
- Show after 500ms hover delay

**Implementation**: Add `title` attribute or use Tooltip component
**Example**: "Line Tool (L) - Draw straight lines between two points"

---

### 2.3 Command History & Autocomplete ⭐
**Why**: Speed up command entry, reduce typing errors

**Features**:
- Up/Down arrow to cycle through recent commands
- Autocomplete dropdown as you type
- Recent commands at top of suggestions
- Fuzzy matching (type "of" → suggests "offset")
- Clear history button

**File**: Enhance `components/editor/CommandPalette/CommandInput.tsx`

---

## Priority 3: Visual Feedback Enhancements (Implement Third)

### 3.1 Tool Preview/Ghost Entities ⭐⭐
**Why**: See result before committing

**Features**:
- **Offset**: Show preview line in light color before confirming
- **Fillet**: Show preview arc before creating
- **Array**: Show all copies as ghosts before confirming
- **Rotate**: Show ghost entities at rotation angle
- **Hatch**: Show pattern preview before placing

**Implementation**: Add preview rendering in DrawingCanvas2D
**Color**: Semi-transparent cyan (#06b6d4 with 0.3 alpha)

---

### 3.2 Distance/Angle Display During Drawing ⭐⭐
**Why**: Precision feedback while drawing

**Features**:
- Show distance from start point while drawing line
- Show angle from horizontal (0°, 45°, 90°, etc.)
- Update in real-time as cursor moves
- Display near cursor for easy reading
- Coordinate display (ΔX, ΔY)

**Implementation**: Already partially exists (line 1413-1432), enhance with angle

---

### 3.3 Selection Preview ⭐
**Why**: Know what will be selected before clicking

**Features**:
- Highlight entity under cursor (different color from selected)
- Show hover state (light blue outline)
- Clear visual distinction: hover vs selected vs normal

**Colors**:
- Normal: Entity color
- Hover: Light blue outline (#93c5fd)
- Selected: Bright blue outline (#3b82f6)

---

## Priority 4: Workflow Improvements (Implement Fourth)

### 4.1 Recent Commands Quick Access ⭐
**Why**: Faster workflow - repeat common operations

**Features**:
- Show last 5 commands in toolbar or dropdown
- Click to instantly activate tool with same parameters
- "Repeat Last Command" (spacebar when no tool active)

**File**: Add to Toolbar.tsx or new QuickAccess component

---

### 4.2 Multiple Copy/Array in One Operation ⭐
**Why**: Avoid repeating commands

**Features**:
- COPY tool: Keep clicking destinations for multiple copies
- Press Enter or Escape when done
- Show count: "3 copies created"

**Implementation**: Enhance COPY tool handler in DrawingCanvas2D

---

### 4.3 Smart Command Chaining ⭐
**Why**: Common workflows need multiple tools in sequence

**Examples**:
- After OFFSET, automatically activate SELECT to pick result
- After TRIM, stay in TRIM mode for multiple trims
- After COPY, ask "Copy again? (Y/N)"

---

## Priority 5: Error Prevention & Recovery (Implement Fifth)

### 5.1 Better Error Messages ⭐⭐
**Why**: Users need to understand what went wrong

**Current**: Generic alerts "Invalid input"
**Improved**: Specific guidance
- "Offset distance must be positive and non-zero"
- "Cannot trim - no intersection found between selected entities"
- "Fillet radius too large - lines don't reach the arc"
- "Array requires at least 2 items"

**Implementation**: Replace all `alert()` calls with informative messages

---

### 5.2 Undo/Redo Visual Feedback ⭐
**Why**: Confirm action was undone/redone

**Features**:
- Flash screen edge briefly (green for undo, blue for redo)
- Show message "Undone: Created Line" or "Redone: Offset"
- Undo/Redo buttons in toolbar with counts

**File**: Enhance toolbar, add visual feedback to undo/redo actions

---

### 5.3 Confirm Destructive Actions ⭐
**Why**: Prevent accidental data loss

**Features**:
- DELETE: "Delete 5 selected entities?"
- TRIM: "This will modify the selected entity. Continue?"
- Clear confirmation dialogs (not generic alerts)

---

## Priority 6: Layer & Organization (Optional)

### 6.1 Layer Management Panel
- Quick layer switcher
- Show/hide layers
- Lock/unlock layers
- Layer colors
- Rename layers

### 6.2 Entity Properties Panel
- Select entity → view properties
- Edit entity color, layer, visibility
- Show dimensions, coordinates

---

## Implementation Order (Recommended)

**Week 1: Essential UX**
1. Status Bar (Day 1)
2. Tool Options Panel for Offset & Fillet (Day 2)
3. Grid Display Toggle (Day 3)
4. Toolbar Tooltips (Day 4)
5. Better Error Messages (Day 5)

**Week 2: Discoverability & Visual Feedback**
6. Keyboard Shortcuts Help Panel (Day 1-2)
7. Tool Preview/Ghost Entities (Day 3-4)
8. Enhanced Distance/Angle Display (Day 5)

**Week 3: Workflow & Polish**
9. Command History & Autocomplete (Day 1-2)
10. Multiple Copy Support (Day 3)
11. Undo/Redo Visual Feedback (Day 4)
12. Selection Preview (Day 5)

---

## Technical Specifications

### Status Bar Component
```typescript
interface StatusBarProps {
  cursorPosition: Point2D;
  zoom: number;
  activeTool: DrawingTool;
  snapEnabled: boolean;
  orthoEnabled: boolean;
  gridEnabled: boolean;
  activeLayer: string;
  selectedCount: number;
  drawingInfo?: {
    distance?: number;
    angle?: number;
  };
}

export function StatusBar(props: StatusBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white text-xs py-1 px-2 flex items-center gap-4 font-mono">
      <span>TOOL: {props.activeTool.toUpperCase()}</span>
      <span>SNAP: {props.snapEnabled ? 'ON' : 'OFF'}</span>
      <span>ORTHO: {props.orthoEnabled ? 'ON' : 'OFF'}</span>
      <span>X: {props.cursorPosition.x.toFixed(2)}</span>
      <span>Y: {props.cursorPosition.y.toFixed(2)}</span>
      <span>ZOOM: {props.zoom.toFixed(0)}%</span>
      {props.selectedCount > 0 && <span>Selected: {props.selectedCount}</span>}
      {props.drawingInfo?.distance && <span>Distance: {props.drawingInfo.distance.toFixed(2)}</span>}
      {props.drawingInfo?.angle !== undefined && <span>Angle: {props.drawingInfo.angle.toFixed(1)}°</span>}
    </div>
  );
}
```

### Tool Options Panel
```typescript
interface ToolOptionsPanelProps {
  activeTool: DrawingTool;
  options: Record<string, any>;
  onOptionChange: (key: string, value: any) => void;
}

// Tool-specific option renderers
function OffsetOptions({ distance, onDistanceChange }) {
  return (
    <div className="space-y-2">
      <label>Distance</label>
      <input type="number" value={distance} onChange={e => onDistanceChange(parseFloat(e.target.value))} />
      <div className="flex gap-2">
        {[5, 10, 20, 50].map(d => (
          <button key={d} onClick={() => onDistanceChange(d)}>{d}</button>
        ))}
      </div>
    </div>
  );
}
```

### Grid Rendering
```typescript
function drawGrid(ctx: CanvasRenderingContext2D, viewState: ViewState, gridSpacing: number = 10) {
  const { zoom, pan } = viewState;
  const canvas = ctx.canvas;

  // Calculate visible grid range
  const startX = Math.floor(-pan.x / zoom / gridSpacing) * gridSpacing;
  const endX = Math.ceil((canvas.width - pan.x) / zoom / gridSpacing) * gridSpacing;
  const startY = Math.floor(-pan.y / zoom / gridSpacing) * gridSpacing;
  const endY = Math.ceil((canvas.height - pan.y) / zoom / gridSpacing) * gridSpacing;

  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = startX; x <= endX; x += gridSpacing) {
    const isMajor = Math.abs(x % (gridSpacing * 5)) < 0.01;
    ctx.strokeStyle = isMajor ? '#cccccc' : '#e5e5e5';
    ctx.lineWidth = isMajor ? 2 : 1;

    const screenX = worldToScreen(x, 0).x;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, canvas.height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = startY; y <= endY; y += gridSpacing) {
    const isMajor = Math.abs(y % (gridSpacing * 5)) < 0.01;
    ctx.strokeStyle = isMajor ? '#cccccc' : '#e5e5e5';
    ctx.lineWidth = isMajor ? 2 : 1;

    const screenY = worldToScreen(0, y).y;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(canvas.width, screenY);
    ctx.stroke();
  }
}
```

---

## Success Criteria

### Essential UX (Priority 1)
- ✅ Status bar shows all critical information
- ✅ Tool options accessible without prompts
- ✅ Grid visible and configurable

### Discoverability (Priority 2)
- ✅ New users can find shortcuts
- ✅ All toolbar buttons have tooltips
- ✅ Command autocomplete works

### Visual Feedback (Priority 3)
- ✅ Users see previews before committing
- ✅ Distance/angle displayed during drawing
- ✅ Hover states clearly visible

### Workflow (Priority 4)
- ✅ Common operations faster
- ✅ Less clicking required
- ✅ Recent commands accessible

### Error Prevention (Priority 5)
- ✅ Clear, helpful error messages
- ✅ Confirmation for destructive actions
- ✅ Undo/redo feedback visible

---

## Files to Create/Modify

### New Components
- `components/cad/StatusBar.tsx`
- `components/cad/ToolOptionsPanel.tsx`
- `components/cad/KeyboardShortcutsHelp.tsx`
- `components/cad/GridSettings.tsx`

### Modified Components
- `components/cad/DrawingCanvas2D.tsx` - Add grid rendering, preview entities, hover states
- `components/cad/Toolbar.tsx` - Add tooltips, recent commands
- `components/editor/CommandPalette/CommandInput.tsx` - Add autocomplete, history
- `stores/cad-store.ts` - Add grid settings, tool options state

---

**Next Step**: Start with Priority 1 - Status Bar implementation
