declare global {
  interface Window {
    google?: any
  }
}

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
  .trim()
  .replace(/^["']|["']$/g, '')
  .trim()

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    GOOGLE_CLIENT_ID &&
    !GOOGLE_CLIENT_ID.includes('your-') &&
    !GOOGLE_CLIENT_ID.includes('placeholder') &&
    GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
  )
}

export function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts?.id || window.google?.accounts?.oauth2) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
    if (existing) {
      if (window.google?.accounts) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'))
    document.head.appendChild(script)
  })
}

export interface GoogleAuthResult {
  credential?: string
  access_token?: string
  name?: string
  email?: string
}

export async function promptGoogleSignIn(): Promise<GoogleAuthResult> {
  await loadGoogleScript()

  if (!isGoogleOAuthConfigured()) {
    const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname.includes('vercel.app')
    if (isDev) {
      const promptEmail = window.prompt(
        'Google OAuth Notice: VITE_GOOGLE_CLIENT_ID is not configured in .env yet.\n\nFor testing right now, enter a Google email address to simulate the verified Google OAuth response (e.g. your Gmail):',
        'anmolgupta0880@gmail.com'
      )
      if (!promptEmail) {
        throw new Error('Google sign-in was cancelled.')
      }
      return {
        email: promptEmail.trim(),
        name: promptEmail.split('@')[0],
      }
    }

    throw new Error(
      'Google Sign-In is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.'
    )
  }

  return new Promise<GoogleAuthResult>((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: (response: any) => {
          if (response.error) {
            return reject(new Error(response.error_description || response.error || 'Google authorization failed.'))
          }
          if (response.access_token) {
            return resolve({ access_token: response.access_token })
          }
          reject(new Error('No access token received from Google.'))
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Google authorization popup closed or failed.'))
        },
      })

      client.requestAccessToken({ prompt: 'select_account' })
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to initialize Google Sign-In.'))
    }
  })
}

