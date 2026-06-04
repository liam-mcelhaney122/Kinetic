import { SignIn } from '@clerk/clerk-react';

export function LoginScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-primary via-primary-container to-on-surface px-6 py-12">
      {/* Brand */}
      <div className="mb-10 text-center">
        <h1 className="font-headline text-6xl font-extrabold uppercase tracking-tighter text-on-primary">
          KINETIC
        </h1>
        <p className="font-body mt-2 text-base text-on-primary/70">
          Your AI-powered training partner.
        </p>
      </div>

      {/* Clerk sign-in card */}
      <SignIn
        routing="hash"
        appearance={{
          variables: {
            colorPrimary: '#b7102a',
            colorBackground: '#ffffff',
            borderRadius: '1rem',
            fontFamily: 'inherit',
          },
          elements: {
            card: 'shadow-2xl',
            formButtonPrimary:
              'rounded-full py-3 font-headline font-extrabold uppercase tracking-widest',
          },
        }}
      />
    </div>
  );
}
