import Image from "next/image";
import Link from "next/link";
import { WalletButton } from "@/components/web3/WalletButton";

export function Navigation() {
  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="BASKET home">
        <Image src="/basket-logo.png" alt="" width={28} height={28} className="brand-mark" priority />
        <span>BASKET</span>
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

