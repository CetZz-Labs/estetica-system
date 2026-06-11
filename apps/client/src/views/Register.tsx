import { SignUp } from "@clerk/react";
import { Link } from "react-router";

export default function Register() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-maison-bg">
            <div className="flex flex-col items-center gap-6">
                <SignUp
                    routing="path"
                    path="/registro"
                    fallbackRedirectUrl="/registro/completar"
                    appearance={{
                        variables: {
                            colorPrimary: '#1A1A1A',
                            colorBackground: '#FFFFFF',
                        }
                    }}
                />
                <p className="text-sm text-gray-500 text-center">
                    ¿Ya tenés cuenta?{" "}
                    <Link
                        to="/login"
                        className="font-medium text-maison-text underline underline-offset-4 hover:text-black transition-colors"
                    >
                        Iniciá sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
