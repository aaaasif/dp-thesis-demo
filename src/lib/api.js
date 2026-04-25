import axios from 'axios'

// Empty baseURL = use Vite proxy in dev. Override via VITE_API_BASE in prod.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 8000,
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

export const api = {
  health:    ()         => client.get('/api/health').then(r => r.data),
  datasets:  ()         => client.get('/api/datasets').then(r => r.data),
  results:   ()         => client.get('/api/results').then(r => r.data),
  clipping:  ()         => client.get('/api/results/clipping').then(r => r.data),
  confusion: (dataset, epsilon) =>
    client.get('/api/confusion', { params: { dataset, epsilon } }).then(r => r.data),
  predict:   (body)     => client.post('/api/predict', body).then(r => r.data)
}