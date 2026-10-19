# Modal & Dialog Inconsistency Deep-Dive

**Status:** 🔴 **CRITICAL** — One of the largest inconsistencies in Automatos AI  
**Affected Files:** 20+ modal components across agents, assignments, documents, tools  
**Impact:** Every create/edit/delete/configure flow feels different

---

## 🚨 The Problem

### **Current State: No Standard Modal Pattern**

Every modal in Automatos is hand-built from scratch using one of these patterns:

#### **Pattern A: Framer Motion + Card (Most Common)**
```tsx
// Used by: create-agent-modal, agent-details-modal, agent-status-control-modal, etc.
<AnimatePresence>
  <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
  <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <Card className="glass-card card-glow w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/30">
        <CardTitle>...</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="overflow-y-auto p-6">
        {/* content */}
      </CardContent>
    </Card>
  </motion.div>
</AnimatePresence>
```

**Issues:**
- Close button in header (inconsistent with Dialog pattern)
- Custom z-index management
- Manual backdrop handling
- Repeated 100+ lines per modal
- No accessibility features (focus trap, escape key, etc.)

#### **Pattern B: Shadcn Dialog (Rarely Used)**
```tsx
// Used by: alert-dialog.tsx, drawer.tsx (NOT used for main modals)
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="glass-card...">
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

**Issues:**
- Built-in close button (top-right, absolute positioned)
- Different animation style
- Accessibility built-in BUT inconsistent with Pattern A

#### **Pattern C: Sheet (Side Panels)**
```tsx
// Used by: some settings panels
<Sheet open={open} onOpenChange={onClose}>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>...</SheetTitle>
    </SheetHeader>
    {/* content */}
  </SheetContent>
</Sheet>
```

**Issues:**
- Slides from side instead of center
- Different backdrop style
- Different close button styling

---

## 📊 Inconsistency Breakdown

I audited **every modal** in the agents folder. Here's what I found:

| Modal File | Size | Pattern | Max Width | Header Style | Close Button | Footer |
|------------|------|---------|-----------|--------------|--------------|--------|
| `create-agent-modal.tsx` | 53KB | Framer+Card | `max-w-4xl` | Custom CardHeader | In header, top-right | No |
| `agent-details-modal.tsx` | 32KB | Framer+Card | `max-w-6xl` | Custom CardHeader | In header, top-right | No |
| `agent-status-control-modal.tsx` | 27KB | Framer+Card | `max-w-4xl` | Custom CardHeader | In header, top-right | Custom div |
| `agent-confirm-delete-modal.tsx` | 5KB | AlertDialog | `max-w-lg` | DialogHeader | Radix built-in | AlertDialogFooter |
| `skill-detail-modal.tsx` | 12KB | Framer+Card | `max-w-3xl` | Custom CardHeader | In header, top-right | No |

**Observations:**
- **5 different max-widths** across 5 modals (4xl, 6xl, 4xl, lg, 3xl)
- **2 different patterns** (Framer vs Radix)
- **Inconsistent padding:** Some use `p-6`, some `p-4`, some `px-8 pt-6 pb-4`
- **Close button:** Always top-right, but different containers
- **Footer:** Some have, some don't, no standard structure

---

## 🎯 The Solution

### **Build ONE Canonical Modal Component**

**File:** `frontend/components/shared/modal.tsx`

**Requirements:**
1. ✅ Uses Radix Dialog (accessibility built-in)
2. ✅ Glass morphism styling (`glass-card` + `card-glow`)
3. ✅ Consistent header (title + optional subtitle + close button)
4. ✅ Optional footer slot for actions
5. ✅ Size variants: `sm` (400px), `md` (600px), `lg` (800px), `xl` (1000px), `full` (90vw)
6. ✅ Backdrop blur (`bg-black/50 backdrop-blur-sm`)
7. ✅ Rounded corners (`rounded-3xl` for premium feel)
8. ✅ Consistent padding (`px-8 py-6` content, `px-8 pt-6 pb-4` header)
9. ✅ Max height scroll (`max-h-[80vh]` with overflow-y-auto)
10. ✅ Mobile responsive

---

## 🛠️ Implementation Plan

### **Phase 1: Create Modal Component** (30 min)

Create `frontend/components/shared/modal.tsx`:

```tsx
'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',      // 448px - small confirmations
  md: 'max-w-lg',      // 512px - standard forms
  lg: 'max-w-2xl',     // 672px - detailed forms
  xl: 'max-w-4xl',     // 896px - complex multi-step
  full: 'max-w-[90vw]' // 90% viewport - full-screen modals
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'glass-card backdrop-blur-xl rounded-3xl p-0 gap-0',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-white/8">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 justify-end px-8 pb-6 pt-4 border-t border-white/8">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

### **Phase 2: Migrate Existing Modals** (4-6 hours)

**High-Priority Modals to Migrate:**

| File | Current Size | After Migration | Time | Priority |
|------|--------------|----------------|------|----------|
| `create-agent-modal.tsx` | 53KB | ~35KB | 1.5h | 🔴 Critical |
| `agent-details-modal.tsx` | 32KB | ~20KB | 1h | 🔴 Critical |
| `agent-status-control-modal.tsx` | 27KB | ~18KB | 1h | 🟡 High |
| `skill-detail-modal.tsx` | 12KB | ~8KB | 30min | 🟡 High |
| `import-git-modal.tsx` | 7KB | ~5KB | 20min | 🟢 Medium |
| `create-skill-modal.tsx` | 11KB | ~7KB | 30min | 🟢 Medium |

**Estimated Total:** ~4.5 hours  
**Code Reduction:** ~40KB total (30% smaller modals)

---

### **Before/After Example: Create Agent Modal**

#### ❌ **Before** (Pattern A - Framer+Card):
```tsx
<AnimatePresence>
  <motion.div
    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  />
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
  >
    <Card className="glass-card card-glow w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/30">
        <CardTitle className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-primary" />
          <div>
            <span className="text-xl">Create New <span className="gradient-text">Agent</span></span>
            <p className="text-sm text-muted-foreground font-normal">
              Configure your agent's settings
            </p>
          </div>
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="overflow-y-auto p-6">
        {/* 1000+ lines of content */}
      </CardContent>
    </Card>
  </motion.div>
</AnimatePresence>
```

**Issues:**
- 25 lines of boilerplate
- Manual z-index + animation
- No accessibility
- Custom close button

#### ✅ **After** (Canonical Modal):
```tsx
<Modal
  open={open}
  onClose={onClose}
  title="Create New Agent"
  subtitle="Configure your agent's settings"
  size="xl"
  footer={
    <>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={handleCreate} disabled={isCreating}>
        {isCreating ? 'Creating...' : 'Create Agent'}
      </Button>
    </>
  }
>
  {/* Content only - no wrapper cruft */}
  <Tabs value={`step-${step}`}>
    {/* ... */}
  </Tabs>
</Modal>
```

**Benefits:**
- 15 lines (60% reduction)
- Accessibility built-in
- Consistent styling
- Footer slot for actions

---

## 📋 Migration Checklist

For each modal file:

### 1. **Import Modal Component**
```tsx
import { Modal } from '@/components/shared/modal'
```

### 2. **Remove Framer Motion Boilerplate**
Delete:
- `import { motion, AnimatePresence } from 'framer-motion'`
- Backdrop `<motion.div>`
- Wrapper `<motion.div>`
- `<Card className="glass-card...">` wrapper

### 3. **Replace with Modal Wrapper**
```tsx
<Modal
  open={open}
  onClose={onClose}
  title="Your Title"
  subtitle="Optional subtitle"
  size="xl"  // sm | md | lg | xl | full
  footer={/* optional action buttons */}
>
  {/* Content only */}
</Modal>
```

### 4. **Move Header Content**
- Title → `title` prop
- Subtitle → `subtitle` prop
- Icon → Include in title text OR render in content
- Delete `<CardHeader>` wrapper

### 5. **Move Content**
- Delete `<CardContent className="overflow-y-auto p-6">`
- Content goes directly in `<Modal>` children
- Padding/scroll handled by Modal

### 6. **Move Footer (if exists)**
- Delete custom footer div
- Wrap action buttons in `footer` prop
- Buttons automatically right-aligned

### 7. **Remove Close Button**
- Delete manual `<Button variant="ghost" size="icon" onClick={onClose}>`
- Modal component handles close button

### 8. **Update Size**
Map old max-width to new size prop:
- `max-w-md` → `size="sm"`
- `max-w-lg` → `size="md"`
- `max-w-2xl` → `size="lg"`
- `max-w-4xl` → `size="xl"`
- `max-w-6xl` → `size="xl"` (or `full` if truly needs 90vw)

---

## 🎨 Visual Standards (After Migration)

### **All Modals Will Have:**

| Element | Standard |
|---------|----------|
| **Border Radius** | `rounded-3xl` (24px) |
| **Backdrop** | `bg-black/50 backdrop-blur-sm` |
| **Background** | `glass-card` (frosted glass) |
| **Max Height** | `max-h-[80vh]` (scrollable content) |
| **Header Padding** | `px-8 pt-6 pb-4` |
| **Content Padding** | `px-8 py-6` |
| **Footer Padding** | `px-8 pb-6 pt-4` |
| **Close Button** | `w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10` (top-right of header) |
| **Title Size** | `text-xl font-semibold` |
| **Subtitle Size** | `text-sm text-muted-foreground` |
| **Footer Buttons** | Right-aligned, `gap-3` |

---

## 🚀 Impact After Migration

### **Before:**
- ❌ 3 different modal patterns
- ❌ 5+ different max-widths
- ❌ Inconsistent close buttons
- ❌ No accessibility
- ❌ 53KB+ modal files
- ❌ 100+ lines of boilerplate per modal

### **After:**
- ✅ ONE canonical Modal component
- ✅ 5 size variants (sm/md/lg/xl/full)
- ✅ Consistent close button (always top-right in header)
- ✅ Accessibility built-in (focus trap, escape key, screen readers)
- ✅ 30% smaller modal files
- ✅ 15 lines to define a modal

### **User Experience:**
- ✅ Every modal feels part of one product
- ✅ Predictable close behavior
- ✅ Consistent animations
- ✅ Premium glass morphism everywhere
- ✅ Faster load times (less code)

---

## 🔍 Special Cases

### **AlertDialog (Confirmations)**
Keep using `AlertDialog` for destructive confirmations:
```tsx
<AlertDialog open={open} onOpenChange={onClose}>
  <AlertDialogContent className="glass-card">
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-destructive">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Why:** AlertDialog has specific ARIA roles for confirmations.

### **Sheet (Side Panels)**
Keep using `Sheet` for settings panels that slide from side:
```tsx
<Sheet open={open} onOpenChange={onClose}>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Settings</SheetTitle>
    </SheetHeader>
    {/* content */}
  </SheetContent>
</Sheet>
```

**Why:** Side panels are a different UX pattern.

### **Full-Screen Modals**
Use `size="full"` for complex multi-step wizards:
```tsx
<Modal
  open={open}
  onClose={onClose}
  title="Agent Configuration Wizard"
  size="full"
>
  {/* Complex multi-step content */}
</Modal>
```

---

## 📈 Success Metrics

After migration:

- **Consistency Score:** Modals go from **40%** → **95%** consistency
- **Code Reduction:** ~40KB total (30% smaller)
- **Development Speed:** New modals take 5 minutes instead of 30 minutes
- **Accessibility:** 100% of modals have keyboard navigation, focus trap, ARIA labels
- **User Experience:** Predictable close behavior, consistent animations, premium feel

---

## 🆘 Common Migration Issues

### **Issue: Icon in title**
**Before:**
```tsx
<CardTitle className="flex items-center space-x-3">
  <Bot className="w-6 h-6 text-primary" />
  <span>Title</span>
</CardTitle>
```

**Solution:** Render icon in content OR as part of title text:
```tsx
<Modal title="🤖 Create Agent" ...>
```

OR use subtitle for context:
```tsx
<Modal
  title="Create Agent"
  subtitle="Configure AI agent settings"
  ...>
```

### **Issue: Custom header actions**
**Before:**
```tsx
<CardHeader>
  <CardTitle>Title</CardTitle>
  <DropdownMenu>...</DropdownMenu>  {/* Extra actions */}
</CardHeader>
```

**Solution:** Move actions to content OR use footer:
```tsx
<Modal title="Title" footer={
  <>
    <DropdownMenu>...</DropdownMenu>
    <Button>Save</Button>
  </>
}>
```

### **Issue: Multi-step wizards with internal navigation**
**Before:** Custom tab navigation in header

**Solution:** Use `size="xl"` or `size="full"` and render tabs in content:
```tsx
<Modal size="xl" title="Configuration Wizard">
  <Tabs value={step}>
    <TabsList>...</TabsList>
    <TabsContent>...</TabsContent>
  </Tabs>
</Modal>
```

---

**This is investor-critical.** Modals are the FIRST thing users see when creating agents, configuring settings, or confirming actions. Inconsistent modals = unfinished product.
