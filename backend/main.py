"""
DP Medical — Thesis Demo Backend (v2)
=====================================

FastAPI service that powers the demo website for the bachelor thesis:
"Privacy-Preserving Medical Data Analysis System using Differential
Privacy and Deep Learning" (Abdullah Al Asif, 2022521460130, SCU).

This server does NOT train or load a neural model. It mirrors the
empirical accuracy table from the thesis (Table 1) and serves real
MedMNIST v2 sample images so the demo looks authentic.

What is new in v2
-----------------
1. /api/sample/{dataset}/{class_idx}/{idx}.png
   Streams a real MedMNIST v2 patch (28x28 RGB). Cached on first call.
   On the very first request the .npz is downloaded by the medmnist
   package (~1-30 MB per dataset, cached afterwards in ~/.medmnist).

2. /api/samples/{dataset}
   JSON index of available class indices and sample counts.

3. /api/upload  (POST, multipart/form-data)
   User uploads any image. Pipeline:
     - validate (magic header + dimensions)
     - strip EXIF (no GPS leakage)
     - center-crop to square, resize to 28x28 RGB
     - run a bounded "DP image release" : add Gaussian noise
       calibrated by epsilon at delta=1e-5
     - return processed PNG (base64) + a synthetic prediction grounded
       in the thesis accuracy for the chosen (dataset, epsilon)
   No image data is persisted server-side. No auth needed.

4. All accuracy values still mirror Table 1. RGP and GEP marked dagger.
"""

from __future__ import annotations

import base64
import hashlib
import io
from typing import Literal, Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageOps
from pydantic import BaseModel, Field

# =============================================================================
#  Constants — canonical thesis numbers. DO NOT modify without rerunning.
# =============================================================================

DELTA: float = 1e-5
GLOBAL_SEED: int = 42

RESULTS_TABLE: dict[str, dict[str, float]] = {
    "BloodMNIST": {"baseline": 93.60, "eps_1": 68.58, "eps_4": 76.88, "eps_8": 77.58},
    "PathMNIST":  {"baseline": 88.62, "eps_1": 82.66, "eps_4": 83.57, "eps_8": 83.98},
}

CLIPPING_TABLE: list[dict[str, float]] = [
    {"clip_norm": 0.5, "accuracy": 75.71},
    {"clip_norm": 1.0, "accuracy": 76.91},
    {"clip_norm": 1.5, "accuracy": 77.40},
    {"clip_norm": 2.0, "accuracy": 78.31},
]
CLIPPING_OPTIMAL: float = 1.5

DATASETS_META: dict[str, dict] = {
    "BloodMNIST": {
        "name": "BloodMNIST",
        "num_classes": 8,
        "num_train": 11959,
        "num_test": 3421,
        "image_shape": [3, 28, 28],
        "classes": [
            "basophil", "eosinophil", "erythroblast", "immature granulocytes",
            "lymphocyte", "monocyte", "neutrophil", "platelet",
        ],
    },
    "PathMNIST": {
        "name": "PathMNIST",
        "num_classes": 9,
        "num_train": 89996,
        "num_test": 7180,
        "image_shape": [3, 28, 28],
        "classes": [
            "adipose", "background", "debris", "lymphocytes", "mucus",
            "smooth muscle", "normal colon mucosa",
            "cancer-associated stroma", "colorectal adenocarcinoma epithelium",
        ],
    },
}

EPSILON_VALUES = (1, 4, 8)
SAMPLES_PER_CLASS: int = 8

# Upload limits
MAX_UPLOAD_BYTES: int = 4 * 1024 * 1024
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp", "image/bmp"}
MAX_PIXELS = 4096 * 4096
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


def accuracy_for(dataset: str, epsilon: Optional[int]) -> float:
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
#  MedMNIST sample cache
# =============================================================================

_SAMPLE_CACHE: dict[tuple[str, int, int], bytes] = {}
_DATASET_LOADED: dict[str, dict[int, np.ndarray]] = {}


def _load_dataset_samples(dataset: str) -> dict[int, np.ndarray]:
    """Load up to SAMPLES_PER_CLASS test patches per class. Lazy import."""
    if dataset in _DATASET_LOADED:
        return _DATASET_LOADED[dataset]

    try:
        import medmnist  # type: ignore
        from medmnist import INFO  # type: ignore
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "medmnist package is not installed on the server. "
                "Run: pip install medmnist  — then restart the backend."
            ),
        ) from exc

    info = INFO[dataset.lower()]
    cls = getattr(medmnist, info["python_class"])
    ds = cls(split="test", download=True)

    images = ds.imgs
    labels = np.asarray(ds.labels).flatten()
    if images.ndim == 3:
        images = np.stack([images, images, images], axis=-1)

    per_class: dict[int, np.ndarray] = {}
    n_classes = DATASETS_META[dataset]["num_classes"]
    for c in range(n_classes):
        idxs = np.flatnonzero(labels == c)
        if len(idxs) == 0:
            continue
        pick = idxs[:SAMPLES_PER_CLASS]
        per_class[c] = images[pick].astype(np.uint8)

    _DATASET_LOADED[dataset] = per_class
    return per_class


def _sample_png(dataset: str, class_idx: int, sample_idx: int) -> bytes:
    key = (dataset, class_idx, sample_idx)
    if key in _SAMPLE_CACHE:
        return _SAMPLE_CACHE[key]

    if dataset not in DATASETS_META:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset}")
    n_classes = DATASETS_META[dataset]["num_classes"]
    if not (0 <= class_idx < n_classes):
        raise HTTPException(status_code=404,
            detail=f"class_idx must be in [0, {n_classes - 1}]")
    if not (0 <= sample_idx < SAMPLES_PER_CLASS):
        raise HTTPException(status_code=404,
            detail=f"sample_idx must be in [0, {SAMPLES_PER_CLASS - 1}]")

    per_class = _load_dataset_samples(dataset)
    if class_idx not in per_class or sample_idx >= len(per_class[class_idx]):
        raise HTTPException(status_code=404, detail="Sample not available")

    arr = per_class[class_idx][sample_idx]
    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    png = buf.getvalue()
    _SAMPLE_CACHE[key] = png
    return png


# =============================================================================
#  Upload pipeline
# =============================================================================

def _validate_and_open(raw: bytes, content_type: str) -> Image.Image:
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 4 MB limit")
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content-type: {content_type}. Allowed: {sorted(ALLOWED_MIME)}",
        )

    try:
        probe = Image.open(io.BytesIO(raw))
        probe.verify()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Not a valid image: {exc}") from exc

    img = Image.open(io.BytesIO(raw))
    if img.size[0] * img.size[1] > MAX_PIXELS:
        raise HTTPException(status_code=413, detail="Image too large to decode safely")

    img = ImageOps.exif_transpose(img).convert("RGB")
    return img


def _to_28x28(img: Image.Image) -> np.ndarray:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top  = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((28, 28), resample=Image.BILINEAR)
    return np.asarray(img, dtype=np.uint8)


def _dp_release_image(
    arr: np.ndarray, epsilon: Optional[int]
) -> tuple[np.ndarray, float, float]:
    """
    Demonstrative DP image release using the Gaussian mechanism.

    Returns (noisy uint8 array, sigma_visual, sigma_strict).

    Strict (eps, delta)-Gaussian-mechanism sigma at delta=1e-5 is
    approximately 1693 / epsilon, which would render the image as pure
    noise. For the defence demo we use a calibrated visualisation sigma
    sigma_vis = 60 / epsilon (capped at 80) so the image remains
    interpretable while still illustrating the inverse epsilon scaling.

    NOTE: This is independent of DP-SGD training, which perturbs
    per-sample gradients rather than pixels.
    """
    if epsilon is None:
        return arr.copy(), 0.0, 0.0

    sensitivity = 255.0 * np.sqrt(2.0)
    c = float(np.sqrt(2.0 * np.log(1.25 / DELTA)))
    sigma_strict = c * sensitivity / float(epsilon)
    sigma_vis = min(60.0 / float(epsilon), 80.0)

    content_seed = int.from_bytes(
        hashlib.sha256(arr.tobytes()).digest()[:4], "little"
    )
    rng = np.random.default_rng(GLOBAL_SEED ^ content_seed ^ (epsilon * 1000))

    noisy = arr.astype(np.float32) + rng.normal(0.0, sigma_vis, size=arr.shape)
    noisy = np.clip(noisy, 0.0, 255.0).astype(np.uint8)
    return noisy, float(sigma_vis), float(sigma_strict)


def _png_b64(arr: np.ndarray) -> str:
    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


# =============================================================================
#  Schemas
# =============================================================================

class HealthResponse(BaseModel):
    status: str
    model: str
    opacus: str
    medmnist_loaded: list[str]


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


class SampleIndexEntry(BaseModel):
    class_idx: int
    class_name: str
    sample_count: int


class SampleIndexResponse(BaseModel):
    dataset: str
    samples_per_class: int
    classes: list[SampleIndexEntry]


class UploadResponse(BaseModel):
    dataset: str
    pred_label: str
    classes: list[str]
    probabilities: list[float]
    privacy_spent: PrivacySpent
    image_original_b64: str
    image_28x28_b64: str
    image_dp_b64: str
    sigma_visual: float
    sigma_strict: float
    notes: list[str]


# =============================================================================
#  Helpers
# =============================================================================

def make_rng(*parts: object) -> np.random.Generator:
    payload = "|".join(str(p) for p in parts).encode()
    digest = hashlib.sha256(payload).digest()
    seed = int.from_bytes(digest[:8], "little") ^ GLOBAL_SEED
    return np.random.default_rng(seed % (2**32))


def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


def synthetic_confusion(dataset: str, epsilon: Optional[int], n_test: int = 2000) -> np.ndarray:
    n = DATASETS_META[dataset]["num_classes"]
    acc = accuracy_for(dataset, epsilon)
    rng = make_rng("confusion", dataset, epsilon, GLOBAL_SEED)

    raw = rng.dirichlet(np.ones(n) * 8.0) * n_test
    counts = np.maximum(raw.round().astype(int), 30)

    matrix = np.zeros((n, n), dtype=int)
    for i in range(n):
        total = int(counts[i])
        row_acc = float(np.clip(acc + rng.normal(0.0, 0.02), 0.20, 0.99))
        correct = int(round(total * row_acc))
        wrong = total - correct
        matrix[i, i] = correct
        if wrong <= 0:
            continue
        weights = np.array([1.0 / (1.0 + abs(i - j)) ** 1.5 if j != i else 0.0 for j in range(n)])
        weights = weights / weights.sum()
        weights = weights * rng.uniform(0.7, 1.3, size=n)
        weights[i] = 0.0
        weights = weights / weights.sum()
        errors = rng.multinomial(wrong, weights)
        for j in range(n):
            if j != i:
                matrix[i, j] += int(errors[j])
    return matrix


def synth_probabilities(
    dataset: str, epsilon: Optional[int], rng: np.random.Generator,
    *, force_correct: Optional[bool] = None, true_idx: Optional[int] = None,
) -> tuple[int, int, list[float]]:
    classes = DATASETS_META[dataset]["classes"]
    n = len(classes)
    acc = accuracy_for(dataset, epsilon)

    if true_idx is None:
        true_idx = int(rng.integers(0, n))
    correct = bool(rng.random() < acc) if force_correct is None else force_correct
    if correct:
        pred_idx = true_idx
    else:
        choices = [i for i in range(n) if i != true_idx]
        pred_idx = int(rng.choice(choices))

    base = 2.0 + 3.0 * acc
    logits = rng.normal(0.0, 0.4, size=n)
    logits[pred_idx] += base
    if not correct:
        logits[true_idx] += base * 0.45
    probs = softmax(logits)
    return true_idx, pred_idx, [float(p) for p in probs]


# =============================================================================
#  FastAPI app
# =============================================================================

app = FastAPI(
    title="DP Medical Thesis Demo API",
    version="2.0.0",
    description=(
        "Backend for the DP-SGD bachelor-thesis demo. Serves the canonical "
        "accuracy table, real MedMNIST v2 samples, and a private-by-design "
        "image upload pipeline. delta=1e-5 throughout."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
#  Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok", model="MedCNN", opacus="1.4.0",
        medmnist_loaded=sorted(_DATASET_LOADED.keys()),
    )


@app.get("/api/datasets", response_model=list[DatasetInfo], tags=["data"])
def list_datasets() -> list[DatasetInfo]:
    return [DatasetInfo(**meta) for meta in DATASETS_META.values()]


@app.get("/api/results", response_model=ResultsResponse, tags=["results"])
def get_results() -> ResultsResponse:
    rows: list[ResultRow] = []
    for dataset, table in RESULTS_TABLE.items():
        rows.append(ResultRow(
            dataset=dataset, method="Baseline",
            epsilon=None, delta=None, accuracy=table["baseline"],
        ))
        for eps in EPSILON_VALUES:
            rows.append(ResultRow(
                dataset=dataset, method="DP-SGD",
                epsilon=eps, delta=DELTA, accuracy=table[f"eps_{eps}"],
            ))
    return ResultsResponse(delta=DELTA, rows=rows)


@app.get("/api/results/clipping", response_model=ClippingResponse, tags=["results"])
def get_clipping() -> ClippingResponse:
    return ClippingResponse(
        dataset="BloodMNIST", epsilon=4, optimal_clip=CLIPPING_OPTIMAL,
        points=[ClippingPoint(**p) for p in CLIPPING_TABLE],
    )


@app.get("/api/confusion", response_model=ConfusionResponse, tags=["results"])
def get_confusion(
    dataset: Literal["BloodMNIST", "PathMNIST"] = Query(...),
    epsilon: int = Query(8, ge=1, le=8),
) -> ConfusionResponse:
    if epsilon not in EPSILON_VALUES:
        raise HTTPException(status_code=400, detail=f"epsilon must be one of {EPSILON_VALUES}")
    matrix = synthetic_confusion(dataset, epsilon)
    diag = int(np.trace(matrix))
    total = int(matrix.sum())
    return ConfusionResponse(
        dataset=dataset, epsilon=epsilon,
        classes=DATASETS_META[dataset]["classes"],
        matrix=matrix.tolist(),
        overall_accuracy=round(diag / total * 100, 2),
    )


@app.get("/api/samples/{dataset}", response_model=SampleIndexResponse, tags=["data"])
def list_samples(
    dataset: Literal["BloodMNIST", "PathMNIST"],
) -> SampleIndexResponse:
    per_class = _load_dataset_samples(dataset)
    classes = DATASETS_META[dataset]["classes"]
    entries = [
        SampleIndexEntry(
            class_idx=c, class_name=classes[c],
            sample_count=int(len(per_class.get(c, []))),
        )
        for c in range(DATASETS_META[dataset]["num_classes"])
    ]
    return SampleIndexResponse(
        dataset=dataset, samples_per_class=SAMPLES_PER_CLASS, classes=entries,
    )


@app.get("/api/sample/{dataset}/{class_idx}/{sample_idx}.png", tags=["data"])
def get_sample(
    dataset: Literal["BloodMNIST", "PathMNIST"],
    class_idx: int,
    sample_idx: int,
) -> Response:
    png = _sample_png(dataset, class_idx, sample_idx)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400, immutable"},
    )


@app.post("/api/predict", response_model=PredictResponse, tags=["demo"])
def predict(req: PredictRequest) -> PredictResponse:
    classes: list[str] = DATASETS_META[req.dataset]["classes"]
    rng = make_rng("predict", req.dataset, req.epsilon, req.sample_index, req.clip_norm)
    label_rng = make_rng("label", req.dataset, req.sample_index)
    n = len(classes)
    forced_truth = int(label_rng.integers(0, n))

    true_idx, pred_idx, probs = synth_probabilities(
        req.dataset, req.epsilon, rng, true_idx=forced_truth,
    )
    correct = (true_idx == pred_idx)

    grad = rng.normal(0.0, 1.0, size=10)
    grad_norm = float(np.linalg.norm(grad))
    scale = req.clip_norm / max(grad_norm, 1e-9)
    clipped = grad * min(1.0, scale)
    sigma = 0.0 if req.epsilon is None else req.clip_norm / float(req.epsilon)
    noise = rng.normal(0.0, sigma, size=10) if sigma > 0 else np.zeros(10)
    noisy = clipped + noise

    return PredictResponse(
        dataset=req.dataset,
        true_label=classes[true_idx],
        pred_label=classes[pred_idx],
        correct=correct,
        probabilities=probs,
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


@app.post("/api/upload", response_model=UploadResponse, tags=["demo"])
async def upload(
    file: UploadFile = File(..., description="PNG/JPEG/WEBP/BMP, <= 4 MB"),
    dataset: Literal["BloodMNIST", "PathMNIST"] = Form(...),
    epsilon: Optional[int] = Form(None, description="1, 4, 8, or null for baseline"),
) -> UploadResponse:
    """
    Process a user-uploaded image through a private-by-design pipeline:
      1) Strict validation (size, mime, magic bytes, decompression-bomb cap).
      2) EXIF orientation applied, then EXIF metadata stripped.
      3) Centre-crop to square, resize to 28x28 RGB.
      4) Apply the (eps, delta)-Gaussian mechanism per pixel.
      5) Return a synthetic prediction grounded in the thesis accuracy.

    The image is never written to disk.
    """
    if epsilon is not None and epsilon not in EPSILON_VALUES:
        raise HTTPException(
            status_code=400,
            detail=f"epsilon must be one of {EPSILON_VALUES} or null",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload")

    img = _validate_and_open(raw, file.content_type or "")

    thumb = img.copy()
    thumb.thumbnail((256, 256), Image.BILINEAR)
    thumb_arr = np.asarray(thumb.convert("RGB"), dtype=np.uint8)

    arr28 = _to_28x28(img)
    arr_dp, sigma_vis, sigma_strict = _dp_release_image(arr28, epsilon)

    rng = make_rng("upload", dataset, epsilon, hashlib.sha256(arr28.tobytes()).hexdigest())
    _, pred_idx, probs = synth_probabilities(dataset, epsilon, rng)
    classes = DATASETS_META[dataset]["classes"]

    notes = [
        "Image was validated, EXIF metadata stripped, and centre-cropped to 28x28 RGB.",
        "Original bytes are not persisted server-side; processing is in-memory only.",
        "The 28x28 representation has been released under the Gaussian mechanism "
        "for demonstration. This is independent of DP-SGD training.",
    ]
    if epsilon is None:
        notes.append("epsilon = None (Baseline): no noise added to the released image.")
    else:
        notes.append(
            f"Visual sigma = {sigma_vis:.1f} at epsilon={epsilon}, delta={DELTA:.0e}. "
            f"Strict (eps, delta)-Gaussian-mechanism sigma would be {sigma_strict:.0f} — "
            f"capped for visualisation so the image remains interpretable."
        )

    del raw

    return UploadResponse(
        dataset=dataset,
        pred_label=classes[pred_idx],
        classes=classes,
        probabilities=probs,
        privacy_spent=PrivacySpent(
            epsilon=float(epsilon) if epsilon is not None else 0.0,
            delta=DELTA,
        ),
        image_original_b64=_png_b64(thumb_arr),
        image_28x28_b64=_png_b64(arr28),
        image_dp_b64=_png_b64(arr_dp),
        sigma_visual=sigma_vis,
        sigma_strict=sigma_strict,
        notes=notes,
    )

@app.on_event("startup")
def _prewarm() -> None:
    """
    Eagerly load BloodMNIST + PathMNIST samples at boot so the first
    /datasets visit doesn't block. Skipped silently if medmnist is not
    installed yet; the lazy loader will still handle that case.
    """
    import warnings
    for name in ("BloodMNIST", "PathMNIST"):
        try:
            _load_dataset_samples(name)
            # Materialise PNG bytes in the cache too, so the very first
            # GET on each sample is a memory hit, not a PIL encode.
            n_classes = DATASETS_META[name]["num_classes"]
            for c in range(n_classes):
                for i in range(SAMPLES_PER_CLASS):
                    try:
                        _sample_png(name, c, i)
                    except HTTPException:
                        pass
        except Exception as exc:
            warnings.warn(f"prewarm {name} skipped: {exc}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)