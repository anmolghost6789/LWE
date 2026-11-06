import { Auth0Provider, useAuth0, type User as Auth0User } from '@auth0/auth0-react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const domain = (import.meta.env.VITE_AUTH0_DOMAIN || '').trim()
const clientId = (import.meta.env.VITE_AUTH0_CLIENT_ID || '').trim()

export const isAuth0Configured = Boolean(
  domain &&
  clientId &&
  !domain.includes('your-tenant') &&
  !clientId.includes('your-client-id')
)

interface Auth0BridgeContextType {
  isConfigured: boolean
  domain: string
  loginWithGoogle: () => Promise<Auth0User | null>
  logoutAuth0: () => Promise<void>
  auth0User: Auth0User | null
  isAuth0Authenticated: boolean
}

const defaultContext: Auth0BridgeContextType = {
  isConfigured: false,
  domain: '',
  loginWithGoogle: async () => null,
  logoutAuth0: async () => {},
  auth0User: null,
  isAuth0Authenticated: false,
}

const Auth0BridgeContext = createContext<Auth0BridgeContextType>(defaultContext)

function Auth0BridgeInner({ children }: { children: ReactNode }) {
  const { loginWithPopup, logout, user, isAuthenticated } = useAuth0()
  const [activeUser, setActiveUser] = useState<Auth0User | null>(user || null)

  useEffect(() => {
    setActiveUser(user || null)
  }, [user])

  const loginWithGoogle = async (): Promise<Auth0User | null> => {
    try {
      await loginWithPopup({
        authorizationParams: {
          connection: 'google-oauth2',
        },
      })
      // The pop-up completes and Auth0 sets credentials
      return user || null
    } catch (err) {
      console.error('Auth0 Google popup error:', err)
      throw err
    }
  }

  const logoutAuth0 = async () => {
    try {
      await logout({ logoutParams: { returnTo: window.location.origin } })
    } catch (err) {
      console.error('Auth0 logout error:', err)
    }
  }

  return (
    <Auth0BridgeContext.Provider
      value={{
        isConfigured: true,
        domain,
        loginWithGoogle,
        logoutAuth0,
        auth0User: activeUser,
        isAuth0Authenticated: isAuthenticated,
      }}
    >
      {children}
    </Auth0BridgeContext.Provider>
  )
}

export function Auth0BridgeProvider({ children }: { children: ReactNode }) {
  if (!isAuth0Configured) {
    return (
      <Auth0BridgeContext.Provider value={defaultContext}>
        {children}
      </Auth0BridgeContext.Provider>
    )
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
      }}
      cacheLocation="localstorage"
    >
      <Auth0BridgeInner>{children}</Auth0BridgeInner>
    </Auth0Provider>
  )
}

export function useAuth0Bridge() {
  return useContext(Auth0BridgeContext)
}
