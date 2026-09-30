import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FiAlertCircle, FiBell, FiBellOff, FiSmartphone } from 'react-icons/fi';

import { savePushSubscription, deletePushSubscription } from '../api/pushNotificationApi';
import { handleApiError } from '../api/errorHandler';
import { urlBase64ToUint8Array, isIOS } from '../utils/webPush';

type PushToggleState = 'checking' | 'unsupported' | 'enabled' | 'disabled' | 'denied';

export default function Negocio() {
    const [pushState, setPushState] = useState<PushToggleState>('checking');
    const [isTogglingPush, setIsTogglingPush] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const checkPushSubscription = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                if (!cancelled) setPushState('unsupported');
                return;
            }
            if (Notification.permission === 'denied') {
                if (!cancelled) setPushState('denied');
                return;
            }
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (!cancelled) setPushState(subscription ? 'enabled' : 'disabled');
            } catch {
                if (!cancelled) setPushState('disabled');
            }
        };

        checkPushSubscription();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleTogglePush = async () => {
        if (isTogglingPush || pushState === 'unsupported' || pushState === 'checking') return;
        setIsTogglingPush(true);

        try {
            if (pushState === 'enabled') {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    const { endpoint } = subscription;
                    await subscription.unsubscribe();
                    try {
                        await deletePushSubscription(endpoint);
                    } catch (error) {
                        handleApiError(error, 'No se pudo eliminar la suscripción en el servidor');
                    }
                }
                setPushState('disabled');
                toast.success('Notificaciones desactivadas');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setPushState('denied');
                return;
            }

            const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                toast.error('Las notificaciones push no están configuradas para este negocio');
                setPushState('disabled');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            const json = subscription.toJSON();
            if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                throw new Error('La suscripción push generada por el navegador es inválida');
            }

            await savePushSubscription({
                endpoint: json.endpoint,
                keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            });
            setPushState('enabled');
            toast.success('Notificaciones activadas');
        } catch (error) {
            handleApiError(error, 'Error al actualizar las notificaciones push');
        } finally {
            setIsTogglingPush(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Configuración</p>
                <h1 className="font-serif text-2xl text-foreground">Mi Negocio</h1>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2">
                    <FiSmartphone className="text-muted-foreground text-lg" />
                    <h2 className="font-serif text-xl text-foreground">Notificaciones</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                    Recibí un aviso en este dispositivo cuando haya turnos o retoques pendientes para hoy.
                </p>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {pushState === 'enabled' ? (
                            <FiBell className="text-primary text-lg shrink-0" />
                        ) : (
                            <FiBellOff
                                className={`text-lg shrink-0 ${pushState === 'denied' ? 'text-destructive' : 'text-muted-foreground'}`}
                            />
                        )}
                        <span className={`text-sm font-medium ${pushState === 'denied' ? 'text-destructive' : 'text-foreground'}`}>
                            {pushState === 'checking' && 'Comprobando estado...'}
                            {pushState === 'unsupported' && 'No disponible en este navegador'}
                            {pushState === 'enabled' && 'Notificaciones activadas'}
                            {pushState === 'disabled' && 'Notificaciones desactivadas'}
                            {pushState === 'denied' && 'Notificaciones bloqueadas por el navegador'}
                        </span>
                    </div>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={pushState === 'enabled'}
                        aria-label={pushState === 'enabled' ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                        onClick={handleTogglePush}
                        disabled={isTogglingPush || pushState === 'unsupported' || pushState === 'checking'}
                        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${pushState === 'enabled' ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pushState === 'enabled' ? 'translate-x-4' : ''}`}
                        />
                    </button>
                </div>

                {pushState === 'denied' && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                        <FiAlertCircle /> Para activarlas, habilitá los permisos de notificaciones de este sitio en la configuración de tu navegador.
                    </p>
                )}

                {isIOS() && (
                    <p className="text-xs text-muted-foreground">
                        En iPhone, agregá esta app a tu pantalla de inicio (compartir &rarr; &quot;Agregar a pantalla de inicio&quot;) para poder recibir notificaciones.
                    </p>
                )}
            </div>
        </div>
    );
}
