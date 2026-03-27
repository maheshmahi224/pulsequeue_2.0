import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const ROUTE_TIMEOUTS: Record<string, number> = {
  '/auth':    5000,   // login must be instant
  '/doctor/queue': 8000,
  '/doctor/patient': 8000,
  '/doctor/analytics': 8000,
  '/doctor/update-priority': 6000,
  '/doctor/add-note': 6000,
}

function getTimeout(url: string): number {
  const match = Object.keys(ROUTE_TIMEOUTS).find(k => url.includes(k))
  return match ? ROUTE_TIMEOUTS[match] : 8000
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.url) config.timeout = getTimeout(config.url)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pq_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
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
        ? 'Server is taking too long. Please try again.'
        : (data?.message || error.message || 'Network error'),
      code: isTimeout ? 'TIMEOUT' : (data?.error_code || 'NETWORK_ERROR'),
    }
    return Promise.reject(normalized)
  }
)

export default apiClient
