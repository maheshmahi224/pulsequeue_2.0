import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Per-route timeout map — fast for auth, generous only for AI/PDF
const ROUTE_TIMEOUTS: Record<string, number> = {
  '/auth':          5000,   // login/register must be instant
  '/patients/report': 20000, // AI triage
  '/patients/upload-pdf': 45000, // PDF extract + AI
  '/patients/queue-status': 5000,
}

function getTimeout(url: string): number {
  const match = Object.keys(ROUTE_TIMEOUTS).find(k => url.includes(k))
  return match ? ROUTE_TIMEOUTS[match] : 8000  // default 8s
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  withCredentials: false,
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Set smart per-route timeout
  if (config.url) config.timeout = getTimeout(config.url)

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pq_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  // Only set JSON default if not already set (allows multipart/form-data)
  if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const data = error.response?.data as any
    const isTimeout = error.code === 'ECONNABORTED'
    const normalized = {
      success: false,
      message: isTimeout
        ? 'Request timed out — server is taking too long. Please try again.'
        : (data?.message || error.message || 'Network error'),
      code: isTimeout ? 'TIMEOUT' : (data?.error_code || 'NETWORK_ERROR'),
    }
    return Promise.reject(normalized)
  }
)

export default apiClient
