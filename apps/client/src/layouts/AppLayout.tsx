import { useState, useRef } from "react";
import { useAuth, useUser, UserButton } from "@clerk/react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { FiMenu, FiX, FiHome, FiUsers, FiScissors, FiPackage, FiCalendar, FiUser, FiBriefcase, FiClock, FiBell } from "react-icons/fi";
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/adminApi';
import type { AdminInfo, AdminRole } from '../types';
import ThemeToggle from '../components/ui/ThemeToggle';
import useIsDark from '../hooks/useIsDark';

const ROLE_LABELS: Record<AdminRole, string> = {
    ADMIN: 'Administrador',
    PROFESSIONAL: 'Profesional',
    RECEPTIONIST: 'Recepción',
};

export default function AppLayout() {
    const { isLoaded, userId } = useAuth();
    const { user } = useUser();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const footerRef = useRef<HTMLDivElement>(null);
    const isDark = useIsDark();

    const { data: adminInfo } = useQuery<AdminInfo>({
        queryKey: ['admin-me'],
        queryFn: getMe,
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    const role: AdminRole = adminInfo?.role ?? 'ADMIN';

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                Cargando...
            </div>
        );
    }

    if (!userId) {
        return <Navigate to="/login" replace />;
    }

    const closeMenu = () => setIsMobileMenuOpen(false);

    const handleUserFooterClick = () => {
        const userButton = footerRef.current?.querySelector('button');
        userButton?.click();
    };

    const userFullName = user?.fullName || user?.username || '';
    const userRole = ROLE_LABELS[role] || role;

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        }`;

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background text-foreground font-sans">

            {/* Header Móvil */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-30">
                <div>
                    <img src={isDark ? "/shear-logo-dark.png" : "/shear-logo.png"} alt="Shear" className="h-11 w-auto" />
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

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
                {/* Brand */}
                <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <img src={isDark ? "/shear-logo-dark.png" : "/shear-logo.png"} alt="Shear" className="w-24 h-auto" />
                    </div>
                    <button onClick={closeMenu} className="md:hidden p-2 text-gray-400 hover:text-gray-700">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto custom-scrollbar">
                    <NavLink to="/dashboard" onClick={closeMenu} className={navLinkClass}>
                        <FiHome size={18} />
                        <span>Inicio</span>
                    </NavLink>

                    <NavLink to="/clientes" onClick={closeMenu} className={navLinkClass}>
                        <FiUsers size={18} />
                        <span>Clientes</span>
                    </NavLink>

                    <NavLink to="/servicios" onClick={closeMenu} className={navLinkClass}>
                        <FiScissors size={18} />
                        <span>Servicios</span>
                    </NavLink>

                    {role !== 'RECEPTIONIST' && (
                        <NavLink to="/inventario" onClick={closeMenu} className={navLinkClass}>
                            <FiPackage size={18} />
                            <span>Inventario</span>
                        </NavLink>
                    )}

                    <NavLink to="/turnos" onClick={closeMenu} className={navLinkClass}>
                        <FiCalendar size={18} />
                        <span>Turnos</span>
                    </NavLink>

                    {role === 'ADMIN' && (
                        <>
                            <div className="pt-3 mt-2 border-t border-sidebar-border">
                                <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase">Equipo</p>
                            </div>
                            <NavLink to="/profesionales" onClick={closeMenu} className={navLinkClass}>
                                <FiUser size={18} />
                                <span>Profesionales</span>
                            </NavLink>
                        </>
                    )}

                    {role === 'ADMIN' && (
                        <>
                            <div className="pt-3 mt-2 border-t border-sidebar-border">
                                <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase">Configuración</p>
                            </div>
                            <NavLink to="/configuracion/negocio" onClick={closeMenu} className={navLinkClass}>
                                <FiBriefcase size={18} />
                                <span>Mi Negocio</span>
                            </NavLink>
                            <NavLink to="/configuracion/disponibilidad" onClick={closeMenu} className={navLinkClass}>
                                <FiClock size={18} />
                                <span>Disponibilidad</span>
                            </NavLink>
                            <NavLink to="/configuracion/notificaciones" onClick={closeMenu} className={navLinkClass}>
                                <FiBell size={18} />
                                <span>Notificaciones</span>
                            </NavLink>
                        </>
                    )}
                </nav>

            {/* Footer */}
            <div className="p-3 border-t border-sidebar-border space-y-0.5">
                <div
                        ref={footerRef}
                        onClick={handleUserFooterClick}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-sidebar-accent/50 transition-colors"
                    >
                        <UserButton />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-sidebar-foreground truncate">{userFullName}</p>
                            <p className="text-xs text-sidebar-foreground/50 truncate">{userRole}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Área de Contenido Principal */}
            <main className="flex-1 p-3 md:p-4 overflow-x-hidden overflow-y-auto">
                <div className="bg-card border border-border rounded-xl shadow-lg min-h-full">
                    <div className="p-4 md:p-8">
                        <div key={location.pathname} className="animate-page-in">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </main>
            <ThemeToggle />
        </div>
    );
}
