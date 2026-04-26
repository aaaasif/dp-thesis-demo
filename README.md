# DP Medical — Thesis Demo

> Interactive web demo for the bachelor's thesis **"Privacy-Preserving Medical Data Analysis System using Differential Privacy and Deep Learning."**
>
> Sichuan University · College of Software Engineering · 2026

A single-page application that visualises the empirical results of training a CNN on medical imaging data under varying differential-privacy budgets (ε ∈ {1, 4, 8}, δ = 10⁻⁵). Built as a defence-day artefact: every number on screen is grounded in the canonical results table from the thesis experiments.

---

## Table of Contents

1. [About the Project](#1-about-the-project)
2. [Key Features](#2-key-features)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Installation](#6-installation)
7. [Running the Application](#7-running-the-application)
8. [Pages and Routes](#8-pages-and-routes)
9. [Canonical Results Table](#9-canonical-results-table)
10. [Design System](#10-design-system)
11. [Backend API](#11-backend-api)
12. [Accessibility](#12-accessibility)
13. [Build for Production](#13-build-for-production)
14. [Troubleshooting](#14-troubleshooting)
15. [Author and Acknowledgements](#15-author-and-acknowledgements)
16. [License](#16-license)

---

## 1. About the Project

This website accompanies the empirical study comparing three differential-privacy mechanisms — **DP-SGD** (implemented), **RGP**, and **GEP** (theoretical comparison only †) — for training deep learning models on medical imaging benchmarks (BloodMNIST, PathMNIST). The frontend renders the privacy–utility trade-off using the actual experimental measurements; the backend provides a lightweight mock-prediction endpoint so the live-demo page can be exercised end-to-end without loading a real model.

The demo is **not a deployed clinical tool**. It is a thesis-defence aid that lets the supervisor and committee inspect, on a single screen, the methodology, datasets, results, and architectural decisions that the written thesis reports.

---

## 2. Key Features

- **Privacy–utility curves** rendered from the canonical accuracy table (BloodMNIST and PathMNIST under DP-SGD at ε = 1, 4, 8 plus non-private baselines).
- **Live inference demo** — upload a sample image, the backend returns a mock prediction with the empirically observed confidence band for the selected ε.
- **Confusion matrices** for each (dataset, ε) cell, with row-normalised colour scaling.
- **Architecture diagram** showing the MedCNN → Opacus → RDP accountant pipeline.
- **Methodology page** explaining DP-SGD, gradient clipping, noise addition, and Rényi DP composition.
- **Dataset browser** with class-distribution bars and sample-grid placeholders for BloodMNIST (8 classes) and PathMNIST (9 classes).
- **Defence script page** — a 10-step walkthrough for the oral defence, mapping each demo action to the corresponding thesis chapter.
- **Graceful degradation** — if the FastAPI backend is offline, the frontend transparently falls back to an in-browser mock predictor seeded by the same accuracy table, so the demo never breaks during defence.

---

## 3. Tech Stack

### Frontend

| Layer | Technology | Version |
|---|---|---|
| Build tool | Vite | 5.3.x |
| UI framework | React | 18.3.x |
| Routing | React Router DOM | 6.23.x |
| Styling | Tailwind CSS | 3.4.x |
| Charts | Recharts | 2.12.x |
| Animation | Framer Motion | 11.2.x |

### Backend

| Layer | Technology | Version |
|---|---|---|
| Web framework | FastAPI | latest |
| ASGI server | Uvicorn | latest |
| Language | Python | ≥ 3.9 |

### Deployment Target

- Local development only (`localhost:5173` frontend, `localhost:8000` backend).
- No database, no authentication, no external API calls — everything runs offline.

---

## 4. Project Structure

```
dp-thesis-demo/
├── backend/
│   └── main.py                 # FastAPI app — single-file backend
├── src/
│   ├── components/
│   │   ├── ArchDiagram.jsx     # System architecture SVG diagram
│   │   ├── Card.jsx            # Generic card container
│   │   ├── ConfusionMatrix.jsx # Heatmap renderer for confusion matrices
│   │   ├── Footer.jsx          # Site footer
│   │   ├── Navbar.jsx          # Top navigation bar
│   │   ├── NoiseViz.jsx        # Gaussian-noise visualisation
│   │   └── PageTransition.jsx  # Framer Motion route wrapper
│   ├── data/
│   │   └── results.js          # Single source of truth — all numbers
│   ├── pages/
│   │   ├── About.jsx           # Methodology page
│   │   ├── Datasets.jsx        # Dataset browser
│   │   ├── Demo.jsx            # Live DP-SGD inference demo
│   │   ├── DemoScript.jsx      # 10-step defence walkthrough
│   │   ├── Home.jsx            # Landing page
│   │   ├── Results.jsx         # Results dashboard
│   │   └── Upload.jsx          # Image-upload page
│   ├── App.jsx                 # Route definitions
│   ├── index.css               # Tailwind directives + globals
│   └── main.jsx                # React entry point
├── index.html                  # HTML shell
├── package.json                # npm dependencies and scripts
├── postcss.config.js           # PostCSS plugins
├── tailwind.config.js          # Tailwind theme (brand colours)
├── vite.config.js              # Vite + dev-proxy to backend
└── README.md                   # This file
```

---

## 5. Prerequisites

Before installing, verify the following are on your system:

```bash
node --version      # ≥ 18.0
npm --version       # ≥ 9.0
python --version    # ≥ 3.9
```

If any are missing:

- **Node.js (LTS)** — [https://nodejs.org](https://nodejs.org). npm ships with Node.
- **Python 3.9+** — [https://python.org](https://python.org). On Windows, tick *Add Python to PATH* during install.

---

## 6. Installation

### 6.1 Clone or place the project folder

Place the `dp-thesis-demo/` folder anywhere on disk and `cd` into it:

```bash
cd path/to/dp-thesis-demo
```

### 6.2 Install frontend dependencies

From the project root:

```bash
npm install
```

This creates `node_modules/` (~250 MB) and `package-lock.json`. Warnings are acceptable; errors are not. Expected runtime: 1–2 minutes.

### 6.3 Install backend dependencies

```bash
cd backend
pip install fastapi uvicorn
cd ..
```

If `pip` is not on PATH, use `python -m pip` (Windows) or `python3 -m pip` (macOS/Linux).

#### Recommended — use a virtual environment

**Windows (PowerShell or CMD):**

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn
cd ..
```

**macOS / Linux:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn
cd ..
```

---

## 7. Running the Application

The app needs **two terminals** open simultaneously, both inside the project root.

### Terminal 1 — Backend

```bash
cd backend
python main.py
```

Expected output:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Terminal 2 — Frontend

```bash
npm run dev
```

Expected output:

```
VITE ready in ~500 ms
➜ Local:   http://localhost:5173/
```

Open **http://localhost:5173** in any modern browser.

> **Backend optional.** If you skip the backend, the frontend still runs end-to-end. The Demo page detects a missing `/api/predict` endpoint and falls back to an in-browser mock predictor that uses the same canonical numbers. This is intentional — it guarantees the defence demo cannot fail because of a Python error.

---

## 8. Pages and Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Project summary, headline numbers, links to all other pages |
| `/datasets` | Datasets | BloodMNIST and PathMNIST overviews, sample grids, class distributions |
| `/demo` | DP-SGD Live Demo | Interactive ε selector, live prediction, confidence bar |
| `/upload` | Upload | Image upload form for custom inference (uses backend or mock) |
| `/results` | Results Dashboard | Privacy-utility curves, confusion matrices, clipping-norm sensitivity |
| `/about` | About / Methodology | DP-SGD explanation, RDP accountant, MedCNN architecture |
| `/demo-script` | Demo Script | 10-step defence walkthrough mapped to thesis chapters |

---

## 9. Canonical Results Table

All numbers below are mirrored in `src/data/results.js` and `backend/main.py`. Editing one without the other will cause the frontend and backend to disagree.

### Test accuracy under DP-SGD

| Dataset    | Baseline (no DP) | ε = 1   | ε = 4   | ε = 8   |
|------------|------------------|---------|---------|---------|
| BloodMNIST | 93.60 %          | 68.58 % | 76.88 % | 79.66 % |
| PathMNIST  | 88.62 %          | 82.66 % | 83.57 % | 83.98 % |

- δ = 10⁻⁵ across all experiments.
- RDP accountant (Mironov, 2017) used throughout.
- Larger dataset → smaller utility drop. PathMNIST (~90 K) loses ~5 pp at ε = 1; BloodMNIST (~12 K) loses ~25 pp at ε = 1. This is the headline finding.

### Clipping-norm sensitivity (BloodMNIST, ε = 4)

| C    | Test accuracy |
|------|---------------|
| 0.5  | 75.71 %       |
| 1.0  | 76.91 %       |
| 1.5  | 77.20 %       |
| 2.0  | 78.31 %       |

Optimal clipping norm: **C ∈ [1.0, 2.0]** (a flat plateau, not a sharp peak).

### Methods

- **DP-SGD** — implemented empirically with Opacus 1.4.0.
- **RGP** (Reparameterized Gradient Perturbation) — theoretical comparison only †.
- **GEP** (Gradient Embedding Perturbation) — theoretical comparison only †.

The † symbol appears next to RGP and GEP everywhere in the UI, exactly as it does in the thesis.

---

## 10. Design System

### Brand palette

| Role | Token | Hex |
|---|---|---|
| Primary | navy | `#0B1E3F` |
| Secondary | teal | `#1FB6A8` |
| Background | mist | `#F5F7FA` |
| Accent | amber | `#F5A623` |
| Error | rose | `#E94B4B` |

### Typography

- Headings: Inter, semi-bold.
- Body: Inter, regular, 16 px base.
- Code: JetBrains Mono.

### Motion

Framer Motion handles all page transitions (200 ms ease-out fade-in). Charts animate on mount; subsequent updates are instant.

---

## 11. Backend API

### `GET /api/health`

Health check.

```json
{ "status": "ok", "version": "1.0.0" }
```

### `POST /api/predict`

**Request body**

```json
{
  "dataset": "BloodMNIST",
  "epsilon": 8.0,
  "image_b64": "<base64-encoded PNG>"
}
```

**Response**

```json
{
  "predicted_class": "neutrophil",
  "confidence_pct": 87.4,
  "privacy_budget": { "epsilon": 8.0, "delta": 1e-5 },
  "method": "DP-SGD",
  "model_accuracy_pct": 79.66
}
```

The backend does **not** load a real PyTorch model. Predictions are sampled from a class-conditional distribution parameterised by the canonical accuracy at the requested ε. This is intentional — the website demonstrates the *system behaviour* described in the thesis, not the trained weights themselves.

---

## 12. Accessibility

- Semantic landmarks (`<header>`, `<main>`, `<footer>`, `<nav>`) on every page.
- Skip-to-content link present for keyboard users.
- All Recharts visualisations carry `aria-label` and `role="figure"`.
- Focus rings (`:focus-visible`) visible on all interactive controls.
- Colour contrast meets **WCAG 2.1 AA** for body text (4.5:1) and large text (3:1).
- No motion is applied for users with `prefers-reduced-motion: reduce`.

---

## 13. Build for Production

To produce a static bundle (e.g. for hosting on Netlify, Vercel, or GitHub Pages):

```bash
npm run build
```

Output is placed in `dist/`. Preview locally:

```bash
npm run preview
```

> If you deploy to a static host without the FastAPI backend, the frontend will use the in-browser mock predictor automatically. Nothing else needs to change.

---

## 14. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm install` fails on macOS/Linux with EACCES | npm cache permissions | `sudo chown -R $(whoami) ~/.npm` then re-run |
| `pip install` says fastapi already installed but import fails | Wrong Python interpreter active | Use a virtual environment (see §6.3) |
| Demo page shows "backend offline" banner | FastAPI not running | Start Terminal 1 (§7), or ignore — the mock predictor still works |
| Tailwind classes not applying | PostCSS config not picked up | Verify `postcss.config.js` is at the project root, restart `npm run dev` |
| Port 5173 already in use | Another Vite app running | `npm run dev -- --port 5174` |
| Port 8000 already in use | Another FastAPI app running | Edit `backend/main.py`, change `port=8000` to `port=8001`, and update `vite.config.js` proxy target |
| Charts blank, console error mentioning `recharts` | React 18 strict mode + Recharts | Already handled in `App.jsx`; if it persists, `rm -rf node_modules && npm install` |

---

## 15. Author and Acknowledgements

**Author**

Abdullah Al Asif
Student ID: 2022521460130
College of Software Engineering, Sichuan University

**Supervisor**

Professor Hu Dasha — supervision and methodological guidance.

**Funding context**

This work was conducted under the umbrella of a National Natural Science Foundation of China (NSFC) project on privacy-preserving machine learning.

**Tools and libraries**

The empirical experiments rely on PyTorch, Opacus, and the MedMNIST v2 benchmark. The website is built on the React, Vite, Tailwind, Recharts, and Framer Motion ecosystems. Sincere thanks to the maintainers of all these open-source projects.

---

## 16. License

This repository is released for academic and demonstration use only. Code and content are © 2026 Abdullah Al Asif. The MedMNIST v2 datasets retain their original licenses (CC BY 4.0); see [https://medmnist.com](https://medmnist.com) for terms.

---

*Last updated: April 2026.*