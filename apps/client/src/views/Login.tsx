import { SignIn } from "@clerk/react";

export default function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <SignIn
                routing="path"
                path="/login"
                signUpUrl="/registro"
                // Clerk permite personalizar variables CSS para que coincida con tu marca
                appearance={{
                    variables: {
                        colorPrimary: '#c18695', // primary
                        colorBackground: '#FFFFFF', // card
                    }
                }}
            />
        </div>
    )
}