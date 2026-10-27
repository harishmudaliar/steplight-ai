---
name: Steplight AI
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#454654'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#757686'
  outline-variant: '#c5c5d7'
  surface-tint: '#3c4fd3'
  primary: '#374ace'
  on-primary: '#ffffff'
  primary-container: '#5265e8'
  on-primary-container: '#fbf8ff'
  inverse-primary: '#bcc3ff'
  secondary: '#545d7d'
  on-secondary: '#ffffff'
  secondary-container: '#cfd9fe'
  on-secondary-container: '#545e7e'
  tertiary: '#5a4ea1'
  on-tertiary: '#ffffff'
  tertiary-container: '#7367bb'
  on-tertiary-container: '#fcf7ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc3ff'
  on-primary-fixed: '#000d60'
  on-primary-fixed-variant: '#1e33ba'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#bcc5ea'
  on-secondary-fixed: '#101a36'
  on-secondary-fixed-variant: '#3c4664'
  tertiary-fixed: '#e5deff'
  tertiary-fixed-dim: '#c9bfff'
  on-tertiary-fixed: '#1a0360'
  on-tertiary-fixed-variant: '#473a8c'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  margin: 1rem
  margin-md: 2rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes an empathetic, low-cognitive-load digital environment engineered for anti-overwhelm and capacity-aware task initiation. Guided by the philosophy "One Tiny Step. Zero Shame," the interface counters executive dysfunction, avoidance, and burnout through radical calm, soft tactile feedback, and distraction-free spatial composition.

The visual style blends soft minimalism with gentle, atmospheric layers. Surfaces feel open, luminous, and supportive rather than demanding. Structural chrome is minimized so that cognitive energy focuses entirely on the next atomic action. Visual metaphors rely on gentle luminescence, weightless transitions, and warm, rounded elements that feel approachable, protective, and free of pressure.

## Colors

The palette balances the focus of electric indigo with soothing tinted pastels and deep grounding tones to prevent sensory overload while maintaining accessible contrast.

- **Primary (`#5265E8`)**: Drives primary affordances, active states, and AI execution moments. Used intentionally to signal momentum without visual stress.
- **Deep Navy (`#17213D`)**: Provides grounding contrast for primary dark surfaces, high-contrast states, and commanding typographic hierarchy.
- **Lavender Accent (`#A99CF5`) & Soft Lavender (`#F0EDFF`)**: Serve as gentle highlight surfaces, calming contextual tags, and ambient illumination.
- **Mint / Success (`#DDF5E9`)**: Reserved for micro-celebrations, task completion, and low-energy capacity indicators.
- **Sky Blue (`#EAF0FF`)**: Delivers open space and balanced context for medium-capacity energy tiers and assistive guidance cards.
- **Background (`#F8FAFD`) & White (`#FFFFFF`)**: Establish an uncluttered visual foundation with soft brightness.
- **Text & Borders**: Primary text sits at `#202940` (AAA readability against canvas), secondary text at `#737E94` for auxiliary context, and borders at `#E5E9F2` for gentle structural boundaries.

## Typography

The typographic hierarchy pairs the friendly geometry of Plus Jakarta Sans for structural navigation, headers, and quick-scan badges with the utilitarian rhythm of Inter for sustained body reading and micro-steps.

Headings maintain generous line height and tight negative tracking to feel warm and intentional without appearing imposing. Body text prioritizes comfortable leading (1.5x) to support skimming and reduce cognitive fatigue for users experiencing low executive bandwidth. Small labels and metadata use uppercase or slightly tracked medium weights to preserve quick visual legibility at a glance.

## Layout & Spacing

The layout model emphasizes a fluid, single-focus grid. Wide desktop monitors constrain interactive content to a central reading column (max-width: 680px for focused execution flows; max-width: 1040px for multi-pane dashboards) to eliminate horizontal scan strain.

- **Mobile (<640px)**: 4-column fluid layout with `margin: 1rem` and `gutter: 1rem`. Component density remains relaxed; single-action cards expand to fill full horizontal width.
- **Tablet (640px–1024px)**: 8-column layout with `margin-md: 2rem` and `gutter-md: 1.5rem`. Secondary contextual panels stack gracefully below active cards.
- **Desktop (>1024px)**: 12-column layout centered with `margin-lg: 3rem`. Breathing room and lateral margins widen to create an open, quiet perimeter around actionable cards.

## Elevation & Depth

Visual hierarchy relies on soft, luminous surface layers rather than harsh structural drop shadows.

- **Base Layer**: Canvas background rendered in `#F8FAFD`.
- **Level 1 (Card & Container Surface)**: Solid `#FFFFFF` card face bounded by a 1px border of `#E5E9F2`, cast with an ambient tinted shadow (`0 2px 8px -2px rgba(23, 33, 61, 0.04), 0 8px 24px -4px rgba(82, 101, 232, 0.04)`).
- **Level 2 (Active & Floating Elements)**: Elevated task cards, drop panels, and active popovers use `#FFFFFF` paired with `0 12px 32px -4px rgba(23, 33, 61, 0.08), 0 4px 12px -2px rgba(82, 101, 232, 0.06)`.
- **Level 3 (AI Focus & Overlays)**: AI guidance modules feature a subtle gradient wash from `#F0EDFF` to `#FFFFFF` with a localized aura halo (`0 0 40px rgba(169, 156, 245, 0.18)`), creating a protective, focused zone for tiny-step breakdown.

## Shapes

The design language uses roundedness level `2`, scaling consistently across small interactive elements up to oversized protective cards.

Standard input controls, utility chips, and primary buttons employ base rounding (`0.5rem` / `rounded-md`). Cards, capacity badges, and primary action zones transition to larger radii (`1rem` / `rounded-xl` and `1.5rem` / `rounded-2xl`). This progressive softening strips sharp corners from the user's field of view, reinforcing emotional safety and lowering hesitation before interaction.

## Components

### Buttons
- **Primary Action**: Solid `#5265E8` fill with crisp `#FFFFFF` text. Height of 44px (minimum touch target), `rounded-xl`, padding `0.75rem 1.5rem`. Subdued lift on hover (`translate-y(-1px)`) with subtle shadow bloom. Active state compresses slightly (`scale-98`).
- **Secondary / Calm Action**: `#F0EDFF` background with `#5265E8` text. Borderless or with `#E5E9F2`. Used for deferral, step-pausing, or breaking a task smaller.
- **Ghost Action**: Transparent surface with `#737E94` text, shifting to `#EAF0FF` on hover with `#202940` text.

### Capacity Badges
Adaptive indicators reflecting the user's current energy threshold:
- **Low Capacity**: Background `#DDF5E9`, text `#1B4D3E`, border `#C6EED8` (or soft lavender pairing `#F0EDFF` / `#5265E8`). Signals low friction, zero expectations.
- **Medium Capacity**: Background `#EAF0FF`, text `#2E42B0`, border `#D3E1FD`. Signals moderate, single-track focus.
- **High Capacity**: Background `#17213D`, text `#FFFFFF`, border `#2D3B66`. Signals readiness for multi-step momentum.
- Badges use `rounded-full`, height 24px, padding `0.25rem 0.75rem`, font `label-sm`.

### AI Step Breakdown Card (Tiny Step Focus)
- Background `#FFFFFF` framed in a 1.5px border transitioning from `#A99CF5` to `#E5E9F2`.
- `rounded-2xl` contour with interior padding of `1.5rem`.
- Features a signature sparkle icon (`✦`) rendered in `#5265E8` within a 32px circular `#F0EDFF` container.
- Includes a prominent single-action button ("Just do 2 minutes") accompanied by a non-punitive "Make it smaller" micro-link.

### Cards & Task Rows
- **Card**: `#FFFFFF` fill, 1px border `#E5E9F2`, `rounded-xl`, padding `1.25rem`.
- **Task Row**: Interactive row with 12px horizontal padding, separated by soft `#E5E9F2` dividers or 8px vertical gaps. Zero aggressive red warning badges for overdue items; overdue items convert instead to gentle nudges in `#A99CF5`.

### Checkboxes & Micro-Resolutions
- Size 20x20px, `rounded-md` (6px radius), border 1.5px `#E5E9F2`.
- Checked state: `#DDF5E9` background with `#1B4D3E` check icon, triggering a brief, subtle particle or scale animation. No jarring sounds; tactile visual confirmation only.

### Input Fields
- Background `#FFFFFF`, 1px border `#E5E9F2`, text `#202940`, placeholder `#737E94`.
- Height 48px, `rounded-xl`, padding `0.75rem 1rem`. Focus state introduces a 1.5px ring of `#5265E8` with a soft lavender glow (`0 0 0 3px #F0EDFF`).