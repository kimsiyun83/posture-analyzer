import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppProvider from "../components/AppProvider";
import "./care-design.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "LULU CARE",
  appleWebApp: { capable: true, title: "LULU CARE", statusBarStyle: "default" },
  icons: { icon: "/app-icons/icon-192.png", apple: "/app-icons/apple-touch-icon.png" },
  title: "LULU CARE | 내 몸을 위한 작은 체크",
  description: "자세 검사, 업무 자세 알림, 인바디 변화 기록을 한곳에서 확인하세요.",
};

export const viewport: Viewport = { themeColor: "#194a38", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AppProvider>{children}</AppProvider></body>
    </html>
  );
}

