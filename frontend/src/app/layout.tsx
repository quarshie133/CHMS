import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TLPCI ChurchMS — The Lord's Pentecostal Church International",
    template: "%s | TLPCI ChurchMS",
  },
  description:
    "A modern Church Management System for The Lord's Pentecostal Church International — ministry operations, member discipleship, giving, communications, and church life.",
  keywords: ["church management", "TLPCI", "ChurchMS", "Pentecostal", "members", "attendance", "giving"],
};

export const viewport: Viewport = {
  themeColor: "#0b2345",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Icon font for every page (App Router root layout). `display=block` avoids
            flashing raw ligature names like "search" before the font loads. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
