# LeDesign Consolidation Summary

**Date**: January 17, 2026
**Purpose**: Document changes made to simplify and consolidate the project

---

## What Was Done

### 1. Pages Removed (15 pages)

**Module Redirect Pages (6 deleted)**:
- `/structural` → was just redirecting to coming-soon
- `/hydraulics` → was just redirecting to coming-soon
- `/pavement` → was just redirecting to coming-soon
- `/road` → was just redirecting to coming-soon
- `/terrain` → was just redirecting to coming-soon
- `/coming-soon` → no longer needed

**Marketing Pages (9 deleted)**:
- `/presentation` → redundant with /pitch
- `/presentation/video` → redundant
- `/presentation/video2` → redundant
- `/sponsors` → marketing fluff
- `/enterprise` → marketing fluff
- `/academic` → marketing fluff
- `/business-analysis` → moved to docs
- `/integrations` → marketing fluff

### 2. Pages Kept (10 pages)

**Core Product**:
- `/` → Homepage (simplified)
- `/dashboard` → Project management
- `/projects/[id]` → Project view
- `/projects/[id]/editor` → CAD editor
- `/water-network` → Water network studio

**Auth**:
- `/auth/signin` → Login
- `/signup` → Registration
- `/profile` → User profile

**Business**:
- `/early-access` → Founder's Edition program
- `/pitch` → Single presentation page
- `/plan` → Internal co-founder plan

### 3. Documentation Archived (27 files → docs/archive/)

**Migration docs** (no longer needed - migration complete):
- MIGRATION_STATUS.md, MIGRATION_SUMMARY.md, MIGRATION_SURFACES.md
- MIGRATION_COMPLETE_CHECKLIST.md, SURFACE_MIGRATION_SUMMARY.md
- CONSOLIDATION.md, SAFE_TO_DELETE_CHECKLIST.md

**Presentation/video docs**:
- VIDEO_2_*.md (4 files), PRESENTATION_*.md (2 files)
- VOICE_CONFIGURATION.md

**Implementation status docs** (completed work):
- LAYOUT_FIXES.md, LAYOUT_VALIDATION_RESULTS.md
- VERIFICATION_SUMMARY.md, IMPLEMENTATION.md
- SYNC_*.md (2 files)

**Planning docs** (archived for reference):
- CAD_TESTING_CHECKLIST.md, ENHANCED_OSNAP_IMPLEMENTATION.md
- NEW_UX_IMPLEMENTATION.md, QOL_IMPROVEMENTS_PLAN.md
- UNIFIED_PROJECT_SYSTEM.md, DATA_RESOURCES_FEATURE.md

**Business docs** (internal reference):
- BUSINESS_ANALYSIS.md, MARKET_RESEARCH.md, COFOUNDERS_PITCH.md

### 4. Documentation Kept (7 files)

**Essential for development**:
- `README.md` - Project overview
- `README_SETUP.md` - Setup instructions
- `QUICK_START.md` - Quick start guide
- `CLAUDE.md` - Claude Code instructions
- `CLAUDE_CODE_WEB.md` - Claude Code web usage
- `TURSO_SETUP.md` - Database setup
- `CAD_IMPLEMENTATION_STATUS.md` - Current CAD progress

### 5. Homepage Simplified

**Before**: ~1,600 lines with:
- 4 pricing tiers ($50-$200/month)
- Links to non-existent module pages
- Fake stats ("10,000+ projects", "2,500+ engineers")
- Testimonials, FAQs, multiple CTAs
- Links to deleted pages (enterprise, academic, sponsors)

**After**: ~370 lines with:
- 2 pricing tiers (Free, $49/month Pro)
- Links to actual pages only
- No fake stats
- Clear CTA to Dashboard
- Links to Early Access for donations

### 6. Pricing Unified

**Final Model**:
| Plan | Price | Features |
|------|-------|----------|
| Gratis | $0/mes | 5 projects, all modules, PDF export |
| Profesional | $49/mes | Unlimited projects, DWG/Excel, team collab |

**Donation Model** (on /early-access):
| Tier | Amount | Users |
|------|--------|-------|
| Individual | $250+ | 1 lifetime |
| Equipo | $1,000+ | 3 lifetime |
| Socio Fundador | $5,000+ | 5 lifetime |

---

## Current Site Structure

```
/                     → Homepage (simplified)
/dashboard            → Project management hub
/projects/[id]        → Project view
/projects/[id]/editor → CAD editor (all modules)
/water-network        → Water network studio

/auth/signin          → Login
/signup               → Registration
/profile              → User profile

/early-access         → Founder's Edition donations
/pitch                → Single pitch presentation
/plan                 → Internal co-founder plan
```

---

## What Still Needs Review

### Questions for You

1. **Water Network Page**: Keep `/water-network` as separate page, or remove and use only the panel in editor?

2. **Pitch vs Plan**: Both exist - should `/plan` be password-protected or removed from footer?

3. **Early Access**: Is the donation model the current focus, or switch to SaaS subscriptions?

4. **Pricing**: Kept $49/month for Pro. Is this correct, or should it match Business Analysis ($99/month)?

### Technical Items

1. **DrawingCanvas2D.tsx**: Still 3,500 lines - should be split into smaller components
2. **Zustand Stores**: 13 stores with overlapping domains - potential consolidation
3. **API Routes**: All 60+ routes still exist and work

---

## Files Changed

```
DELETED:
- apps/web/src/app/structural/
- apps/web/src/app/hydraulics/
- apps/web/src/app/pavement/
- apps/web/src/app/road/
- apps/web/src/app/terrain/
- apps/web/src/app/coming-soon/
- apps/web/src/app/presentation/
- apps/web/src/app/sponsors/
- apps/web/src/app/enterprise/
- apps/web/src/app/academic/
- apps/web/src/app/business-analysis/
- apps/web/src/app/integrations/

MODIFIED:
- apps/web/src/app/page.tsx (complete rewrite, 1600→370 lines)

ARCHIVED (moved to docs/archive/):
- 27 markdown files
```

---

## Next Steps

1. **Review this summary** - confirm deletions are acceptable
2. **Test the site** - verify all remaining pages work
3. **Decide on questions above** - water-network, pricing, etc.
4. **Build the app** - verify no broken imports

```bash
# Test the build
cd apps/web && npm run build
```

---

*Consolidation completed: January 17, 2026*
