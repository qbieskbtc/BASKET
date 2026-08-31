import Link from "next/link";
import { blockscoutAddressUrl } from "@/lib/chain/robinhood";
import { shortenAddress } from "@/lib/format";

export function AddressLink({ address }: { address: string }) {
  return (
    <Link href={blockscoutAddressUrl(address)} target="_blank" rel="noreferrer" className="address-link">
      {shortenAddress(address)}
    </Link>
  );
}

