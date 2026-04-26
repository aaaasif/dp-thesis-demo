import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

client.interceptors.response.use(
  res => res,
  err => {
    const detail = err.response?.data?.detail
    const status = err.response?.status
    const msg = detail
      ? `${status ?? ''} ${detail}`.trim()
      : err.code === 'ECONNABORTED'
        ? 'Backend timed out'
        : err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

const BASE = import.meta.env.VITE_API_BASE || ''

export const api = {
  health:    ()         => client.get('/api/health').then(r => r.data),
  datasets:  ()         => client.get('/api/datasets').then(r => r.data),
  results:   ()         => client.get('/api/results').then(r => r.data),
  clipping:  ()         => client.get('/api/results/clipping').then(r => r.data),
  confusion: (dataset, epsilon) =>
    client.get('/api/confusion', { params: { dataset, epsilon } }).then(r => r.data),
  predict:   (body)     => client.post('/api/predict', body).then(r => r.data),
  samplesIndex: (dataset) =>
    client.get(`/api/samples/${dataset}`).then(r => r.data),
  /** Direct URL for an <img src=...> tag — backend serves the PNG. */
  sampleUrl: (dataset, classIdx, sampleIdx) =>
    `${BASE}/api/sample/${dataset}/${classIdx}/${sampleIdx}.png`,
  upload: (file, dataset, epsilon) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dataset', dataset)
    if (epsilon !== null && epsilon !== undefined) fd.append('epsilon', String(epsilon))
    return client.post('/api/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    }).then(r => r.data)
  }
}