import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RevCenter - Your AI Call Center Agent",
  description: "Intelligent AI agents that handle customer calls, reduce wait times, and scale your support operations 24/7.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=BBH+Bogle:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} antialiased`}
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

