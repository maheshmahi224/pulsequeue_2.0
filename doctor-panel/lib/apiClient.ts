import axios, { AxiosInstance, AxiosError } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

apiClient.interceptors.request.use((config) => {
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
    const normalized = {
      success: false,
      message: data?.message || error.message || 'Network error',
      code: data?.error_code || 'NETWORK_ERROR',
    }
    return Promise.reject(normalized)
  }
)

export default apiClient
