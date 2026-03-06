# Trip Planner Design System

**Version**: 1.0.0  
**Last Updated**: March 2, 2026  
**Theme**: Warm & Inviting

---

## 🎨 Overview

This design system provides a comprehensive set of design tokens, patterns, and guidelines for building a cohesive, accessible, and visually appealing trip planning application. The design language emphasizes warmth, adventure, and organization—reflecting the excitement of planning travel while maintaining professionalism and usability.

### Design Philosophy

- **Warm & Inviting**: Terracotta and amber tones evoke adventure and exploration
- **Accessible**: WCAG 2.1 AA compliant with proper contrast ratios
- **Consistent**: Systematic approach to spacing, typography, and color
- **Flexible**: Easily extensible for future features
- **Modern**: Clean, contemporary aesthetic with thoughtful details

---

## 🎨 Color Palette

### Primary Colors (Terracotta/Amber)

Our primary color palette features warm, earthy tones that evoke adventure and travel.

| Token | Hex | Usage | Contrast |
|-------|-----|-------|----------|
| `--color-primary-50` | `#fef8f2` | Lightest backgrounds | - |
| `--color-primary-100` | `#fdeee0` | Hover states (light) | - |
| `--color-primary-200` | `#fad9bc` | Subtle accents | - |
| `--color-primary-300` | `#f7bd8d` | Borders, dividers | - |
| `--color-primary-400` | `#f39855` | Secondary buttons | AAA on white |
| `--color-primary-500` | `#ef7d2f` | **Primary actions** | AAA on white |
| `--color-primary-600` | `#e06319` | Primary hover | AAA on white |
| `--color-primary-700` | `#ba4c16` | Active states | AAA on white |
| `--color-primary-800` | `#943d19` | Dark accents | - |
| `--color-primary-900` | `#783517` | Darkest accents | - |

**Usage Examples:**
```tsx
// Primary button
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  Create Trip
</button>

// Light accent background
<div className="bg-primary-50 border-primary-200">
  Featured content
</div>
```

### Neutral Colors (Warm Grays)

Warm gray tones with slight brown undertones for a cohesive, natural feel.

| Token | Hex | Usage | Contrast |
|-------|-----|-------|----------|
| `--color-neutral-50` | `#fafaf9` | Page background | - |
| `--color-neutral-100` | `#f5f5f4` | Card background | - |
| `--color-neutral-200` | `#e7e5e4` | Borders | - |
| `--color-neutral-300` | `#d6d3d1` | Dividers | - |
| `--color-neutral-400` | `#a8a29e` | Disabled text | AA on white |
| `--color-neutral-500` | `#78716c` | Secondary text | AAA on white |
| `--color-neutral-600` | `#57534e` | Body text | AAA on white |
| `--color-neutral-700` | `#44403c` | Headings | AAA on white |
| `--color-neutral-800` | `#292524` | Dark backgrounds | - |
| `--color-neutral-900` | `#1c1917` | Darkest text | AAA on white |

### Semantic Colors

Carefully chosen semantic colors that work harmoniously with the warm palette.

#### Success (Green)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success-50` | `#f0fdf4` | Light background |
| `--color-success-100` | `#dcfce7` | Subtle background |
| `--color-success-500` | `#22c55e` | Success messages |
| `--color-success-600` | `#16a34a` | Success hover |
| `--color-success-700` | `#15803d` | Success active |

#### Warning (Amber)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-warning-50` | `#fffbeb` | Light background |
| `--color-warning-100` | `#fef3c7` | Subtle background |
| `--color-warning-500` | `#f59e0b` | Warning messages |
| `--color-warning-600` | `#d97706` | Warning hover |
| `--color-warning-700` | `#b45309` | Warning active |

#### Error (Red)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-error-50` | `#fef2f2` | Light background |
| `--color-error-100` | `#fee2e2` | Subtle background |
| `--color-error-500` | `#ef4444` | Error messages |
| `--color-error-600` | `#dc2626` | Error hover |
| `--color-error-700` | `#b91c1c` | Error active |

#### Info (Blue)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-info-50` | `#eff6ff` | Light background |
| `--color-info-100` | `#dbeafe` | Subtle background |
| `--color-info-500` | `#3b82f6` | Info messages |
| `--color-info-600` | `#2563eb` | Info hover |
| `--color-info-700` | `#1d4ed8` | Info active |

### Surface & Background Colors

| Token | CSS Variable | Light Mode | Dark Mode | Usage |
|-------|--------------|------------|-----------|-------|
| Background | `--color-background` | `#ffffff` | `#1c1917` | Main background |
| Surface | `--color-surface` | `#fafaf9` | `#292524` | Card backgrounds |
| Surface Elevated | `--color-surface-elevated` | `#ffffff` | `#44403c` | Modals, dropdowns |

### Text Colors

| Token | CSS Variable | Light Mode | Dark Mode | Usage |
|-------|--------------|------------|-----------|-------|
| Primary | `--color-text-primary` | `#1c1917` | `#fafaf9` | Headings, primary text |
| Secondary | `--color-text-secondary` | `#57534e` | `#d6d3d1` | Body copy |
| Tertiary | `--color-text-tertiary` | `#78716c` | `#a8a29e` | Metadata, captions |
| Disabled | `--color-text-disabled` | `#a8a29e` | `#78716c` | Disabled states |
| Inverse | `--color-text-inverse` | `#ffffff` | `#1c1917` | Text on dark backgrounds |

### Border Colors

| Token | CSS Variable | Usage |
|-------|--------------|-------|
| Light | `--color-border-light` | `#e7e5e4` | Subtle dividers |
| Default | `--color-border-default` | `#d6d3d1` | Standard borders |
| Dark | `--color-border-dark` | `#a8a29e` | Emphasized borders |

---

## ✍️ Typography

### Font Families

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 
            "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, 
            Consolas, monospace;
```

**Rationale**: System fonts provide excellent performance, native feel, and accessibility across all platforms.

### Font Scale

| Name | Token | Size | Usage |
|------|-------|------|-------|
| XS | `--text-xs` | `12px` | Tiny labels, metadata |
| SM | `--text-sm` | `14px` | Secondary text, captions |
| Base | `--text-base` | `16px` | Body copy (default) |
| LG | `--text-lg` | `18px` | Emphasized body text |
| XL | `--text-xl` | `20px` | Section headings |
| 2XL | `--text-2xl` | `24px` | h3 headings |
| 3XL | `--text-3xl` | `30px` | h2 headings |
| 4XL | `--text-4xl` | `36px` | h1 headings |
| 5XL | `--text-5xl` | `48px` | Hero text, large displays |

### Font Weights

| Name | Token | Weight | Usage |
|------|-------|--------|-------|
| Normal | `--font-normal` | `400` | Body text |
| Medium | `--font-medium` | `500` | Emphasized text |
| Semibold | `--font-semibold` | `600` | Headings, buttons |
| Bold | `--font-bold` | `700` | Strong emphasis |

### Line Heights

| Name | Token | Value | Usage |
|------|-------|-------|-------|
| Tight | `--leading-tight` | `1.25` | Headings |
| Snug | `--leading-snug` | `1.375` | Subheadings |
| Normal | `--leading-normal` | `1.5` | Body text (default) |
| Relaxed | `--leading-relaxed` | `1.625` | Long-form content |
| Loose | `--leading-loose` | `2` | Special cases |

### Letter Spacing

| Name | Token | Value | Usage |
|------|-------|-------|-------|
| Tight | `--tracking-tight` | `-0.025em` | Large headings |
| Normal | `--tracking-normal` | `0` | Body text (default) |
| Wide | `--tracking-wide` | `0.025em` | Uppercase text, small caps |

### Typography Examples

```tsx
// Page Title (H1)
<h1 className="text-4xl font-semibold text-text-primary tracking-tight">
  My Trips
</h1>

// Section Heading (H2)
<h2 className="text-3xl font-semibold text-text-primary tracking-tight">
  Trip Details
</h2>

// Subsection Heading (H3)
<h3 className="text-2xl font-semibold text-text-primary">
  Daily Itinerary
</h3>

// Body Text
<p className="text-base text-text-secondary leading-normal">
  Plan your perfect adventure with our intuitive trip planner.
</p>

// Small Text / Metadata
<span className="text-sm text-text-tertiary">
  Created on March 2, 2026
</span>

// Caption / Helper Text
<small className="text-xs text-text-tertiary">
  All times shown in your local timezone
</small>
```

---

## 📏 Spacing System

Consistent spacing creates visual rhythm and hierarchy.

### Spacing Scale

| Name | Token | Size | Usage |
|------|-------|------|-------|
| XS | `--space-xs` | `4px` | Tight spacing, icon gaps |
| SM | `--space-sm` | `8px` | Compact layouts |
| MD | `--space-md` | `12px` | Small component padding |
| Base | `--space-base` | `16px` | Default spacing |
| LG | `--space-lg` | `24px` | Comfortable spacing |
| XL | `--space-xl` | `32px` | Section spacing |
| 2XL | `--space-2xl` | `48px` | Large section gaps |
| 3XL | `--space-3xl` | `64px` | Page-level spacing |

### Tailwind Spacing Classes

Use Tailwind's spacing scale which aligns with our tokens:

```tsx
// Padding
p-1   // 4px  (--space-xs)
p-2   // 8px  (--space-sm)
p-3   // 12px (--space-md)
p-4   // 16px (--space-base)
p-6   // 24px (--space-lg)
p-8   // 32px (--space-xl)
p-12  // 48px (--space-2xl)
p-16  // 64px (--space-3xl)

// Margin
m-4   // 16px
my-6  // 24px vertical
mx-8  // 32px horizontal

// Gap (for flex/grid)
gap-4 // 16px
gap-6 // 24px
```

### Component Spacing Guidelines

- **Card padding**: `p-6` (24px) for comfortable content spacing
- **Button padding**: `px-6 py-3` (24px horizontal, 12px vertical)
- **Form fields**: `mb-4` or `mb-6` between fields
- **Section spacing**: `my-8` or `my-12` between major sections
- **Inline elements**: `gap-2` or `gap-3` for horizontal flow

---

## 🎯 Component Patterns

### Buttons

#### Primary Button
```tsx
<button className="
  bg-primary-500 hover:bg-primary-600 active:bg-primary-700
  text-white font-medium
  px-6 py-3 rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
  disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed
">
  Create Trip
</button>
```

#### Secondary Button
```tsx
<button className="
  bg-white hover:bg-neutral-50 active:bg-neutral-100
  text-primary-600 font-medium
  border-2 border-primary-500
  px-6 py-3 rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
  disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed
">
  Cancel
</button>
```

#### Ghost Button
```tsx
<button className="
  bg-transparent hover:bg-neutral-100 active:bg-neutral-200
  text-neutral-700 font-medium
  px-4 py-2 rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2
">
  View Details
</button>
```

#### Danger Button
```tsx
<button className="
  bg-error-500 hover:bg-error-600 active:bg-error-700
  text-white font-medium
  px-6 py-3 rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2
">
  Delete Trip
</button>
```

#### Small Button
```tsx
<button className="
  bg-primary-500 hover:bg-primary-600
  text-white text-sm font-medium
  px-4 py-2 rounded-md
  transition-colors duration-200
">
  Edit
</button>
```

### Form Inputs

#### Text Input
```tsx
<div className="space-y-2">
  <label 
    htmlFor="trip-title" 
    className="block text-sm font-medium text-text-primary"
  >
    Trip Title
  </label>
  <input
    type="text"
    id="trip-title"
    className="
      w-full px-4 py-3 rounded-lg
      bg-white border-2 border-neutral-300
      text-text-primary placeholder:text-neutral-400
      focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100
      disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed
      transition-all duration-200
    "
    placeholder="e.g., Summer Road Trip"
  />
</div>
```

#### Text Input with Error
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-text-primary">
    Trip Title
  </label>
  <input
    type="text"
    className="
      w-full px-4 py-3 rounded-lg
      bg-white border-2 border-error-500
      text-text-primary
      focus:outline-none focus:border-error-600 focus:ring-4 focus:ring-error-100
      transition-all duration-200
    "
  />
  <p className="text-sm text-error-600 flex items-center gap-1">
    <span>⚠</span> Trip title is required
  </p>
</div>
```

#### Date Input
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-text-primary">
    Start Date
  </label>
  <input
    type="date"
    className="
      w-full px-4 py-3 rounded-lg
      bg-white border-2 border-neutral-300
      text-text-primary
      focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100
      transition-all duration-200
    "
  />
</div>
```

#### Textarea
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-text-primary">
    Description
  </label>
  <textarea
    rows={4}
    className="
      w-full px-4 py-3 rounded-lg
      bg-white border-2 border-neutral-300
      text-text-primary placeholder:text-neutral-400
      resize-vertical
      focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100
      transition-all duration-200
    "
    placeholder="Describe your trip..."
  />
</div>
```

#### Select Dropdown
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-text-primary">
    Trip Type
  </label>
  <select className="
    w-full px-4 py-3 rounded-lg
    bg-white border-2 border-neutral-300
    text-text-primary
    focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100
    transition-all duration-200
  ">
    <option>Select a trip type</option>
    <option>Road Trip</option>
    <option>City Tour</option>
    <option>Beach Vacation</option>
  </select>
</div>
```

### Cards

#### Basic Card
```tsx
<div className="
  bg-white rounded-xl p-6
  border border-neutral-200
  shadow-sm hover:shadow-md
  transition-shadow duration-200
">
  <h3 className="text-xl font-semibold text-text-primary mb-2">
    Card Title
  </h3>
  <p className="text-text-secondary">
    Card content goes here
  </p>
</div>
```

#### Trip Card
```tsx
<div className="
  bg-white rounded-xl p-6
  border border-neutral-200
  shadow-sm hover:shadow-md hover:border-primary-300
  transition-all duration-200
  cursor-pointer
">
  <div className="flex justify-between items-start mb-3">
    <h3 className="text-xl font-semibold text-text-primary">
      Summer Road Trip
    </h3>
    <span className="text-xs px-3 py-1 rounded-full bg-primary-100 text-primary-700">
      Active
    </span>
  </div>
  <p className="text-sm text-text-secondary mb-4">
    Exploring the Pacific Coast Highway
  </p>
  <div className="flex items-center gap-4 text-sm text-text-tertiary">
    <span>📅 Jun 15 - Jun 22</span>
    <span>• 7 days</span>
  </div>
</div>
```

#### Interactive Card List
```tsx
<div className="space-y-4">
  {trips.map((trip) => (
    <div
      key={trip.id}
      className="
        bg-white rounded-xl p-6
        border border-neutral-200
        hover:border-primary-300 hover:shadow-md
        transition-all duration-200
        cursor-pointer
        group
      "
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-600">
            {trip.title}
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            {trip.description}
          </p>
        </div>
        <button className="text-neutral-400 hover:text-primary-500">
          →
        </button>
      </div>
    </div>
  ))}
</div>
```

### Alerts & Notifications

#### Success Alert
```tsx
<div className="
  bg-success-50 border-l-4 border-success-500
  rounded-lg p-4
  flex items-start gap-3
">
  <span className="text-success-600 text-xl">✓</span>
  <div>
    <h4 className="text-sm font-medium text-success-800">
      Trip created successfully
    </h4>
    <p className="text-sm text-success-700 mt-1">
      Your trip has been saved and is ready to plan.
    </p>
  </div>
</div>
```

#### Error Alert
```tsx
<div className="
  bg-error-50 border-l-4 border-error-500
  rounded-lg p-4
  flex items-start gap-3
">
  <span className="text-error-600 text-xl">⚠</span>
  <div>
    <h4 className="text-sm font-medium text-error-800">
      Failed to create trip
    </h4>
    <p className="text-sm text-error-700 mt-1">
      Please check your input and try again.
    </p>
  </div>
</div>
```

#### Warning Alert
```tsx
<div className="
  bg-warning-50 border-l-4 border-warning-500
  rounded-lg p-4
  flex items-start gap-3
">
  <span className="text-warning-600 text-xl">⚡</span>
  <div>
    <h4 className="text-sm font-medium text-warning-800">
      Weather advisory
    </h4>
    <p className="text-sm text-warning-700 mt-1">
      Heavy rain expected on June 18th.
    </p>
  </div>
</div>
```

#### Info Alert
```tsx
<div className="
  bg-info-50 border-l-4 border-info-500
  rounded-lg p-4
  flex items-start gap-3
">
  <span className="text-info-600 text-xl">ℹ</span>
  <div>
    <h4 className="text-sm font-medium text-info-800">
      Tip
    </h4>
    <p className="text-sm text-info-700 mt-1">
      Add daily destinations to see them on the map.
    </p>
  </div>
</div>
```

### Loading States

#### Spinner
```tsx
<div className="flex justify-center items-center p-8">
  <div className="
    h-8 w-8 
    border-4 border-primary-200 border-t-primary-600
    rounded-full
    animate-spin
  " />
</div>
```

#### Spinner with Text
```tsx
<div className="flex flex-col items-center gap-3 p-8">
  <div className="
    h-10 w-10 
    border-4 border-primary-200 border-t-primary-600
    rounded-full
    animate-spin
  " />
  <p className="text-sm text-text-tertiary">Loading trips...</p>
</div>
```

#### Skeleton Loader (Card)
```tsx
<div className="bg-white rounded-xl p-6 border border-neutral-200 animate-pulse">
  <div className="h-6 bg-neutral-200 rounded w-3/4 mb-3" />
  <div className="h-4 bg-neutral-200 rounded w-full mb-2" />
  <div className="h-4 bg-neutral-200 rounded w-5/6" />
</div>
```

### Empty States

#### Empty Trip List
```tsx
<div className="
  flex flex-col items-center justify-center
  py-16 px-6
  bg-surface rounded-xl
  border-2 border-dashed border-neutral-300
">
  <div className="text-6xl mb-4">🗺️</div>
  <h3 className="text-xl font-semibold text-text-primary mb-2">
    No trips yet
  </h3>
  <p className="text-text-secondary text-center max-w-sm mb-6">
    Start planning your next adventure by creating your first trip.
  </p>
  <button className="
    bg-primary-500 hover:bg-primary-600
    text-white font-medium
    px-6 py-3 rounded-lg
    transition-colors duration-200
  ">
    Create Your First Trip
  </button>
</div>
```

#### Empty Search Results
```tsx
<div className="text-center py-12">
  <div className="text-5xl mb-3">🔍</div>
  <h3 className="text-lg font-semibold text-text-primary mb-2">
    No trips found
  </h3>
  <p className="text-text-secondary">
    Try adjusting your search criteria
  </p>
</div>
```

### Lists

#### Simple List
```tsx
<ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-lg">
  <li className="px-6 py-4 hover:bg-neutral-50 transition-colors">
    List item 1
  </li>
  <li className="px-6 py-4 hover:bg-neutral-50 transition-colors">
    List item 2
  </li>
  <li className="px-6 py-4 hover:bg-neutral-50 transition-colors">
    List item 3
  </li>
</ul>
```

#### Descriptive List
```tsx
<div className="divide-y divide-neutral-200 border border-neutral-200 rounded-lg">
  <div className="px-6 py-4 hover:bg-neutral-50 transition-colors cursor-pointer">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-medium text-text-primary">San Francisco</h4>
        <p className="text-sm text-text-secondary mt-1">Day 1 destination</p>
      </div>
      <span className="text-sm text-text-tertiary">Jun 15</span>
    </div>
  </div>
  {/* More items... */}
</div>
```

### Navigation

#### Tab Navigation
```tsx
<nav className="border-b border-neutral-200">
  <div className="flex gap-8 px-6">
    <button className="
      pb-4 border-b-2 border-primary-500
      text-sm font-medium text-primary-600
      transition-colors
    ">
      Overview
    </button>
    <button className="
      pb-4 border-b-2 border-transparent
      text-sm font-medium text-text-tertiary
      hover:text-text-primary hover:border-neutral-300
      transition-colors
    ">
      Itinerary
    </button>
    <button className="
      pb-4 border-b-2 border-transparent
      text-sm font-medium text-text-tertiary
      hover:text-text-primary hover:border-neutral-300
      transition-colors
    ">
      Map
    </button>
  </div>
</nav>
```

#### Breadcrumbs
```tsx
<nav className="flex items-center gap-2 text-sm">
  <a href="/" className="text-text-tertiary hover:text-primary-600">
    Home
  </a>
  <span className="text-neutral-400">/</span>
  <a href="/trips" className="text-text-tertiary hover:text-primary-600">
    Trips
  </a>
  <span className="text-neutral-400">/</span>
  <span className="text-text-primary font-medium">
    Summer Road Trip
  </span>
</nav>
```

### Badges & Tags

#### Status Badge
```tsx
{/* Active */}
<span className="
  inline-flex items-center
  px-3 py-1 rounded-full
  bg-success-100 text-success-700
  text-xs font-medium
">
  Active
</span>

{/* Draft */}
<span className="
  inline-flex items-center
  px-3 py-1 rounded-full
  bg-neutral-200 text-neutral-700
  text-xs font-medium
">
  Draft
</span>

{/* Completed */}
<span className="
  inline-flex items-center
  px-3 py-1 rounded-full
  bg-info-100 text-info-700
  text-xs font-medium
">
  Completed
</span>
```

#### Category Tag
```tsx
<span className="
  inline-flex items-center gap-1
  px-3 py-1 rounded-md
  bg-primary-50 text-primary-700
  border border-primary-200
  text-sm
">
  🏖️ Beach
</span>
```

---

## 🎨 Iconography

### Recommended Icon Library

**Lucide Icons** (Recommended)
- Modern, consistent design language
- Tree-shakeable, only import what you need
- Excellent TypeScript support
- Works well with React

```bash
npm install lucide-react
```

```tsx
import { MapPin, Calendar, Edit, Trash2, Plus } from 'lucide-react';

function Example() {
  return (
    <button className="flex items-center gap-2">
      <Plus size={20} />
      <span>Create Trip</span>
    </button>
  );
}
```

**Alternative: Heroicons**
- Official Tailwind CSS icons
- Clean, simple design
- Strong ecosystem support

```bash
npm install @heroicons/react
```

### Icon Sizes

| Size | Pixels | Usage | Class |
|------|--------|-------|-------|
| XS | 12px | Inline with small text | `size={12}` |
| SM | 16px | Inline with body text | `size={16}` |
| Base | 20px | Default size | `size={20}` |
| MD | 24px | Larger touch targets | `size={24}` |
| LG | 32px | Feature icons | `size={32}` |
| XL | 40px | Hero icons | `size={40}` |

### Icon Color Usage

```tsx
// Primary action icon
<Plus size={20} className="text-primary-600" />

// Secondary/neutral icon
<MapPin size={20} className="text-neutral-500" />

// Semantic icons
<CheckCircle size={20} className="text-success-600" />
<AlertCircle size={20} className="text-error-600" />
<Info size={20} className="text-info-600" />
```

### Common Icons for Trip Planner

| Icon | Component (Lucide) | Usage |
|------|-------------------|-------|
| ➕ | `Plus` | Add/Create |
| ✏️ | `Edit` | Edit |
| 🗑️ | `Trash2` | Delete |
| 📍 | `MapPin` | Location |
| 📅 | `Calendar` | Date/Time |
| 🔍 | `Search` | Search |
| ⚙️ | `Settings` | Settings |
| 👤 | `User` | Profile |
| 🗺️ | `Map` | Map view |
| 📋 | `List` | List view |
| ✓ | `Check` | Success/Complete |
| ✕ | `X` | Close/Cancel |
| → | `ChevronRight` | Navigate forward |
| ← | `ChevronLeft` | Navigate back |
| ⋮ | `MoreVertical` | More options |

---

## 📐 Layout & Grid

### Container Widths

```tsx
// Full width
<div className="w-full">

// Centered container
<div className="max-w-7xl mx-auto px-6">

// Content widths
<div className="max-w-md mx-auto">   {/* 448px - narrow content */}
<div className="max-w-2xl mx-auto">  {/* 672px - readable content */}
<div className="max-w-4xl mx-auto">  {/* 896px - wide content */}
<div className="max-w-7xl mx-auto">  {/* 1280px - max content */}
```

### Responsive Breakpoints

Tailwind's default breakpoints work well:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm:` | 640px | Mobile landscape, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Small desktops, landscape tablets |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large desktops |

### Grid Patterns

#### Two-Column Layout (Responsive)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

#### Three-Column Card Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {trips.map(trip => (
    <TripCard key={trip.id} trip={trip} />
  ))}
</div>
```

#### Sidebar Layout
```tsx
<div className="flex flex-col lg:flex-row gap-6">
  {/* Sidebar */}
  <aside className="lg:w-64 flex-shrink-0">
    <nav>...</nav>
  </aside>
  
  {/* Main content */}
  <main className="flex-1 min-w-0">
    <h1>Content</h1>
  </main>
</div>
```

#### Split View (Map + Content)
```tsx
<div className="flex flex-col lg:flex-row h-screen">
  {/* Content panel */}
  <div className="lg:w-96 overflow-y-auto border-r border-neutral-200">
    <TripList />
  </div>
  
  {/* Map */}
  <div className="flex-1">
    <Map />
  </div>
</div>
```

---

## ♿ Accessibility Guidelines

### Contrast Ratios

All text colors meet WCAG 2.1 AA standards:

- **Normal text (< 18px)**: 4.5:1 minimum
- **Large text (≥ 18px)**: 3:1 minimum
- **Interactive elements**: 3:1 minimum

### Focus States

All interactive elements have visible focus indicators:

```css
*:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### Keyboard Navigation

- All interactive elements accessible via keyboard
- Logical tab order
- Skip links for main content
- Escape key closes modals/dropdowns

### Screen Readers

- Semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- Proper ARIA labels where needed
- Alt text for images
- Form labels properly associated

### Example: Accessible Button

```tsx
<button
  className="..."
  aria-label="Close dialog"
  onClick={handleClose}
>
  ✕
</button>
```

---

## 🌓 Dark Mode Support

The design system includes dark mode variants. Dark mode automatically activates based on user preference:

```tsx
// Text automatically adjusts
<p className="text-text-primary">  {/* Black in light, white in dark */}

// Explicit dark mode override
<div className="bg-white dark:bg-neutral-800">
```

### Dark Mode Testing

Toggle dark mode in Chrome DevTools:
1. Open DevTools (F12)
2. Command Palette (Cmd/Ctrl + Shift + P)
3. Type "Rendering"
4. Toggle "Emulate CSS media feature prefers-color-scheme"

---

## 🎨 Shadow & Elevation

### Shadow Scale

| Token | CSS Variable | Usage |
|-------|--------------|-------|
| SM | `--shadow-sm` | Subtle cards, inputs |
| MD | `--shadow-md` | Standard cards (default) |
| LG | `--shadow-lg` | Elevated cards on hover |
| XL | `--shadow-xl` | Modals, dropdowns |

### Usage

```tsx
// Subtle shadow
<div className="shadow-sm">

// Standard card
<div className="shadow-md hover:shadow-lg transition-shadow">

// Modal/Dropdown
<div className="shadow-xl">
```

---

## 🎭 Transitions & Animations

### Timing

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `150ms` | Micro-interactions |
| `--transition-base` | `200ms` | Standard (default) |
| `--transition-slow` | `300ms` | Complex animations |

### Common Patterns

```tsx
// Hover states
<button className="transition-colors duration-200 hover:bg-primary-600">

// Shadow on hover
<div className="transition-shadow duration-200 hover:shadow-lg">

// Multiple properties
<div className="transition-all duration-200 hover:scale-105">

// Transform
<div className="transform hover:-translate-y-1 transition-transform duration-200">
```

---

## 📱 Responsive Design Patterns

### Mobile-First Approach

Start with mobile styles, then add breakpoints:

```tsx
<div className="
  p-4 text-base          {/* Mobile */}
  md:p-6 md:text-lg     {/* Tablet */}
  lg:p-8 lg:text-xl     {/* Desktop */}
">
```

### Hide/Show Elements

```tsx
{/* Hide on mobile, show on desktop */}
<div className="hidden lg:block">
  Desktop sidebar
</div>

{/* Show on mobile, hide on desktop */}
<div className="block lg:hidden">
  Mobile menu
</div>
```

### Responsive Stacking

```tsx
<div className="flex flex-col lg:flex-row gap-6">
  {/* Stacks vertically on mobile, horizontally on desktop */}
</div>
```

---

## 🚀 Implementation Guidelines

### Getting Started

1. **Import the design system**: CSS variables are auto-loaded via `globals.css`
2. **Use Tailwind classes**: Leverage utility classes for rapid development
3. **Stay consistent**: Reference patterns in this document
4. **Test accessibility**: Check contrast, keyboard nav, screen readers
5. **Validate responsive**: Test mobile, tablet, desktop

### Best Practices

✅ **DO:**
- Use design tokens (CSS variables) for custom styles
- Stick to the defined color palette
- Use consistent spacing (4, 8, 12, 16, 24, 32, 48, 64px)
- Provide focus states for interactive elements
- Test in light and dark mode
- Write semantic HTML

❌ **DON'T:**
- Use arbitrary color values (`bg-[#ff0000]`)
- Mix spacing systems (use the defined scale)
- Forget keyboard accessibility
- Ignore mobile responsiveness
- Override CSS variables without documenting

### Custom Components

When creating new components, follow these steps:

1. **Check existing patterns**: See if a similar pattern exists
2. **Use design tokens**: Reference `--color-*`, `--space-*`, etc.
3. **Make it accessible**: ARIA labels, focus states, keyboard nav
4. **Make it responsive**: Mobile-first approach
5. **Document it**: Add to this guide if reusable

### Example: Custom Card Component

```tsx
// components/Card.tsx
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  hover?: boolean;
}

export function Card({ 
  children, 
  variant = 'default',
  hover = false 
}: CardProps) {
  const baseClasses = 'bg-white rounded-xl p-6';
  
  const variantClasses = {
    default: 'border border-neutral-200 shadow-sm',
    elevated: 'shadow-md',
    outlined: 'border-2 border-neutral-300',
  };
  
  const hoverClasses = hover 
    ? 'hover:shadow-lg hover:border-primary-300 transition-all duration-200' 
    : '';
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses}`}>
      {children}
    </div>
  );
}

// Usage
<Card variant="elevated" hover>
  <h3>Trip Title</h3>
  <p>Description</p>
</Card>
```

---

## 📝 Code Examples by Component

### TripForm Styling

```tsx
<form className="max-w-2xl mx-auto space-y-6">
  <div>
    <h2 className="text-3xl font-semibold text-text-primary mb-2">
      Create New Trip
    </h2>
    <p className="text-text-secondary">
      Start planning your next adventure
    </p>
  </div>
  
  <div className="space-y-6 bg-white rounded-xl p-6 border border-neutral-200">
    {/* Title Input */}
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        Trip Title *
      </label>
      <input
        type="text"
        required
        className="w-full px-4 py-3 rounded-lg border-2 border-neutral-300 
                   focus:border-primary-500 focus:ring-4 focus:ring-primary-100 
                   transition-all duration-200"
        placeholder="e.g., Summer Road Trip"
      />
    </div>
    
    {/* Date Inputs */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          Start Date *
        </label>
        <input
          type="date"
          required
          className="w-full px-4 py-3 rounded-lg border-2 border-neutral-300 
                     focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
        />
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          End Date *
        </label>
        <input
          type="date"
          required
          className="w-full px-4 py-3 rounded-lg border-2 border-neutral-300 
                     focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
        />
      </div>
    </div>
    
    {/* Description */}
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        Description
      </label>
      <textarea
        rows={4}
        className="w-full px-4 py-3 rounded-lg border-2 border-neutral-300 
                   focus:border-primary-500 focus:ring-4 focus:ring-primary-100 
                   resize-vertical"
        placeholder="Describe your trip..."
      />
    </div>
    
    {/* Actions */}
    <div className="flex gap-3 pt-4">
      <button
        type="submit"
        className="flex-1 bg-primary-500 hover:bg-primary-600 
                   text-white font-medium px-6 py-3 rounded-lg 
                   transition-colors duration-200"
      >
        Create Trip
      </button>
      <button
        type="button"
        className="px-6 py-3 rounded-lg border-2 border-neutral-300 
                   text-neutral-700 hover:bg-neutral-50 
                   transition-colors duration-200"
      >
        Cancel
      </button>
    </div>
  </div>
</form>
```

### TripList Styling

```tsx
<div className="max-w-4xl mx-auto">
  <div className="mb-8">
    <h1 className="text-4xl font-semibold text-text-primary mb-2">
      My Trips
    </h1>
    <p className="text-text-secondary">
      View and manage all your adventures
    </p>
  </div>
  
  {/* Grid of trip cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {trips.map((trip) => (
      <div
        key={trip.id}
        className="bg-white rounded-xl p-6 border border-neutral-200 
                   shadow-sm hover:shadow-md hover:border-primary-300 
                   transition-all duration-200 cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-text-primary 
                         group-hover:text-primary-600 transition-colors">
            {trip.title}
          </h3>
          <span className="text-xs px-3 py-1 rounded-full 
                           bg-success-100 text-success-700">
            Active
          </span>
        </div>
        
        <p className="text-sm text-text-secondary mb-4 line-clamp-2">
          {trip.description}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-text-tertiary mb-4">
          <span className="flex items-center gap-1">
            📅 {trip.startDate} - {trip.endDate}
          </span>
          <span>• {trip.duration} days</span>
        </div>
        
        <div className="flex gap-2 pt-4 border-t border-neutral-200">
          <button className="flex items-center gap-1 text-sm text-neutral-600 
                             hover:text-primary-600 transition-colors">
            ✏️ Edit
          </button>
          <button className="flex items-center gap-1 text-sm text-neutral-600 
                             hover:text-error-600 transition-colors">
            🗑️ Delete
          </button>
        </div>
      </div>
    ))}
  </div>
</div>
```

### TripDetail Styling

```tsx
<div className="max-w-4xl mx-auto">
  {/* Header */}
  <div className="mb-8">
    <nav className="flex items-center gap-2 text-sm mb-4">
      <a href="/" className="text-text-tertiary hover:text-primary-600">
        Home
      </a>
      <span className="text-neutral-400">/</span>
      <a href="/trips" className="text-text-tertiary hover:text-primary-600">
        Trips
      </a>
      <span className="text-neutral-400">/</span>
      <span className="text-text-primary font-medium">
        {trip.title}
      </span>
    </nav>
    
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-4xl font-semibold text-text-primary mb-2">
          {trip.title}
        </h1>
        <div className="flex items-center gap-4 text-text-tertiary">
          <span className="flex items-center gap-1">
            📅 {trip.startDate} - {trip.endDate}
          </span>
          <span>• {trip.duration} days</span>
        </div>
      </div>
      
      <button className="bg-primary-500 hover:bg-primary-600 
                         text-white font-medium px-6 py-3 rounded-lg 
                         transition-colors duration-200">
        Edit Trip
      </button>
    </div>
  </div>
  
  {/* Content */}
  <div className="bg-white rounded-xl p-6 border border-neutral-200 mb-6">
    <h2 className="text-xl font-semibold text-text-primary mb-3">
      Description
    </h2>
    <p className="text-text-secondary leading-relaxed">
      {trip.description}
    </p>
  </div>
  
  {/* Daily Destinations */}
  <div className="bg-white rounded-xl p-6 border border-neutral-200">
    <h2 className="text-xl font-semibold text-text-primary mb-6">
      Daily Itinerary
    </h2>
    <DailyDestinations trip={trip} />
  </div>
</div>
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | March 2, 2026 | Initial design system |

---

## 📞 Support & Questions

For questions about implementing the design system or suggestions for improvements, please:

1. Check this documentation first
2. Review existing component implementations
3. Reach out to the design team
4. Submit a pull request with improvements

---

## 🎯 Quick Reference

### Most Common Patterns

```tsx
// Button
className="bg-primary-500 hover:bg-primary-600 text-white font-medium 
           px-6 py-3 rounded-lg transition-colors duration-200"

// Card
className="bg-white rounded-xl p-6 border border-neutral-200 
           shadow-sm hover:shadow-md transition-shadow duration-200"

// Input
className="w-full px-4 py-3 rounded-lg border-2 border-neutral-300 
           focus:border-primary-500 focus:ring-4 focus:ring-primary-100"

// Heading
className="text-2xl font-semibold text-text-primary"

// Body text
className="text-base text-text-secondary leading-normal"

// Error text
className="text-sm text-error-600"
```

### Color Quick Reference

```tsx
// Backgrounds
bg-white
bg-surface (warm gray)
bg-primary-50 (light accent)

// Text
text-text-primary (heading)
text-text-secondary (body)
text-text-tertiary (metadata)

// Borders
border-neutral-200 (default)
border-primary-500 (active)

// Buttons
bg-primary-500 (primary action)
bg-error-500 (destructive)
bg-white border-primary-500 (secondary)
```

---

**Design System created with ❤️ for the Trip Planner team**
