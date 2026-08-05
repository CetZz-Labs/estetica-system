/**
 * `PushManager.subscribe()` exige `applicationServerKey` como `Uint8Array`, pero la
 * VAPID public key se distribuye como string base64url (`VITE_VAPID_PUBLIC_KEY`).
 * Conversión estándar documentada por MDN/web.dev para Web Push — no es una
 * dependencia nueva, es un helper corto sin estado.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray: Uint8Array<ArrayBuffer> = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/** Heurística simple para mostrar la aclaración de instalación de iOS (push solo funciona
 * si la PWA fue agregada a la pantalla de inicio). No distingue Safari vs otros navegadores
 * en iOS a propósito: todos comparten el motor WebKit y la misma limitación. */
export function isIOS(): boolean {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
