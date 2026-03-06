# Design System Component Migration Guide

**Purpose**: Quick reference for applying the Trip Planner Design System to existing components  
**Date**: March 2, 2026

---

## 📋 Overview

This guide shows how to apply the new design system to each existing component. All patterns reference the comprehensive [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) documentation.

---

## 🗂️ Component Migration Checklist

### TripForm Component
**File**: `src/app/map/components/TripForm.tsx`

#### Before (Current Styling)
```tsx
// Generic blues, basic grays
className="border border-gray-300 focus:border-blue-500"
```

#### After (Design System)
```tsx
// Warm terracotta palette, consistent tokens
className="border-2 border-neutral-300 
           focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
```

#### Changes Needed:
- ✅ Replace blue colors with `primary-500/600` (terracotta)
- ✅ Update gray tones to `neutral-*` (warm grays)
- ✅ Add focus rings with `ring-primary-100`
- ✅ Use consistent spacing: `px-4 py-3` for inputs
- ✅ Add transitions: `transition-all duration-200`
- ✅ Update error states: `border-error-500` with `ring-error-100`
- ✅ Use success states: `bg-success-50 border-success-500`

#### Key Patterns:
```tsx
// Text Input
<input className="
  w-full px-4 py-3 rounded-lg
  border-2 border-neutral-300
  focus:border-primary-500 focus:ring-4 focus:ring-primary-100
  transition-all duration-200
" />

// Submit Button
<button className="
  bg-primary-500 hover:bg-primary-600 active:bg-primary-700
  text-white font-medium px-6 py-3 rounded-lg
  transition-colors duration-200
" />

// Error Message
<p className="text-sm text-error-600 flex items-center gap-1">
  ⚠ {errorMessage}
</p>

// Success Message
<div className="bg-success-50 border-l-4 border-success-500 rounded-lg p-4">
  <p className="text-sm text-success-800">Trip created successfully!</p>
</div>
```

---

### TripList Component
**File**: `src/app/map/components/TripList.tsx`

#### Before (Current Styling)
```tsx
// Basic borders, blue spinner
className="border border-gray-300"
className="border-blue-600"
```

#### After (Design System)
```tsx
// Warm borders, terracotta spinner
className="border border-neutral-200 hover:border-primary-300"
className="border-primary-600"
```

#### Changes Needed:
- ✅ Replace loading spinner: `border-primary-600` + `border-primary-200`
- ✅ Update card styling: rounded-xl, shadow-sm, hover states
- ✅ Use warm gray borders: `border-neutral-200`
- ✅ Add hover effects: `hover:shadow-md hover:border-primary-300`
- ✅ Update text colors: `text-text-primary`, `text-text-secondary`
- ✅ Replace red error bg: `bg-error-50 border-error-500`

#### Key Patterns:
```tsx
// Trip Card
<div className="
  bg-white rounded-xl p-6
  border border-neutral-200
  shadow-sm hover:shadow-md hover:border-primary-300
  transition-all duration-200
  cursor-pointer group
">
  <h3 className="text-xl font-semibold text-text-primary 
                 group-hover:text-primary-600">
    {trip.title}
  </h3>
  <p className="text-sm text-text-secondary mt-2">
    {trip.description}
  </p>
</div>

// Loading Spinner
<div className="flex flex-col items-center gap-3 p-8">
  <div className="h-10 w-10 border-4 border-primary-200 border-t-primary-600 
                  rounded-full animate-spin" />
  <p className="text-sm text-text-tertiary">Loading trips...</p>
</div>

// Error State
<div className="bg-error-50 border-l-4 border-error-500 rounded-lg p-4">
  <p className="text-sm text-error-800">
    <strong>Error:</strong> {errorMessage}
  </p>
</div>

// Empty State
<div className="flex flex-col items-center py-16 px-6 
                bg-surface rounded-xl border-2 border-dashed border-neutral-300">
  <div className="text-6xl mb-4">🗺️</div>
  <h3 className="text-xl font-semibold text-text-primary mb-2">
    No trips yet
  </h3>
  <p className="text-text-secondary mb-6">
    Start planning your adventure
  </p>
</div>
```

---

### TripDetail Component
**File**: `src/app/map/components/TripDetail.tsx`

#### Changes Needed:
- ✅ Update card backgrounds: `bg-white` with `border-neutral-200`
- ✅ Add breadcrumb navigation with proper styling
- ✅ Use semantic heading hierarchy: `text-4xl`, `text-2xl`, etc.
- ✅ Update button styles: primary action buttons
- ✅ Consistent spacing: `space-y-6` for sections

#### Key Patterns:
```tsx
// Breadcrumbs
<nav className="flex items-center gap-2 text-sm mb-4">
  <a href="/" className="text-text-tertiary hover:text-primary-600">Home</a>
  <span className="text-neutral-400">/</span>
  <a href="/trips" className="text-text-tertiary hover:text-primary-600">Trips</a>
  <span className="text-neutral-400">/</span>
  <span className="text-text-primary font-medium">{trip.title}</span>
</nav>

// Page Header
<h1 className="text-4xl font-semibold text-text-primary mb-2">
  {trip.title}
</h1>

// Content Card
<div className="bg-white rounded-xl p-6 border border-neutral-200 mb-6">
  <h2 className="text-xl font-semibold text-text-primary mb-3">
    Description
  </h2>
  <p className="text-text-secondary leading-relaxed">
    {trip.description}
  </p>
</div>
```

---

### DailyDestinations Component
**File**: `src/app/map/components/DailyDestinations.tsx`

#### Changes Needed:
- ✅ Style destination list items consistently
- ✅ Add hover states for interactive elements
- ✅ Update date displays with proper typography
- ✅ Use semantic colors for status indicators

#### Key Patterns:
```tsx
// Destination List
<div className="divide-y divide-neutral-200 border border-neutral-200 rounded-lg">
  {destinations.map((dest) => (
    <div key={dest.id} className="px-6 py-4 hover:bg-neutral-50 
                                   transition-colors cursor-pointer">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-text-primary">{dest.name}</h4>
          <p className="text-sm text-text-secondary mt-1">{dest.notes}</p>
        </div>
        <span className="text-sm text-text-tertiary">Day {dest.day}</span>
      </div>
    </div>
  ))}
</div>

// Add Destination Button
<button className="
  w-full py-3 border-2 border-dashed border-neutral-300
  hover:border-primary-400 hover:bg-primary-50
  text-neutral-600 hover:text-primary-600
  rounded-lg transition-all duration-200
  flex items-center justify-center gap-2
">
  <span>+</span>
  <span>Add Destination</span>
</button>
```

---

### Map Page
**File**: `src/app/map/page.tsx`

#### Changes Needed:
- ✅ Update page layout and container styles
- ✅ Apply consistent padding: `px-6` or `p-8`
- ✅ Use proper heading styles
- ✅ Coordinate colors with map markers (use `primary-500` for markers)

#### Key Patterns:
```tsx
// Page Container
<div className="min-h-screen bg-background">
  <div className="max-w-7xl mx-auto px-6 py-8">
    <h1 className="text-4xl font-semibold text-text-primary mb-8">
      Trip Planner
    </h1>
    {/* Content */}
  </div>
</div>

// Split View (Sidebar + Map)
<div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
  {/* Sidebar */}
  <aside className="lg:w-96 overflow-y-auto">
    <TripList />
  </aside>
  
  {/* Map */}
  <div className="flex-1 rounded-xl overflow-hidden border border-neutral-200">
    <Map />
  </div>
</div>
```

---

## 🎨 Common Replacements

### Color Mapping

| Old | New | Use Case |
|-----|-----|----------|
| `blue-500` | `primary-500` | Primary actions |
| `blue-600` | `primary-600` | Primary hover |
| `gray-300` | `neutral-300` | Borders |
| `gray-600` | `text-secondary` | Body text |
| `gray-900` | `text-primary` | Headings |
| `red-500` | `error-500` | Error states |
| `red-50` | `error-50` | Error backgrounds |
| `green-500` | `success-500` | Success states |

### Component Class Patterns

```tsx
// OLD → NEW

// Border
"border border-gray-300" 
→ "border-2 border-neutral-300"

// Focus
"focus:border-blue-500 focus:outline-none"
→ "focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none"

// Button
"bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
→ "bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-lg 
   transition-colors duration-200"

// Card
"bg-white rounded shadow p-4 border border-gray-200"
→ "bg-white rounded-xl p-6 border border-neutral-200 shadow-sm 
   hover:shadow-md transition-shadow duration-200"

// Text
"text-gray-900"
→ "text-text-primary"

"text-gray-600"
→ "text-text-secondary"

"text-sm text-gray-500"
→ "text-sm text-text-tertiary"
```

---

## 🚀 Implementation Order

**Recommended order for applying the design system:**

1. **globals.css** ✅ (Already updated)
2. **Design tokens** ✅ (CSS variables in place)
3. **TripForm** - Most visible, user-facing feature
4. **TripList** - Core navigation component
5. **TripDetail** - Important detail view
6. **DailyDestinations** - Supporting feature
7. **Map page** - Main layout
8. **Shared components** - Any reusable pieces

---

## 🎯 Testing Checklist

After applying the design system to each component:

- [ ] **Visual**: Component matches design system aesthetic
- [ ] **Colors**: Uses primary-500 (terracotta) instead of blue
- [ ] **Typography**: Proper heading hierarchy and text colors
- [ ] **Spacing**: Consistent padding and margins
- [ ] **Hover states**: Smooth transitions on interactive elements
- [ ] **Focus states**: Visible focus indicators (ring-primary-500)
- [ ] **Error states**: Red error colors with proper contrast
- [ ] **Success states**: Green success colors
- [ ] **Responsive**: Works on mobile, tablet, desktop
- [ ] **Dark mode**: Looks good in dark mode (optional)
- [ ] **Accessibility**: Proper ARIA labels, keyboard navigation

---

## 🔧 VS Code Tips

### Find and Replace

Use these regex patterns in VS Code to speed up migration:

**Replace blue with primary:**
```
Find: bg-blue-(500|600|700)
Replace: bg-primary-$1
```

**Replace gray with neutral:**
```
Find: border-gray-300
Replace: border-neutral-300
```

**Add transitions:**
```
Find: hover:bg-
Replace: transition-colors duration-200 hover:bg-
```

### Multi-cursor Editing

1. Select color class (e.g., `text-gray-600`)
2. Press `Cmd+D` (Mac) or `Ctrl+D` (Windows) to select next occurrence
3. Edit all at once

---

## 📚 Reference Links

- **Full Design System**: [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)
- **Tailwind v4 Docs**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev/icons
- **WCAG Contrast Checker**: https://webaim.org/resources/contrastchecker/

---

## 💡 Quick Tips

1. **Copy patterns from DESIGN-SYSTEM.md** - Don't reinvent, reuse documented patterns
2. **Use CSS variables** - For one-off styles: `style={{ color: 'var(--color-primary-500)' }}`
3. **Test incrementally** - Update one component at a time
4. **Check dark mode** - Toggle in browser DevTools
5. **Validate accessibility** - Use browser accessibility tools

---

## 🎨 Before/After Example

### TripForm Submit Button

**Before:**
```tsx
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Create Trip
</button>
```

**After:**
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

**Improvements:**
- ✅ Warm terracotta color (primary-500) instead of blue
- ✅ Better spacing (px-6 py-3)
- ✅ Smooth transitions
- ✅ Proper focus state
- ✅ Active state
- ✅ Disabled state
- ✅ Larger border radius (rounded-lg)

---

**Happy styling! 🎨**  
For questions, reference the main [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) documentation.
