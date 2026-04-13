import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "WanderNotes",
  description: "Your personal travel diary",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/wuo4qao.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="app-content">{children}</div>
        <footer className="app-footer">
          <Link href="/legal">Legal Notice</Link>
          <span className="footer-sep">·</span>
          <Link href="/privacy">Privacy Policy</Link>
        </footer>
      </body>
    </html>
  );
}
