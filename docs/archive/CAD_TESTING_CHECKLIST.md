# CAD Tools Testing Checklist

## Testing Instructions
Navigate to a project with CAD view and test each tool systematically.

---

## Core Drawing Tools

### ✓ Line Tool (L)
- [ ] Draw horizontal line
- [ ] Draw vertical line
- [ ] Draw diagonal line
- [ ] Snap to endpoints works
- [ ] Escape cancels drawing
- [ ] Undo/Redo works

### ✓ Polyline Tool (PL)
- [ ] Click to add vertices
- [ ] Double-click finishes polyline
- [ ] Escape cancels
- [ ] Works with snap points

### ✓ Circle Tool (C)
- [ ] Click center, drag radius
- [ ] Circle renders correctly
- [ ] Can snap to circle center

### ✓ Arc Tool (A)
- [ ] Three-click arc creation
- [ ] Arc renders correctly

---

## Editing Tools

### ✓ OFFSET Tool (O)
- [ ] Select a line
- [ ] Activate offset tool
- [ ] Click on side to offset
- [ ] Enter distance (try: 10)
- [ ] New line created parallel
- [ ] Test with polyline
- [ ] Test with circle

### ✓ TRIM Tool (TR)
- [ ] Draw two intersecting lines
- [ ] Select boundary line(s)
- [ ] Activate trim tool
- [ ] Click portion to trim away
- [ ] Line segment removed at intersection

### ✓ EXTEND Tool (EX)
- [ ] Draw two lines (one short, one long)
- [ ] Select boundary
- [ ] Activate extend tool
- [ ] Click line to extend to boundary
- [ ] Line extends correctly

### ✓ FILLET Tool (F)
- [ ] Draw two lines at angle
- [ ] Activate fillet tool
- [ ] Enter radius (try: 5)
- [ ] Click first line
- [ ] Click second line
- [ ] Arc created at corner, lines trimmed

### ✓ COPY Tool (CO)
- [ ] Draw some entities
- [ ] Select them
- [ ] Activate copy tool
- [ ] Click base point
- [ ] Click destination point
- [ ] Copies created at new location
- [ ] Originals remain

### ✓ MOVE Tool (MV)
- [ ] Select entities
- [ ] Activate move tool
- [ ] Click base point
- [ ] Click destination
- [ ] Entities moved (originals gone)

### ✓ ROTATE Tool (RO)
- [ ] Select entities
- [ ] Activate rotate tool
- [ ] Click rotation center
- [ ] Visual preview shows angle reference line
- [ ] Enter angle (try: 45)
- [ ] Entities rotated correctly

### ✓ ARRAY Tool (AR)
- [ ] Draw a circle or line
- [ ] Select it
- [ ] Activate array tool

**Rectangular Array:**
- [ ] Choose option 1
- [ ] Enter rows: 3
- [ ] Enter columns: 4
- [ ] Enter row spacing: 20
- [ ] Enter column spacing: 15
- [ ] Grid of copies created

**Polar Array:**
- [ ] Select entity again
- [ ] Activate array tool
- [ ] Choose option 2
- [ ] Click center point
- [ ] Enter count: 8
- [ ] Enter angle: 360
- [ ] Rotate items: yes
- [ ] Circular pattern created

---

## Polyline Editing

### ✓ Vertex Manipulation
- [ ] Draw a polyline with 4-5 vertices
- [ ] Select the polyline
- [ ] Blue square handles appear on vertices
- [ ] Green plus signs appear on segment midpoints

**Move Vertex:**
- [ ] Hover over vertex (turns yellow)
- [ ] Click and drag vertex
- [ ] Vertex moves smoothly with cursor
- [ ] Polyline updates in real-time

**Add Vertex:**
- [ ] Click on green plus sign (segment midpoint)
- [ ] New vertex inserted
- [ ] Polyline now has extra vertex

**Delete Vertex:**
- [ ] Shift+click on a vertex
- [ ] Vertex removed
- [ ] Polyline adjusts (minimum 2 vertices enforced)

---

## Annotation Tools

### ✓ DIMENSION Tool (DI)
- [ ] Draw a line
- [ ] Activate dimension tool
- [ ] Click start point of line
- [ ] Click end point of line
- [ ] Move cursor to position dimension
- [ ] Click to place
- [ ] Dimension shows measurement
- [ ] Dimension arrows and text visible

### ✓ HATCH Tool (H)
- [ ] Draw a closed polyline
- [ ] Select the boundary
- [ ] Activate hatch tool
- [ ] Press Enter to configure
- [ ] Select pattern (try ANSI31)
- [ ] Set angle: 45
- [ ] Set scale: 1.0
- [ ] Hatch fill appears in boundary

**Test Multiple Patterns:**
- [ ] ANSI31 (45° lines)
- [ ] ANSI32 (brick)
- [ ] ANSI37 (concrete)
- [ ] solid (filled)

---

## Selection & Navigation

### ✓ Select Tool (S or Space)
- [ ] Click entity to select
- [ ] Entity highlights
- [ ] Click empty space deselects
- [ ] Shift+click adds to selection
- [ ] Click and drag creates selection box

**Window vs Crossing:**
- [ ] Drag left-to-right (blue box) = window selection
- [ ] Only fully contained entities selected
- [ ] Drag right-to-left (green dashed) = crossing selection
- [ ] Partially overlapping entities selected

### ✓ Pan Tool (P or Middle Mouse)
- [ ] Activate pan tool
- [ ] Click and drag to pan view
- [ ] View moves smoothly

### ✓ Zoom Tool (Z or Mouse Wheel)
- [ ] Mouse wheel up = zoom in
- [ ] Mouse wheel down = zoom out
- [ ] Shift+wheel = zoom out faster

---

## Snap System (F3 to toggle)

### ✓ Current Snap Modes
- [ ] Endpoint snap (square marker)
- [ ] Midpoint snap (triangle marker)
- [ ] Center snap (circle with crosshair)
- [ ] Quadrant snap (diamond marker)
- [ ] Grid snap (default 10-unit grid)

### ✓ Snap Behavior
- [ ] F3 toggles snap on/off
- [ ] Snap marker appears near cursor
- [ ] Label shows snap type
- [ ] Drawing tools respect snap points

---

## Ortho Mode (F8 to toggle)

### ✓ Ortho Behavior
- [ ] F8 toggles ortho mode
- [ ] When active, lines constrained to horizontal/vertical
- [ ] Yellow guide line shows constraint
- [ ] Works with line, polyline, and measure tools

---

## Keyboard Shortcuts

### ✓ Tool Shortcuts
- [ ] L = Line
- [ ] PL = Polyline
- [ ] C = Circle
- [ ] A = Arc
- [ ] O = Offset
- [ ] TR = Trim
- [ ] EX = Extend
- [ ] F = Fillet
- [ ] CO = Copy
- [ ] MV = Move
- [ ] RO = Rotate
- [ ] AR = Array
- [ ] DI = Dimension
- [ ] H = Hatch
- [ ] S or Space = Select

### ✓ Function Keys
- [ ] F3 = Toggle Snap
- [ ] F8 = Toggle Ortho
- [ ] Escape = Cancel current operation

### ✓ Undo/Redo
- [ ] Ctrl+Z (or Cmd+Z) = Undo
- [ ] Ctrl+Y (or Cmd+Y) = Redo

---

## Integration Tests

### ✓ Complete Workflow
**Simple Site Plan:**
1. [ ] Draw property boundary (polyline)
2. [ ] Offset for setback lines
3. [ ] Draw building footprint (rectangle with lines)
4. [ ] Copy building footprint to create second building
5. [ ] Draw road centerline
6. [ ] Offset road for edges
7. [ ] Add dimension to road width
8. [ ] Hatch the road surface
9. [ ] Add dimension to building width
10. [ ] Save project

**Complex Geometry:**
1. [ ] Draw two intersecting lines
2. [ ] Trim lines at intersection
3. [ ] Fillet corners with radius 10
4. [ ] Copy the shape
5. [ ] Rotate copy 30 degrees
6. [ ] Array result in circular pattern

---

## Performance Tests

### ✓ Large Drawing
- [ ] Create 100+ entities using array tool
- [ ] Pan and zoom remain smooth
- [ ] Selection still responsive
- [ ] Snap system not laggy

### ✓ Complex Polyline
- [ ] Create polyline with 50+ vertices
- [ ] Select and drag entity - smooth movement
- [ ] Edit individual vertices - responsive
- [ ] Undo/Redo works correctly

---

## Known Limitations & Future Enhancements

**Need to Implement:**
- Enhanced OSNAP modes (intersection, perpendicular, tangent, nearest)
- Aligned/angular dimensions
- Polyline width/bulge support
- Join polylines command
- Simplify polyline command

**Visual Improvements:**
- Dimension text could be larger
- Hatch preview before placement
- Array preview before creating copies
- Better visual feedback during tool operations

---

## Bug Reporting Template

If you find issues, report with:
- Tool being used
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser console errors (if any)
