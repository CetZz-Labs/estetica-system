import axios from 'axios';

declare global {
    interface Window {
        Clerk?: {
            isReady?: boolean; // Clerk internamente tiene esta bandera o similar
            session?: {
                getToken: () => Promise<string | null>;
            };
        };
    }
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true,
});

/**
 * Función que pausa la ejecución hasta que Clerk se inyecte en el objeto window
 * y termine de cargar su estado inicial (session).
 */
const waitForClerk = async (maxRetries = 20, delayMs = 100): Promise<void> => {
    for (let i = 0; i < maxRetries; i++) {
        // Asumimos que si window.Clerk existe, el script ya cargó.
        // Podrías necesitar ajustar esto si Clerk demora en montar la sesión.
        if (window.Clerk) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    console.warn("Clerk no se cargó a tiempo en Axios.");
};

// ─── Interceptors ───────────────────────────────────────────────────────────

api.interceptors.request.use(
    async (config) => {
        // 1. Esperamos a que Clerk exista en el DOM
        await waitForClerk();

        const clerk = window.Clerk;

        // 2. Si hay sesión activa, inyectamos el token
        if (clerk?.session) {
            const token = await clerk.session.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('No autorizado o token expirado');
        }
        return Promise.reject(error);
    }
);

export default api;