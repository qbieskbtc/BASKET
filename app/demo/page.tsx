import { Suspense } from "react";
import { DemoClient } from "./DemoClient";

export const metadata = {
  title: "Pawn — Product Demo",
};

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#f4f1ea",
          }}
        />
      }
    >
      <DemoClient />
    </Suspense>
  );
}
