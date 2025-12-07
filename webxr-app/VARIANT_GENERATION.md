# 🎨 Multi-Variant Structure Generation System

## ✅ Feature Overview

When users generate a structure, they now see **5 different AI-generated variants** to choose from, instead of getting a single structure immediately.

---

## 🎮 User Experience Flow

### 1. User Enters Prompt
```
Input: "tower with bridge"
Click: "🤖 Generate with AI"
```

### 2. System Generates 5 Variants
```
🎨 Generating structure variants...
📐 Generating 5 structure variants with Claude...
```

Behind the scenes:
- Calls `/api/generate-variants` endpoint
- Creates 5 unique interpretations of the prompt
- Each variant has a description

### 3. Variant Selection UI Appears
A modal pops up showing **5 cards** in a grid:

```
┌─────────────────────────────────────────┐
│     Choose Your Structure               │
│  Select one of these AI-generated      │
│             variants                     │
├─────────────────────────────────────────┤
│                                         │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐│
│  │ 🏗️ │  │ 🏗️ │  │ 🏗️ │  │ 🏗️ │  │ 🏗️ ││
│  │Var1│  │Var2│  │Var3│  │Var4│  │Var5││
│  └────┘  └────┘  └────┘  └────┘  └────┘│
│                                         │
│           [Cancel]                      │
└─────────────────────────────────────────┘
```

### 4. User Selects Variant
- Click any card
- Hover shows green highlight
- Selected variant is built in the scene

### 5. Structure Renders
```
✅ User selected variant 3
✅ Structure spawn complete! Total blocks: 8
✅ "tower with bridge - Variant 3" created!
```

---

## 🔧 Technical Implementation

### New Components Created:

#### 1. **`VariantPreview.ts`** - UI System
```typescript
class VariantPreviewSystem {
    showVariants(variants[], onSelect) 
    hide()
    createVariantCard()
}
```

Features:
- Modal overlay (center screen)
- Glassmorphism design
- Grid layout (responsive)
- Hover effects
- Click to select
- Cancel button

#### 2. **`Agent.ts`** - Backend Integration
```typescript
async generateVariants(prompt, count = 5): Promise<Variant[]>
```

Calls:
- `/api/generate-variants` endpoint
- Returns array of `{description, data}` objects
- Fallback: generates multiple calls if endpoint fails

#### 3. **`main.ts`** - Integration
```typescript
spawnStructure: async (prompt) => {
    1. Call generateVariants(prompt, 5)
    2. Convert to StructureVariant[] format
    3. Show variant preview UI
    4. On selected 4:
       - Clear scene
       - Build selected variant
       - Register with FEA
       - Update intersectables
}
```

---

## 📊 Variant Data Structure

```typescript
interface StructureVariant {
    id: number;               // 0-4
    description: string;      // "tower with bridge - Variant 1"
    preview: string;          // Empty for now (future: thumbnail)
    buildInstructions: any[]; // Array of {type, pos, size}
}
```

---

## 🎨 UI Design

### Modal Styling:
- **Background**: `rgba(10, 10, 10, 0.95)` with 20px backdrop blur
- **Border**: 2px neon green `rgba(0, 255, 136, 0.3)`
- **Position**: Fixed center (`transform: translate(-50%, -50%)`)
- **Z-index**: 1000 (above everything)

### Variant Cards:
- **Size**: 200px min-width, auto-fit grid
- **Background**: `rgba(255, 255, 255, 0.05)`
- **Icon**: 🏗️ (3rem)
- **Hover**: Lift effect (`translateY(-5px)`)
- **Hover Color**: Green tint with brighter border

### Responsive:
- Max 90vw width
- Max 90vh height
- Scrollable overflow
- Grid auto-adjusts columns

---

## 🌐 Backend Requirements

### New Endpoint Needed:
```http
POST /api/generate-variants
Content-Type: application/json

{
    "prompt": "tower with bridge",
    "count": 5
}
```

### Expected Response:
```json
{
    "variants": [
        {
            "description": "Tall modern tower with suspension bridge",
            "data": [{type: "box", pos: [0,0,0], size: [1,2,1]}, ...]
        },
        {
            "description": "Medieval fortress with drawbridge",
            "data": [...]
        },
        // ... 3 more variants
    ]
}
```

### Fallback Behavior:
If endpoint doesn't exist:
- Calls `generateStructure()` 5 times
- Appends "(variation N)" to prompt
- Still shows variant selector

---

## 🎯 Usage Examples

### Example 1: Bridge
```
Prompt: "suspension bridge"

Variants shown:
1. Simple cable-stayed bridge
2. Long multi-span suspension bridge
3. Tower bridge with gothic elements
4. Modern minimalist bridge
5. Cantilever bridge design
```

### Example 2: Tower
```
Prompt: "tall tower"

Variants shown:
1. Cylindrical tower (9 blocks tall)
2. Square fortress tower (7 blocks)
3. Tapered modern tower (11 blocks)
4. Medieval watchtower with base
5. Communication tower (thin, very tall)
```

---

## 💡 Future Enhancements

### 1. **Thumbnail Previews**
- Render mini 3D previews
- Screenshot each variant
- Show in card instead of 🏗️ emoji

### 2. **Variant Metadata**
- Show block count
- Show estimated material
- Show complexity rating

### 3. **Favorites**
- Save liked variants
- Load from history
- Share variant codes

### 4. **Customization After Selection**
- "Edit this variant" button
- Modify before finalizing
- Hybrid approach

### 5. **Performance Metrics**
- Generation time per variant
- Caching for repeated prompts
- Parallel generation

---

## 📱 Mobile/VR Considerations

### Desktop:
- Click to select
- Hover preview
- Keyboard navigation (future)

### VR:
- Laser pointer selection
- Hand tracking tap
- Controller button

### Mobile:
- Touch to select
- Swipe through variants (future)
- Responsive grid

---

## 🐛 Known Limitations

1. **No Real Previews**: Using 🏗️ emoji instead of actual 3D thumbnails
2. **Backend Dependency**: Requires `/api/generate-variants` endpoint
3. **Generation Time**: Creates 5 structures = 5x wait time
4. **No Persistence**: Variants lost if user cancels

---

## ✅ Testing Checklist

- [ ] Enter prompt, verify 5 variants appear
- [ ] Click variant 1, structure renders
- [ ] Try variant 5, different structure appears
- [ ] Click "Cancel", modal closes, no structure added
- [ ] Hover over cards, green highlight works
- [ ] Responsive on smaller screens
- [ ] Backend endpoint returns 5 unique variants
- [ ] Fallback works when endpoint unavailable

---

## 🚀 Summary

The multi-variant generation system provides a **better UX** by:
- ✅ Giving users **choice**
- ✅ Showing **AI creativity** (5 interpretations)
- ✅ Preventing **unwanted structures**
- ✅ Improving **satisfaction** with AI output

Users can now see options before committing, making the AI generation feel more collaborative! 🎨
