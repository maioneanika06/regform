import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vendy Access Portal | Your Smart Event Companion",
  description:
    "Register for the event and get your unique QR code for vending machine access. Secure biometric verification powered by facial recognition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
