import type { ReactNode } from "react";
import { DemoBadge } from "./demo-badge";
export function Section({
  title,
  demo,
  children,
}: {
  title: string;
  demo?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">{title}</h2>
        {demo && <DemoBadge />}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
