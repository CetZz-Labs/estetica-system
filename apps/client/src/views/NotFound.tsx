import { Link } from 'react-router';
import { FiArrowLeft } from 'react-icons/fi';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-maison-bg flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Error</p>
                <h1 className="font-serif text-8xl font-bold text-maison-primary mb-2">404</h1>
                <h2 className="font-serif text-2xl text-maison-text mb-4">Página no encontrada</h2>
                <p className="text-sm text-gray-500 mb-8">
                    La página que buscás no existe o fue movida. Verificá la dirección o volvé al inicio.
                </p>
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 bg-maison-primary hover:bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
                >
                    <FiArrowLeft /> Volver al inicio
                </Link>
            </div>
        </div>
    );
}
