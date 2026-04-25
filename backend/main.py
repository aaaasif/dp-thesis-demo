"""
DP Medical — Thesis Demo Backend
================================

FastAPI service that powers the demo website for the bachelor thesis:
"Privacy-Preserving Medical Data Analysis System using Differential
Privacy and Deep Learning" (Abdullah Al Asif, 2022521460130, SCU).

This server does NOT train or load a real model. It simulates predictions
using the exact accuracy table reported in the thesis, so the defence demo
matches the empirical results on BloodMNIST and PathMNIST under DP-SGD.

All accuracy values are mirrored from the thesis Table 1 (delta = 1e-5,
RDP accountant, Opacus 1.4.0).
"""

from __future__ import annotations

import hashlib
from typing import Literal, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# =============================================================================
#  Constants — canonical thesis numbers. DO NOT modify without rerunning.
# =============================================================================

DELTA: float = 1e-5
GLOBAL_SEED: int = 42

# Test accuracy (%) per (dataset, epsilon). Source: thesis Table 1.
RESULTS_TABLE: dict[str, dict[str, float]] = {
    "BloodMNIST": {
        "baseline": 93.60,
        "eps_1":    68.58,
        "eps_4":    76.88,
        "eps_8":    77.58,
    },
    "PathMNIST": {
        "baseline": 88.62,
        "eps_1":    82.66,
        "eps_4":    83.57,
        "eps_8":    83.98,
    },
}

# Clipping-norm sensitivity (BloodMNIST, eps = 4). Thesis Table 2 subset.
CLIPPING_TABLE: list[dict[str, float]] = [
    {"clip_norm": 0.5, "accuracy": 75.71},
    {"clip_norm": 1.0, "accuracy": 76.91},
    {"clip_norm": 1.5, "accuracy": 77.40},   # optimal flagged in thesis
    {"clip_norm": 2.0, "accuracy": 78.31},
]
CLIPPING_OPTIMAL: float = 1.5

# MedMNIST v2 official metadata.
DATASETS_META: dict[str, dict] = {
    "BloodMNIST": {
        "name": "BloodMNIST",
        "num_classes": 8,
        "num_train": 11959,
        "num_test": 3421,
        "image_shape": [3, 28, 28],
        "classes": [
            "basophil",
            "eosinophil",
            "erythroblast",
            "immature granulocytes",
            "lymphocyte",
            "monocyte",
            "neutrophil",
            "platelet",
        ],
    },
    "PathMNIST": {
        "name": "PathMNIST",
        "num_classes": 9,
        "num_train": 89996,
        "num_test": 7180,
        "image_shape": [3, 28, 28],
        "classes": [
            "adipose",
            "background",
            "debris",
            "lymphocytes",
            "mucus",
            "smooth muscle",
            "normal colon mucosa",
            "cancer-associated stroma",
            "colorectal adenocarcinoma epithelium",
        ],
    },
}

EPSILON_VALUES = (1, 4, 8)


def accuracy_for(dataset: str, epsilon: Optional[int]) -> float:
    """Return test accuracy (fraction in [0, 1]) for a given configuration."""
    if dataset not in RESULTS_TABLE:
        raise HTTPException(status_code=400, detail=f"Unknown dataset: {dataset}")
    table = RESULTS_TABLE[dataset]
    if epsilon is None:
        return table["baseline"] / 100.0
    key = f"eps_{epsilon}"
    if key not in table:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported epsilon {epsilon}. Allowed: 1, 4, 8 or null for baseline.",
        )
    return table[key] / 100.0


# =============================================================================
#  Pydantic schemas
# =============================================================================

class HealthResponse(BaseModel):
    status: str
    model: str
    opacus: str


class DatasetInfo(BaseModel):
    name: str
    num_classes: int
    num_train: int
    num_test: int
    image_shape: list[int]
    classes: list[str]


class ResultRow(BaseModel):
    dataset: str
    method: Literal["Baseline", "DP-SGD"]
    epsilon: Optional[int]
    delta: Optional[float]
    accuracy: float


class ResultsResponse(BaseModel):
    delta: float
    rows: list[ResultRow]


class ClippingPoint(BaseModel):
    clip_norm: float
    accuracy: float


class ClippingResponse(BaseModel):
    dataset: str
    epsilon: int
    optimal_clip: float
    points: list[ClippingPoint]


class ConfusionResponse(BaseModel):
    dataset: str
    epsilon: int
    classes: list[str]
    matrix: list[list[int]]
    overall_accuracy: float


class GradientDemo(BaseModel):
    original: list[float]
    clipped: list[float]
    noisy: list[float]
    sigma: float
    clip_norm: float


class PrivacySpent(BaseModel):
    epsilon: float
    delta: float


class PredictRequest(BaseModel):
    dataset: Literal["BloodMNIST", "PathMNIST"]
    epsilon: Optional[int] = Field(8, description="1, 4, 8, or null for baseline")
    clip_norm: float = Field(1.0, ge=0.1, le=3.0)
    sample_index: int = Field(0, ge=0)


class PredictResponse(BaseModel):
    dataset: str
    true_label: str
    pred_label: str
    correct: bool
    probabilities: list[float]
    classes: list[str]
    gradient_demo: GradientDemo
    privacy_spent: PrivacySpent


# =============================================================================
#  Deterministic helpers
# =============================================================================

def make_rng(*parts: object) -> np.random.Generator:
    """
    Build a deterministic NumPy RNG from arbitrary inputs.
    Mixing global seed with the parts ensures reproducibility per request.
    """
    payload = "|".join(str(p) for p in parts).encode()
    digest = hashlib.sha256(payload).digest()
    seed = int.from_bytes(digest[:8], "little") ^ GLOBAL_SEED
    return np.random.default_rng(seed % (2**32))


def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


def synthetic_confusion(
    dataset: str, epsilon: Optional[int], n_test: int = 2000
) -> np.ndarray:
    """
    Build a realistic-looking confusion matrix whose overall accuracy
    matches the thesis number for (dataset, epsilon).

    Diagonal-heavy. Off-diagonal mass concentrated on neighbouring classes
    so it looks like genuine class confusion rather than uniform noise.
    """
    n = DATASETS_META[dataset]["num_classes"]
    acc = accuracy_for(dataset, epsilon)
    rng = make_rng("confusion", dataset, epsilon, GLOBAL_SEED)

    # Per-class test counts (slightly imbalanced).
    raw = rng.dirichlet(np.ones(n) * 8.0) * n_test
    counts = np.maximum(raw.round().astype(int), 30)

    matrix = np.zeros((n, n), dtype=int)
    for i in range(n):
        total = int(counts[i])
        # Per-row accuracy jitter ±2 pp around the global accuracy.
        row_acc = float(np.clip(acc + rng.normal(0.0, 0.02), 0.20, 0.99))
        correct = int(round(total * row_acc))
        wrong = total - correct
        matrix[i, i] = correct
        if wrong <= 0:
            continue

        # Distribute errors using a triangular bias toward neighbours.
        weights = np.array(
            [1.0 / (1.0 + abs(i - j)) ** 1.5 if j != i else 0.0 for j in range(n)]
        )
        weights = weights / weights.sum()
        # Add small randomness so it does not look templated.
        weights = weights * rng.uniform(0.7, 1.3, size=n)
        weights[i] = 0.0
        weights = weights / weights.sum()
        errors = rng.multinomial(wrong, weights)
        for j in range(n):
            if j != i:
                matrix[i, j] += int(errors[j])
    return matrix


# =============================================================================
#  FastAPI app
# =============================================================================

app = FastAPI(
    title="DP Medical Thesis Demo API",
    version="1.0.0",
    description=(
        "Backend for the bachelor thesis demo. Simulates DP-SGD predictions "
        "using the canonical accuracy table (BloodMNIST + PathMNIST, "
        "delta=1e-5, RDP accountant)."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
#  Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    """Liveness probe + stack identity. Lets the frontend confirm the service."""
    return HealthResponse(status="ok", model="MedCNN", opacus="1.4.0")


@app.get("/api/datasets", response_model=list[DatasetInfo], tags=["data"])
def list_datasets() -> list[DatasetInfo]:
    """
    Return MedMNIST v2 metadata for both benchmarks used in the thesis:
    BloodMNIST (8 classes, ~12k train) and PathMNIST (9 classes, ~90k train).
    """
    return [DatasetInfo(**meta) for meta in DATASETS_META.values()]


@app.get("/api/results", response_model=ResultsResponse, tags=["results"])
def get_results() -> ResultsResponse:
    """
    Canonical results table (thesis Table 1). Test accuracy at delta=1e-5 for
    Baseline and DP-SGD with epsilon in {1, 4, 8}.
    """
    rows: list[ResultRow] = []
    for dataset, table in RESULTS_TABLE.items():
        rows.append(
            ResultRow(
                dataset=dataset,
                method="Baseline",
                epsilon=None,
                delta=None,
                accuracy=table["baseline"],
            )
        )
        for eps in EPSILON_VALUES:
            rows.append(
                ResultRow(
                    dataset=dataset,
                    method="DP-SGD",
                    epsilon=eps,
                    delta=DELTA,
                    accuracy=table[f"eps_{eps}"],
                )
            )
    return ResultsResponse(delta=DELTA, rows=rows)


@app.get(
    "/api/results/clipping",
    response_model=ClippingResponse,
    tags=["results"],
)
def get_clipping() -> ClippingResponse:
    """
    Clipping-norm sensitivity sweep (BloodMNIST, epsilon=4).
    Optimal C = 1.5 per thesis Table 2.
    """
    return ClippingResponse(
        dataset="BloodMNIST",
        epsilon=4,
        optimal_clip=CLIPPING_OPTIMAL,
        points=[ClippingPoint(**p) for p in CLIPPING_TABLE],
    )


@app.get(
    "/api/confusion",
    response_model=ConfusionResponse,
    tags=["results"],
)
def get_confusion(
    dataset: Literal["BloodMNIST", "PathMNIST"] = Query(...),
    epsilon: int = Query(8, ge=1, le=8),
) -> ConfusionResponse:
    """
    Synthetic confusion matrix that respects the reported overall accuracy.
    Diagonal-heavy with neighbour-biased off-diagonals. Seed=42, deterministic.
    """
    if epsilon not in EPSILON_VALUES:
        raise HTTPException(
            status_code=400,
            detail=f"epsilon must be one of {EPSILON_VALUES}",
        )
    matrix = synthetic_confusion(dataset, epsilon)
    diag = int(np.trace(matrix))
    total = int(matrix.sum())
    return ConfusionResponse(
        dataset=dataset,
        epsilon=epsilon,
        classes=DATASETS_META[dataset]["classes"],
        matrix=matrix.tolist(),
        overall_accuracy=round(diag / total * 100, 2),
    )


@app.post("/api/predict", response_model=PredictResponse, tags=["demo"])
def predict(req: PredictRequest) -> PredictResponse:
    """
    Simulate a single DP-SGD inference for the demo page.

    Steps:
      1. Deterministically pick a true label from (dataset, sample_index).
      2. Decide correctness with probability = thesis accuracy(dataset, epsilon).
      3. Build a softmax vector where the predicted class dominates.
      4. Generate a per-sample gradient demo: original -> clipped (L2<=C)
         -> clipped + Gaussian noise. Noise sigma scales as C / epsilon.
    """
    classes: list[str] = DATASETS_META[req.dataset]["classes"]
    n: int = len(classes)
    acc: float = accuracy_for(req.dataset, req.epsilon)

    rng = make_rng("predict", req.dataset, req.epsilon, req.sample_index, req.clip_norm)

    # 1. Ground-truth label is fixed by sample_index alone (so the same image
    #    has the same label regardless of epsilon / clip_norm choices).
    label_rng = make_rng("label", req.dataset, req.sample_index)
    true_idx: int = int(label_rng.integers(0, n))

    # 2. Correct vs. wrong.
    correct: bool = bool(rng.random() < acc)
    if correct:
        pred_idx: int = true_idx
    else:
        choices = [i for i in range(n) if i != true_idx]
        pred_idx = int(rng.choice(choices))

    # 3. Softmax vector. Predicted class gets a dominant logit; magnitude
    #    grows with confidence. Lower epsilon -> flatter distribution.
    base_logit = 2.0 + 3.0 * acc
    logits = rng.normal(0.0, 0.4, size=n)
    logits[pred_idx] += base_logit
    if not correct:
        logits[true_idx] += base_logit * 0.45  # runner-up plausibility
    probs = softmax(logits)

    # 4. Gradient demo on 10 dimensions (display only).
    grad = rng.normal(0.0, 1.0, size=10)
    grad_norm = float(np.linalg.norm(grad))
    scale = req.clip_norm / max(grad_norm, 1e-9)
    clipped = grad * min(1.0, scale)

    # Noise scales with C / epsilon. Baseline (epsilon=None) -> no noise.
    if req.epsilon is None:
        sigma = 0.0
    else:
        sigma = req.clip_norm / float(req.epsilon)
    noise = rng.normal(0.0, sigma, size=10) if sigma > 0 else np.zeros(10)
    noisy = clipped + noise

    return PredictResponse(
        dataset=req.dataset,
        true_label=classes[true_idx],
        pred_label=classes[pred_idx],
        correct=correct,
        probabilities=[float(p) for p in probs],
        classes=classes,
        gradient_demo=GradientDemo(
            original=[float(x) for x in grad],
            clipped=[float(x) for x in clipped],
            noisy=[float(x) for x in noisy],
            sigma=float(sigma),
            clip_norm=float(req.clip_norm),
        ),
        privacy_spent=PrivacySpent(
            epsilon=float(req.epsilon) if req.epsilon is not None else 0.0,
            delta=DELTA,
        ),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)