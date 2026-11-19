import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConfirmHost } from "@/app/confirm";
import { ToastHost } from "@/app/toast";
import { SwRegister } from "@/lib/offline/register-sw";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Opname KSA",
  description: "Aplikasi hitung stok opname",
  manifest: "/manifest.webmanifest",
  applicationName: "Stock Opname KSA",
  appleWebApp: {
    capable: true,
    title: "Opname KSA",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/brand/icon-512.png",
    apple: "/brand/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a6b68",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ksa-cream">
        <SwRegister />
        {children}
        <ToastHost />
        <ConfirmHost />
      </body>
    </html>
  );
}
