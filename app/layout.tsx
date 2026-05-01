import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas · Market Intelligence",
  description:
    "Bottom-up demand estimation models for consumer products across GCC markets — built from population architecture, supply validation, and channel decomposition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
