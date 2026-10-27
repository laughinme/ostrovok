import type { Hotel } from "@/entities/hotel";
import { cn } from "@/shared/lib";
import { motion } from "framer-motion";
export function NoiseChart({ hotel }: { hotel: Hotel }) {
  const max = 65;
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {hotel.noise.map((db, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${(db / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "w-full rounded-t-md",
                db < 36 ? "bg-conf-high" : db < 50 ? "bg-conf-mid" : "bg-coral",
              )}
            />
            <span className="pointer-events-none absolute -top-6 rounded bg-foreground px-1.5 font-mono text-[10px] text-background opacity-0 group-hover:opacity-100">
              {db} дБ
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
