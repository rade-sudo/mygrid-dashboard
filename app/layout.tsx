import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "mygrid · Dashboard",
  description: "mygrid poslovni sistem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body className="min-h-full" style={{ fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
