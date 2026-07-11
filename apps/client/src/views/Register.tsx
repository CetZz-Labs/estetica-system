import { SignUp } from "@clerk/react";

export default function Register() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6">
                <SignUp
                    routing="path"
                    path="/registro"
                    fallbackRedirectUrl="/registro/completar"
                    signInUrl="/login"
                    appearance={{
                        variables: {
                            colorPrimary: '#c18695',
                            colorBackground: '#FFFFFF',
                        }
                    }}
                />
            </div>
        </div>
    );
}
