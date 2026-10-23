import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ambara GlobalTrade | Commodity Supply",
  description: "Ambara GlobalTrade supplies selected commodities to business buyers with clear specifications, quality checks, and direct commercial accountability.",
  icons: { icon: "/ambara-favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
