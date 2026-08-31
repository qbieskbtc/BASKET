import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="eyebrow">{title}</p>
      <div>{children}</div>
      <Link href="/create" className="button button-dark">
        CREATE INDEX
      </Link>
    </div>
  );
}
