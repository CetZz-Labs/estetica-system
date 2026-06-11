import { SignIn } from "@clerk/react";
import { Link } from "react-router";

export default function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-maison-bg">
            <SignIn
                routing="path"
                path="/login"
                // Clerk permite personalizar variables CSS para que coincida con tu marca
                appearance={{
                    variables: {
                        colorPrimary: '#1A1A1A', // maison-primary
                        colorBackground: '#FFFFFF', // maison-card
                    }
                }}
            />
            <p className="text-sm text-gray-500 text-center mt-6">
                ¿Primera vez?{" "}
                <Link
                    to="/registro"
                    className="font-medium text-maison-text underline underline-offset-4 hover:text-black transition-colors"
                >
                    Registrá tu negocio
                </Link>
            </p>
        </div>
    )
}