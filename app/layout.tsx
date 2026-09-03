import type { Metadata } from "next";
import { Inter, Source_Serif_4, Roboto_Condensed, Courier_Prime, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });
const robotoCondensed = Roboto_Condensed({ subsets: ["latin"], weight: "700", variable: "--font-roboto-condensed" });
const courierPrime = Courier_Prime({ subsets: ["latin"], weight: "700", variable: "--font-courier-prime" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Lockshot - App Store Screenshot Localization",
  description: "iOS App Store screenshot localization desk with WebMCP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${robotoCondensed.variable} ${courierPrime.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
