import { useRef, useState } from "react";
import { useAuth, useUser, UserButton } from "@clerk/react";
import { Navigate, NavLink, Outlet } from "react-router";
import { FiMenu, FiX } from "react-icons/fi";
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/adminApi';
import type { AdminInfo, AdminRole } from '../types';
import { TopbarProvider, useTopbar } from './TopbarContext';

const ROLE_LABELS: Record<AdminRole, string> = {
    ADMIN: 'Administrador',
    PROFESSIONAL: 'Profesional',
    RECEPTIONIST: 'Recepción',
};

interface SidebarNavLinkProps {
    to: string;
    onClick: () => void;
    children: string;
}

function SidebarNavLink({ to, onClick, children }: SidebarNavLinkProps) {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm transition-colors ${isActive
                    ? 'bg-rose-bg text-wine font-bold'
                    : 'text-text-3 font-medium hover:bg-hover-soft'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-accent' : 'bg-dotted'}`} />
                    <span>{children}</span>
                </>
            )}
        </NavLink>
    );
}

function Topbar() {
    const { title, primaryAction } = useTopbar();

    return (
        <header className="h-[66px] shrink-0 bg-surface border-b border-border flex items-center justify-between gap-4 px-6">
            <h1 className="font-serif text-2xl text-text truncate">{title}</h1>

            <div className="flex items-center gap-3">
                {primaryAction && (
                    <button
                        type="button"
                        onClick={primaryAction.onClick}
                        className="whitespace-nowrap bg-accent text-white font-semibold px-4.5 py-2.5 rounded-[10px] text-sm hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        {primaryAction.label}
                    </button>
                )}

                <UserButton />
            </div>
        </header>
    );
}

export default function AppLayout() {
    const { isLoaded, userId } = useAuth();
    const { user } = useUser();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const footerRef = useRef<HTMLDivElement>(null);

    const { data: adminInfo } = useQuery<AdminInfo>({
        queryKey: ['admin-me'],
        queryFn: getMe,
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    const role: AdminRole = adminInfo?.role ?? 'ADMIN';

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg text-text">
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

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-bg text-text font-sans">

            {/* Header Móvil */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-surface sticky top-0 z-30">
                <div>
                    <img src="/shear-logo.png" alt="Shear" className="h-11 w-auto" />
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-text-3 hover:text-text transition-colors cursor-pointer"
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
            <aside className={`fixed inset-y-0 left-0 z-50 w-[236px] bg-surface border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Brand */}
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <img src="/shear-logo.png" alt="Shear" className="w-24 h-auto" />
                    </div>
                    <button onClick={closeMenu} className="md:hidden p-2 text-text-3 hover:text-text cursor-pointer">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto custom-scrollbar">
                    <SidebarNavLink to="/dashboard" onClick={closeMenu}>Inicio</SidebarNavLink>
                    <SidebarNavLink to="/clientes" onClick={closeMenu}>Clientes</SidebarNavLink>
                    <SidebarNavLink to="/servicios" onClick={closeMenu}>Servicios</SidebarNavLink>

                    {role !== 'RECEPTIONIST' && (
                        <SidebarNavLink to="/inventario" onClick={closeMenu}>Inventario</SidebarNavLink>
                    )}

                    <SidebarNavLink to="/turnos" onClick={closeMenu}>Turnos</SidebarNavLink>
                    <SidebarNavLink to="/historial" onClick={closeMenu}>Historial de Visitas</SidebarNavLink>
                    <SidebarNavLink to="/guia" onClick={closeMenu}>Guía</SidebarNavLink>

                    {role === 'ADMIN' && (
                        <>
                            <div className="pt-3 mt-2 border-t border-border">
                                <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-muted uppercase">Equipo</p>
                            </div>
                            <SidebarNavLink to="/profesionales" onClick={closeMenu}>Profesionales</SidebarNavLink>
                        </>
                    )}

                    {role === 'ADMIN' && (
                        <>
                            <div className="pt-3 mt-2 border-t border-border">
                                <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-muted uppercase">Configuración</p>
                            </div>
                            <SidebarNavLink to="/configuracion/disponibilidad" onClick={closeMenu}>Disponibilidad</SidebarNavLink>
                        </>
                    )}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-border space-y-0.5">
                    <div
                        ref={footerRef}
                        onClick={handleUserFooterClick}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-hover-soft transition-colors"
                    >
                        <UserButton />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-text truncate">{userFullName}</p>
                            <p className="text-xs text-text-3 truncate">{userRole}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Área de Contenido Principal */}
            <TopbarProvider>
                <main className="flex-1 flex flex-col overflow-hidden">
                    <Topbar />
                    <div className="flex-1 overflow-x-hidden overflow-y-auto bg-bg p-7">
                        <Outlet />
                    </div>
                </main>
            </TopbarProvider>
        </div>
    );
}
