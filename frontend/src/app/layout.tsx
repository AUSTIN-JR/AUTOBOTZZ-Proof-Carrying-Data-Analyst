import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AUTOBOTZZ | Proof-Carrying Data Analyst",
  description: "Agentic GenAI data analysis with executable evidence and verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
