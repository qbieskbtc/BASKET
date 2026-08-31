import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/web3/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pawn — Permissionless Onchain Indexes",
  description: "Build and own permissionless onchain indexes of PONS-launched tokens on Robinhood Chain."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
