import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="bg-grid fixed inset-0 pointer-events-none" />
      <div className="relative animate-fade-in-up">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white dark:bg-black border border-black/8 dark:border-white/10 shadow-2xl rounded-2xl",
              headerTitle: "text-black dark:text-white",
              headerSubtitle: "text-black/50 dark:text-white/50",
              socialButtonsBlockButton:
                "border-black/8 dark:border-white/10 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5",
              formFieldInput:
                "border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-black dark:text-white",
              formButtonPrimary:
                "bg-black dark:bg-white text-white dark:text-black hover:opacity-80",
              footerActionLink: "text-black/60 dark:text-white/60",
            },
          }}
          forceRedirectUrl="/onboarding"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
