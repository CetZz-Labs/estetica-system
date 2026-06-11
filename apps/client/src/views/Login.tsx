import { SignIn } from "@clerk/react";

export default function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-maison-bg">
            <SignIn
                routing="path"
                path="/login"
                signUpUrl="/registro"
                // Clerk permite personalizar variables CSS para que coincida con tu marca
                appearance={{
                    variables: {
                        colorPrimary: '#1A1A1A', // maison-primary
                        colorBackground: '#FFFFFF', // maison-card
                    }
                }}
            />
        </div>
    )
}