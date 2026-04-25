// =============================================================================
//  Canonical thesis results — DO NOT modify without re-running experiments.
//  Source: all_results.csv + thesis Table 1 + thesis Table 2.
//  All values explicitly confirmed by the author (Abdullah Al Asif).
// =============================================================================

export const META = {
  author: 'Abdullah Al Asif',
  studentId: '2022521460130',
  supervisor: 'Prof. Hu Dasha',
  college: 'College of Software Engineering',
  university: 'Sichuan University',
  thesisTitle:
    'Privacy-Preserving Medical Data Analysis System using Differential Privacy and Deep Learning',
  academicYear: '2025–2026'
}

export const MODEL = {
  name: 'MedCNN',
  params: 814056,
  norm: 'GroupNorm (8 groups)',
  optimizer: 'DP-SGD',
  framework: 'Opacus 1.4.0',
  accountant: 'RDP',
  delta: 1e-5
}

// -----------------------------------------------------------------------------
//  Datasets (MedMNIST v2). Split sizes are from the MedMNIST v2 paper.
//  classCounts are ILLUSTRATIVE (ordered plausible counts summing near trainSize).
//  Replace with exact per-class counts from the MedMNIST v2 README before
//  final defence packaging.
// -----------------------------------------------------------------------------
export const DATASETS = {
  BloodMNIST: {
    key: 'BloodMNIST',
    name: 'BloodMNIST',
    trainSize: 11959,
    valSize: 1712,
    testSize: 3421,
    numClasses: 8,
    imageSize: '28 × 28 × 3',
    classNames: [
      'Basophil',
      'Eosinophil',
      'Erythroblast',
      'Immature granulocyte',
      'Lymphocyte',
      'Monocyte',
      'Neutrophil',
      'Platelet'
    ],
    classCounts: [852, 2181, 1085, 2026, 849, 993, 2330, 1643] // illustrative
  },
  PathMNIST: {
    key: 'PathMNIST',
    name: 'PathMNIST',
    trainSize: 89996,
    valSize: 10004,
    testSize: 7180,
    numClasses: 9,
    imageSize: '28 × 28 × 3',
    classNames: [
      'Adipose',
      'Background',
      'Debris',
      'Lymphocytes',
      'Mucus',
      'Smooth muscle',
      'Normal colon mucosa',
      'Cancer stroma',
      'Colorectal adenocarcinoma'
    ],
    classCounts: [9366, 9509, 10360, 10401, 8006, 11758, 8760, 10446, 11390] // illustrative
  }
}

// -----------------------------------------------------------------------------
//  Accuracy table — DP-SGD empirical. Canonical.
// -----------------------------------------------------------------------------
export const RESULTS = {
  BloodMNIST: {
    Baseline:      { eps: null, acc: 93.60 },
    'DP-SGD ε=1':  { eps: 1,    acc: 68.58 },
    'DP-SGD ε=4':  { eps: 4,    acc: 76.88 },
    'DP-SGD ε=8':  { eps: 8,    acc: 77.58 }
  },
  PathMNIST: {
    Baseline:      { eps: null, acc: 88.62 },
    'DP-SGD ε=1':  { eps: 1,    acc: 82.66 },
    'DP-SGD ε=4':  { eps: 4,    acc: 83.57 },
    'DP-SGD ε=8':  { eps: 8,    acc: 83.98 }
  }
}

export const PRIVACY_SETTINGS = [
  { key: 'Baseline',     eps: null, label: 'Baseline (no DP)' },
  { key: 'DP-SGD ε=8',   eps: 8,    label: 'DP-SGD · ε = 8' },
  { key: 'DP-SGD ε=4',   eps: 4,    label: 'DP-SGD · ε = 4' },
  { key: 'DP-SGD ε=1',   eps: 1,    label: 'DP-SGD · ε = 1' }
]

// -----------------------------------------------------------------------------
//  Clipping-norm sensitivity (BloodMNIST, ε = 4). Thesis Table 2 subset.
//  C = 1.5 flagged as optimal in the thesis; exact value intentionally
//  omitted from the public results here.
// -----------------------------------------------------------------------------
export const CLIPPING_SENSITIVITY = [
  { C: 0.5, acc: 75.71 },
  { C: 1.0, acc: 76.91 },
  { C: 2.0, acc: 78.31 }
]
export const CLIPPING_OPTIMAL_BAND = { from: 1.0, to: 2.0 }

// -----------------------------------------------------------------------------
//  Method comparison. RGP and GEP are theoretical comparisons only (†).
// -----------------------------------------------------------------------------
export const METHODS = [
  {
    name: 'DP-SGD',
    type: 'Empirical (Opacus 1.4.0)',
    perSampleGrad: 'Yes',
    mechanism: 'Per-sample L₂ clip + Gaussian noise',
    cost: 'High per-sample memory',
    status: 'Measured on BloodMNIST + PathMNIST'
  },
  {
    name: 'RGP†',
    type: 'Theoretical comparison only',
    perSampleGrad: 'Low-rank reparameterization',
    mechanism: 'Noise on reparameterized low-rank gradients',
    cost: 'Lower memory, extra factorization',
    status: '† Not re-implemented (no production library)'
  },
  {
    name: 'GEP†',
    type: 'Theoretical comparison only',
    perSampleGrad: 'Anchor subspace + residual',
    mechanism: 'Project gradients onto public anchor subspace',
    cost: 'Moderate, needs public anchors',
    status: '† Not re-implemented (no production library)'
  }
]

// -----------------------------------------------------------------------------
//  Confusion matrices — ILLUSTRATIVE.
//  Diagonal-weighted matrices derived from measured overall accuracy so the
//  demo heatmap renders immediately. Replace with real per-sample predictions
//  from the test set before submission.
// -----------------------------------------------------------------------------
function diag(n, accuracy) {
  const on = accuracy
  const off = (1 - accuracy) / (n - 1)
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? on : off))
  )
}

export const CONFUSION = {
  'BloodMNIST|Baseline':     diag(8, 0.9360),
  'BloodMNIST|DP-SGD ε=8':   diag(8, 0.7758),
  'BloodMNIST|DP-SGD ε=4':   diag(8, 0.7688),
  'BloodMNIST|DP-SGD ε=1':   diag(8, 0.6858),
  'PathMNIST|Baseline':      diag(9, 0.8862),
  'PathMNIST|DP-SGD ε=8':    diag(9, 0.8398),
  'PathMNIST|DP-SGD ε=4':    diag(9, 0.8357),
  'PathMNIST|DP-SGD ε=1':    diag(9, 0.8266)
}
export const CONFUSION_NOTE =
  'Illustrative diagonal-weighted matrices. Replace with real per-sample predictions before submission.'