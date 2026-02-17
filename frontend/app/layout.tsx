import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "RevCenter - Your AI Call Center Agent",
  description: "Transform your call center operations with intelligent AI agents that handle calls 24/7, qualify leads, and book appointments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster
          theme="light"
          position="bottom-right"
          richColors
          toastOptions={{ style: { borderRadius: 12 } }}
        />
      </body>
    </html>
  );
}
