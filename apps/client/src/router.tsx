import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from "react-router";
import { Toaster, toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import Login from "./views/Login";
import Register from "./views/Register";
import CompletarRegistro from "./views/CompletarRegistro";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./views/Dashboard";
import Clients from "./views/Clients";
import ProfileClient from "./views/ProfileClient";
import Servicios from "./views/Servicios";
import Profesionales from "./views/Profesionales";
import Turnos from "./views/Turnos";
import Inventario from "./views/Inventario";
import Negocio from "./views/Negocio";
import Disponibilidad from "./views/Disponibilidad";
import Landing from "./views/Landing";
import AceptarInvitacion from "./views/AceptarInvitacion";
import NotFound from "./views/NotFound";
import { getMe } from './api/adminApi';
import type { AdminInfo, AdminRole } from './types';

interface Props {
    roles: AdminRole[];
    children: ReactNode;
}

function ProtectedRoute({ roles, children }: Props) {
    const { data: adminInfo, isLoading } = useQuery<AdminInfo>({
        queryKey: ['admin-me'],
        queryFn: getMe,
    });

    const isDenied = !isLoading && (!adminInfo || !roles.includes(adminInfo.role));

    useEffect(() => {
        if (isDenied) {
            toast.error('No tienes permisos para acceder a esta sección.');
        }
    }, [isDenied]);

    if (isLoading) return null;
    if (isDenied) return <Navigate to="/dashboard" replace />;

    return <>{children}</>;
}

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login/*" element={<Login />} />
                <Route path="/registro/completar" element={<CompletarRegistro />} />
                <Route path="/registro/*" element={<Register />} />
                <Route path="/unirse" element={<AceptarInvitacion />} />

                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clientes" element={<Clients />} />
                    <Route path="/clientes/:id" element={<ProfileClient />} />
                    <Route path="/servicios" element={<Servicios />} />
                    <Route
                        path="/profesionales"
                        element={
                            <ProtectedRoute roles={['ADMIN']}>
                                <Profesionales />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/turnos" element={<Turnos />} />
                    <Route
                        path="/inventario"
                        element={
                            <ProtectedRoute roles={['ADMIN', 'PROFESSIONAL']}>
                                <Inventario />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/configuracion/negocio"
                        element={
                            <ProtectedRoute roles={['ADMIN']}>
                                <Negocio />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/configuracion/disponibilidad"
                        element={
                            <ProtectedRoute roles={['ADMIN']}>
                                <Disponibilidad />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster position="top-right" richColors />
        </BrowserRouter>
    )
}