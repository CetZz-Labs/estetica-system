import { SignUp } from "@clerk/react";

export default function Register() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-maison-bg">
            <div className="flex flex-col items-center gap-6">
                <SignUp
                    routing="path"
                    path="/registro"
                    fallbackRedirectUrl="/registro/completar"
                    signInUrl="/login"
                    appearance={{
                        variables: {
                            colorPrimary: '#1A1A1A',
                            colorBackground: '#FFFFFF',
                        }
                    }}
                />
            </div>
        </div>
    );
}
