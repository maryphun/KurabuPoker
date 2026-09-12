export interface ApiError { error: string; message?: string }

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/u, '') ?? ''
export const apiOrigin = apiBase || 'https://kurabu-poker-api.anopakukk.workers.dev'

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, { credentials: 'include', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, ...init })
  const body = await response.json().catch(() => ({})) as T | ApiError
  if (!response.ok) { const errorBody = body as ApiError; throw new Error(errorBody.error ?? `request_failed_${response.status}`) }
  return body as T
}

export function registerAccount(input: { username: string; password: string; nickname: string; goal: string; experience?: string; playFormat?: string; consentVersion: string }) {
  return apiRequest<{ account: { id: string; username: string; nickname: string; goal: string; publicId: string }; recoveryCodes: string[] }>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })
}
