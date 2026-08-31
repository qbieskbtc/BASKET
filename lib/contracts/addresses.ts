import { basketDeployment } from "@/lib/contracts/deployments";

export const contractAddresses = {
  basketFactory: basketDeployment.factory,
  basketRouter: basketDeployment.router,
  ponsV3Adapter: basketDeployment.adapter
};
