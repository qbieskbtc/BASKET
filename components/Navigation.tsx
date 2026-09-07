import Image from "next/image";
import Link from "next/link";
import { WalletButton } from "@/components/web3/WalletButton";

export function Navigation() {
  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="Pawn home">
        <Image src="/pawn-logo.png" alt="" width={22} height={22} className="brand-mark" priority />
        <span>Pawn</span>
      </Link>
      <nav className="nav-links" aria-label="Primary">
        <Link href="/explore">Explore</Link>
        <Link href="/create">Create</Link>
        <Link href="/docs">Docs</Link>
      </nav>
      <WalletButton />
    </header>
  );
}
