import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Router from './router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/react'

// 1. Validar la llave de Clerk
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Falta agregar VITE_CLERK_PUBLISHABLE_KEY en el archivo .env.local")
}

// 2. Instanciar TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita peticiones innecesarias al cambiar de pestaña
      retry: 1, // Si falla una petición, reintenta 1 vez antes de dar error
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      afterSignOutUrl='/login'
      publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
)
