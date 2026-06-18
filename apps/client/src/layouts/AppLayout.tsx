import { useState } from "react";
import { useAuth, UserButton } from "@clerk/react";
import { Navigate, NavLink, Outlet } from "react-router";
import { FiMenu, FiX } from "react-icons/fi"; // Asegurate de tener react-icons instalado

export default function AppLayout() {
    const { isLoaded, userId } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-maison-bg text-maison-text">
                Cargando...
            </div>
        );
    }

    if (!userId) {
        return <Navigate to="/login" replace />;
    }

    // Función auxiliar para cerrar el menú al hacer clic en un enlace (solo en móvil)
    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-maison-bg text-maison-text font-sans">
            
            {/* Header Móvil (Solo visible en pantallas chicas) */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-maison-border bg-maison-card sticky top-0 z-30">
                <div>
                    <h1 className="text-xl font-serif font-bold tracking-wide">Shaer</h1>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(true)} 
                    className="p-2 text-gray-600 hover:text-black transition-colors"
                >
                    <FiMenu size={24} />
                </button>
            </div>

            {/* Overlay oscuro para móvil */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={closeMenu}
                />
            )}

            {/* Sidebar (Menú Lateral) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-maison-card border-r border-maison-border flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-maison-border flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-serif font-bold tracking-wide">Shaer</h1>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Estudio · CRM</p>
                    </div>
                    {/* Botón de cerrar solo visible en móvil */}
                    <button onClick={closeMenu} className="md:hidden p-2 text-gray-400 hover:text-gray-700">
                        <FiX size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <NavLink
                        to="/"
                        end
                        onClick={closeMenu}
                        className={({ isActive }) => `block p-3 rounded-lg font-medium transition-colors ${isActive
                            ? 'bg-maison-bg text-maison-text border border-maison-border'
                            : 'text-gray-500 hover:text-maison-text hover:bg-gray-50 border border-transparent'
                            }`}
                    >
                        Inicio
                    </NavLink>

                    <NavLink
                        to="/clientes"
                        onClick={closeMenu}
                        className={({ isActive }) => `block p-3 rounded-lg font-medium transition-colors ${isActive
                            ? 'bg-maison-bg text-maison-text border border-maison-border'
                            : 'text-gray-500 hover:text-maison-text hover:bg-gray-50 border border-transparent'
                            }`}
                    >
                        Clientes
                    </NavLink>
                    
                    <NavLink
                        to="/servicios"
                        onClick={closeMenu}
                        className={({ isActive }) => `block p-3 rounded-lg font-medium transition-colors ${isActive
                            ? 'bg-maison-bg text-maison-text border border-maison-border'
                            : 'text-gray-500 hover:text-maison-text hover:bg-gray-50 border border-transparent'
                            }`}
                    >
                        Servicios
                    </NavLink>
                    
                    <NavLink
                        to="/inventario"
                        onClick={closeMenu}
                        className={({ isActive }) => `block p-3 rounded-lg font-medium transition-colors ${isActive
                            ? 'bg-maison-bg text-maison-text border border-maison-border'
                            : 'text-gray-500 hover:text-maison-text hover:bg-gray-50 border border-transparent'
                            }`}
                    >
                        Inventario
                    </NavLink>

                    <NavLink
                        to="/turnos"
                        onClick={closeMenu}
                        className={({ isActive }) => `block p-3 rounded-lg font-medium transition-colors ${isActive
                            ? 'bg-maison-bg text-maison-text border border-maison-border'
                            : 'text-gray-500 hover:text-maison-text hover:bg-gray-50 border border-transparent'
                            }`}
                    >
                        Turnos
                    </NavLink>

                    <NavLink
                        to="/configuracion/negocio"
                        onClick={closeMenu}
                        className={({ isActive }) => `block p-3 rounded-lg font-medium transition-colors ${isActive
                            ? 'bg-maison-bg text-maison-text border border-maison-border'
                            : 'text-gray-500 hover:text-maison-text hover:bg-gray-50 border border-transparent'
                            }`}
                    >
                        Configuración
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-maison-border flex items-center gap-3">
                    <UserButton />
                    <span className="text-sm font-medium">Mi Cuenta</span>
                </div>
            </aside>

            {/* Área de Contenido Principal */}
            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                <Outlet />
            </main>
        </div>
    );
}