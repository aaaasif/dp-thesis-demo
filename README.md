# DP Medical — Thesis Demo Website

Interactive defence website for the bachelor thesis:

> **Privacy-Preserving Medical Data Analysis System using Differential Privacy and Deep Learning**
> Abdullah Al Asif · Student ID 2022521460130
> Supervisor: Prof. Hu Dasha
> College of Software Engineering, Sichuan University
> Academic year 2025–2026

---

## What this is

A two-tier prototype that visualises every empirical result in the thesis: dataset
explorer, live-style DP-SGD inference demo, results dashboard with privacy–utility
curves and confusion matrices, methodology page, and a 10-step scripted defence
walkthrough. The backend serves the canonical accuracy table from the thesis (no
real model is loaded — predictions are simulated to match Table 1 deterministically).

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                      Browser (localhost:5173)                      │
│  ──────────────────────────────────────────────────────────────    │
│   React 18 + Vite 5 + Tailwind 3 + Recharts + Framer Motion        │
│   Routes: / /datasets /demo /results /about /demo-script           │
│   axios → /api/*  (proxied by Vite)                                │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  │  HTTP / JSON
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                  FastAPI backend (localhost:8000)                  │
│  ──────────────────────────────────────────────────────────────    │
│   /api/health          stack identity                              │
│   /api/datasets        BloodMNIST + PathMNIST metadata             │
│   /api/results         canonical accuracy table (Table 1)          │
│   /api/results/clipping clipping-norm sweep (Table 2)              │
│   /api/confusion       synthetic, seeded confusion matrices        │
│   /api/predict         simulated DP-SGD inference (deterministic)  │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  │  reads
                                  ▼
                ┌─────────────────────────────────┐
                │  Hard-coded thesis numbers      │
                │  (no DB, no model weights)      │
                └─────────────────────────────────┘
```

---

## Quick start

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10

### 1) Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/docs` for interactive Swagger UI.

### 2) Frontend (separate terminal)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Optional: production build

```bash
npm run build
npm run preview
```

---

## Folder tree

```
dp-thesis-demo/
├── backend/
│   ├── main.py                 # FastAPI app (one file)
│   └── requirements.txt
├── src/
│   ├── components/
│   │   ├── ArchDiagram.jsx     # 5-stage SVG pipeline (Figure 7)
│   │   ├── Card.jsx
│   │   ├── ConfusionMatrix.jsx
│   │   ├── Footer.jsx          # contains ScopeRibbon
│   │   ├── Navbar.jsx
│   │   ├── NoiseViz.jsx        # gradient → clipped → noisy bars
│   │   ├── PageTransition.jsx
│   │   ├── ScopeRibbon.jsx     # appears on every page footer
│   │   ├── Spinner.jsx
│   │   └── ToastProvider.jsx
│   ├── data/
│   │   └── results.js          # canonical thesis numbers (offline cache)
│   ├── lib/
│   │   ├── api.js              # axios + interceptors
│   │   └── useAsync.js
│   ├── pages/
│   │   ├── About.jsx           # methodology, math, references
│   │   ├── Datasets.jsx
│   │   ├── Demo.jsx            # live DP-SGD inference panel
│   │   ├── DemoScript.jsx      # 10-step defence walkthrough
│   │   ├── Home.jsx            # title, abstract, PDF export
│   │   └── Results.jsx         # main charts + PNG export
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── defense-questions.md        # 20 examiner Q&As
├── index.html
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── vite.config.js
```

---

## Canonical results

| Dataset    | Baseline | ε = 1  | ε = 4  | ε = 8  |
|------------|----------|--------|--------|--------|
| BloodMNIST | 93.60%   | 68.58% | 76.88% | 77.58% |
| PathMNIST  | 88.62%   | 82.66% | 83.57% | 83.98% |

δ = 10⁻⁵ across all experiments · RDP accountant · Opacus 1.4.0.
Clipping-norm sweep (BloodMNIST, ε = 4): C = 0.5 → 75.71%, C = 1.0 → 76.91%, C = 1.5 → 77.40% (optimal), C = 2.0 → 78.31%.
RGP and GEP are theoretical comparisons only (†).

---

## Defence-day features

- **`/demo-script`** — printable 10-step walkthrough with Next/Prev controls.
- **Home → Download one-page PDF** — auto-generated A4 summary (jsPDF).
- **Results → Export charts as PNG** — single tall PNG of all charts (html2canvas).
- **Scope ribbon** — visible on every page footer, makes the empirical/theoretical
  split unambiguous to the committee.

---

## Screenshots

> Replace these placeholders with real screenshots before defence.
> Recommended: take 1280×800 captures of each page on Chrome at 100% zoom.

| Page          | Filename                  |
|---------------|---------------------------|
| Home          | `docs/screenshots/01-home.png`         |
| Datasets      | `docs/screenshots/02-datasets.png`     |
| Demo          | `docs/screenshots/03-demo.png`         |
| Results       | `docs/screenshots/04-results.png`      |
| Methodology   | `docs/screenshots/05-methodology.png`  |
| Defence script| `docs/screenshots/06-demo-script.png`  |

---

## Known limitations (matches thesis Ch. 6.4)

1. **DP-SGD only.** RGP and GEP are presented as theoretical comparisons (†). No
   production-ready library for either method was available at the time of
   writing, and re-implementing them within thesis scope was infeasible. Future
   work item.
2. **MedMNIST 28×28.** Image resolution is far below clinical (224² and up).
   Findings are indicative; conclusions transfer cautiously to full-resolution
   imaging.
3. **Sample-level DP, not user-level.** Each example is treated as an
   independent record. Patient-level privacy (multiple slides per patient)
   would require user-level accounting, not implemented here.
4. **ε = 8 is permissive.** Many production deployments target ε ≤ 1. We report
   the full ε ∈ {1, 4, 8} sweep so the privacy–utility curve is interpretable.
5. **No federated extension.** All training is centralised on Kaggle Tesla T4.
   Federated DP-SGD would require additional system-level components beyond
   thesis scope.
6. **Synthetic confusion matrices in the demo.** The shipped backend generates
   realistic seeded matrices that match the reported overall accuracy. Real
   per-sample test predictions are tabulated in the thesis figures pack but
   not bundled with this prototype.

---

## License

Academic use. © 2026 Abdullah Al Asif.