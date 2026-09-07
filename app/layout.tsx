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
          <div className="announce-bar">
            <span className="announce-live" />
            <span>$PAWN token is now live on Robinhood Chain.</span>
            <a
              href="https://robinhoodchain.blockscout.com/token/0x8d4DB600428cc38848626C7921687023274E4293"
              target="_blank"
              rel="noopener noreferrer"
              className="announce-link"
            >
              0x8d4D…4293 ↗
            </a>
          </div>
          <Navigation />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
