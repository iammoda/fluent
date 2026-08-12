import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fredoka } from "next/font/google";
import "./globals.css";
import { activeLang } from "@/lib/lang";
import Shell from "@/components/Shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "fluent — language arcade",
  description: "Personal adaptive Spanish & French trainer",
  appleWebApp: { capable: true, title: "fluent", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#faf3e7",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await activeLang();
  return (
    <html
      lang="en"
      data-lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream text-ink">
        <Shell lang={lang}>{children}</Shell>
      </body>
    </html>
  );
}
