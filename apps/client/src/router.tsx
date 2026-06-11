import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from 'sonner'
import Login from "./views/Login";
import Register from "./views/Register";
import CompletarRegistro from "./views/CompletarRegistro";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./views/Dashboard";
import Clients from "./views/Clients";
import ProfileClient from "./views/ProfileClient";
import Servicios from "./views/Servicios";
import Inventario from "./views/Inventario";
import Negocio from "./views/Negocio";

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login/*" element={<Login />} />
                <Route path="/registro/completar" element={<CompletarRegistro />} />
                <Route path="/registro/*" element={<Register />} />

                <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clientes" element={<Clients />} />
                    <Route path="/clientes/:id" element={<ProfileClient />} />
                    <Route path="/servicios" element={<Servicios />} />
                    <Route path="/inventario" element={<Inventario />} />
                    <Route path="/configuracion/negocio" element={<Negocio />} />
                </Route>

            </Routes>
            <Toaster position="top-right" richColors />
        </BrowserRouter>
    )
}