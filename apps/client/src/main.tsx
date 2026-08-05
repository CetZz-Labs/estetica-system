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

// Registro del Service Worker para notificaciones push (UX-68). Se registra siempre
// que el navegador lo soporte; el opt-in real (permiso + suscripción) es una acción
// explícita del usuario en Configuración > Mi Negocio, no ocurre automáticamente acá.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('Error al registrar el Service Worker:', err));
  });
}

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
