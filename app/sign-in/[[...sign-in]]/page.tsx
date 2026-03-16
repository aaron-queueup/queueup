import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-5xl tracking-wide mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#8b95f5]" style={{ fontFamily: "var(--font-logo)" }}>QUEUE UP</h1>
      <p className="text-gray-400 text-lg mb-12">
        Tournament brackets, simplified.
      </p>
      <SignIn afterSignInUrl="/" />
    </div>
  );
}
