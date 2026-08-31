import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { BasketDetailClient } from "./BasketDetailClient";

export default function BasketPage({ params }: { params: { address: string } }) {
  if (!isAddress(params.address)) notFound();
  return <BasketDetailClient address={params.address as Address} />;
}
