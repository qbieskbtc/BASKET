import basketFactoryArtifact from "@/out/BasketFactory.sol/BasketFactory.json";
import basketRouterArtifact from "@/out/BasketRouter.sol/BasketRouter.json";
import basketVaultArtifact from "@/out/BasketVault.sol/BasketVault.json";
import erc20MetadataArtifact from "@/out/IERC20Metadata.sol/IERC20Metadata.json";
import ponsV3AdapterArtifact from "@/out/PonsV3Adapter.sol/PonsV3Adapter.json";
import type { Abi } from "viem";

export const basketFactoryAbi = basketFactoryArtifact.abi as Abi;
export const basketRouterAbi = basketRouterArtifact.abi as Abi;
export const basketVaultAbi = basketVaultArtifact.abi as Abi;
export const erc20MetadataAbi = erc20MetadataArtifact.abi as Abi;
export const ponsV3AdapterAbi = ponsV3AdapterArtifact.abi as Abi;
