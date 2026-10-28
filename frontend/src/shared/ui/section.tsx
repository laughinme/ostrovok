import type { ReactNode } from "react";
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
