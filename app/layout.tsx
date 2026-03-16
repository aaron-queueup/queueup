import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ModalProvider } from "./ModalProvider";
import { JoinModalProvider } from "./JoinModal";
import { Russo_One } from "next/font/google";
import "./globals.css";

const russoOne = Russo_One({ weight: "400", subsets: ["latin"], variable: "--font-logo" });

export const metadata: Metadata = {
  title: "Queue Up - Play to Win",
  description: "Tournament brackets, simplified.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${russoOne.variable}`}>
      <body suppressHydrationWarning className="bg-[#0f0f23] text-white min-h-screen antialiased">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#5865F2",
              colorBackground: "#0f0f23",
              colorInputBackground: "#1a1a3e",
              colorText: "#ffffff",
            },
          }}
        >
          <ConvexClientProvider>
            <ModalProvider>
              <JoinModalProvider>{children}</JoinModalProvider>
            </ModalProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
