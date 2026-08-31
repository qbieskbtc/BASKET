import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/web3/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "BASKET",
  description: "Onchain indexes for everything."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
