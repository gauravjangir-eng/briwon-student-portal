import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading", weight: ["600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Briwon Academy Portal", template: "%s · Briwon Academy" },
  description: "Student management and learning portal for Briwon Academy.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#244879", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
