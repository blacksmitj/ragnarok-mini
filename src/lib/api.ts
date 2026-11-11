export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {})
  headers.set('x-admin-token', 'admin-dev-secret-token')

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}))
    throw new Error(errorJson.error || `HTTP Error ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: any) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/**
 * Helper upload file ke S3 RustFS via endpoint Express
 */
export async function uploadAssetToStorage(file: File, folder: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  return api.post('/api/admin/upload', formData)
}
