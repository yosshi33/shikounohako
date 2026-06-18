// Google Identity Services (GIS) を使った OAuth 認証
// APIキーを隠さずに、ユーザーのGoogleアカウントでSheets/Gemini APIにアクセスする。

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/cloud-platform',
].join(' ')

declare global {
  interface Window {
    google?: any
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

let gisLoadedPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (gisLoadedPromise) return gisLoadedPromise
  gisLoadedPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('GIS の読み込みに失敗しました'))
    document.head.appendChild(script)
  })
  return gisLoadedPromise
}

let tokenClient: any = null
let currentAccessToken: string | null = null
let currentExpiresAt = 0

export function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!id || id.startsWith('your-')) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID が設定されていません。.env に Google OAuth クライアントID を入力してください。',
    )
  }
  return id
}

export function getAccessToken(): string | null {
  if (currentAccessToken && Date.now() < currentExpiresAt - 60_000) {
    return currentAccessToken
  }
  return null
}

export async function initAuth(): Promise<void> {
  await loadGis()
  const clientId = getClientId()
  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {},
  })
}

function requestToken(prompt: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(new Error(resp.error_description ?? resp.error))
        return
      }
      currentAccessToken = resp.access_token
      currentExpiresAt = Date.now() + (resp.expires_in ?? 3600) * 1000
      localStorage.setItem('gis_authed', '1')
      resolve(resp.access_token)
    }
    try {
      tokenClient.requestAccessToken({ prompt })
    } catch (e: any) {
      reject(e)
    }
  })
}

export async function silentSignIn(): Promise<string> {
  if (!tokenClient) await initAuth()
  return requestToken('none')
}

export async function signIn(): Promise<string> {
  if (!tokenClient) await initAuth()
  return requestToken('')
}

export function signOut(): void {
  if (currentAccessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(currentAccessToken, () => {})
  }
  currentAccessToken = null
  currentExpiresAt = 0
}

export function isSignedIn(): boolean {
  return getAccessToken() !== null
}
