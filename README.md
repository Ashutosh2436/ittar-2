# ⚜ MAISON D'ITTAR

> *Pure, non-alcoholic perfume oils. Distilled slowly, worn forever.*

A high-end luxury e-commerce landing page for a premium Ittar (perfume oil) brand, featuring real-time 3D WebGL scroll-driven storytelling.

---

## ✨ Features

- **Interactive 3D WebGL** — Procedurally generated luxury crystal Ittar bottle rendered with Three.js, physically-based materials (glass, amber liquid, gold)
- **Draco-Compressed 3D Asset** — GLB model optimized with Draco compression for fast load
- **GSAP ScrollTrigger Storytelling** — Bottle animates, translates, and rotates as you scroll through 5 editorial sections
- **Premium Custom Cursor** — Gold dot + trailing magnetic ring with contextual states (hover, button, text)
- **Olfactory Note Particles** — Interactive scent notes trigger particle bursts from the 3D bottle
- **Dynamic Material Switching** — Switching between 3 elixirs interpolates liquid color, label, and scene lighting
- **Procedural Web Audio** — Ambient drone + crystal glass chimes via Web Audio API (no audio files needed)
- **E-Commerce Cart Drawer** — Fully functional cart with quantity pickers, dynamic pricing, and checkout flow
- **Obsidian & Gold Aesthetic** — Editorial serif typography (Cormorant Garamond + Cinzel), dark glassmorphism UI

---

## 🗂 Project Structure

```
├── public/
│   ├── assets/
│   │   ├── ittar_bottle.glb          # Raw exported 3D model
│   │   └── ittar_bottle_draco.glb    # Draco-compressed model (loaded by app)
│   └── draco/                        # WebAssembly Draco decoder files
├── src/
│   ├── generate-model.js             # Node.js script: builds & exports the 3D bottle
│   ├── main.js                       # Three.js engine, GSAP, cursor, cart, audio
│   └── style.css                     # Full luxury design system
└── index.html                        # Entry HTML with all sections
```

---

## 🚀 Run Locally

```bash
# Install dependencies
npm install

# Start dev server at http://localhost:5173
npm run dev

# Production build
npm run build
```

---

## 🔧 Regenerate the 3D Model (Optional)

The model is pre-built and committed. To regenerate from scratch:

```bash
# 1. Generate the raw bottle GLB
node src/generate-model.js

# 2. Compress it with Draco
npx gltf-pipeline -i public/assets/ittar_bottle.glb \
  -o public/assets/ittar_bottle_draco.glb \
  --draco.compressionLevel 10
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Build Tool | Vite 8 |
| 3D Rendering | Three.js r184 |
| Animation | GSAP 3 + ScrollTrigger |
| 3D Compression | Draco / gltf-pipeline |
| Audio | Web Audio API (procedural) |
| Fonts | Cormorant Garamond, Cinzel, Inter |
| Styling | Vanilla CSS with custom properties |

---

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo — Vercel auto-detects Vite
4. Click **Deploy** — your luxury site is live in ~60 seconds

---

*Designed and engineered as a luxury creative technology showcase.*
