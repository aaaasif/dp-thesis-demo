const BASE = import.meta.env.VITE_API_BASE || ''
export const api = {
  health:    ()         => fetch(`${BASE}/api/health`).then(r => r.json()),
  datasets:  ()         => fetch(`${BASE}/api/datasets`).then(r => r.json()),
  results:   ()         => fetch(`${BASE}/api/results`).then(r => r.json()),
  clipping:  ()         => fetch(`${BASE}/api/results/clipping`).then(r => r.json()),
  confusion: (d, e)     => fetch(`${BASE}/api/confusion?dataset=${d}&epsilon=${e}`).then(r => r.json()),
  predict:   (body)     => fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  }).then(r => r.json()),
}