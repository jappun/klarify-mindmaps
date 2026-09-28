import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const switzer = localFont({
  variable: "--font-switzer",
  src: [
    { path: "./fonts/Switzer-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Switzer-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Switzer-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/Switzer-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Switzer-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Switzer-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Klarify - AI Assistant for Therapists",
  description: "Klarify mindmaps demo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${switzer.variable} h-dvh antialiased`}>
      <body className="h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
