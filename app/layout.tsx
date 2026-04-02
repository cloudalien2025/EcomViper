import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcomViper",
  description: "EcomViper standalone repository",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
