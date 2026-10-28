export function GlobePlaceholder() {
  return (
    <div aria-hidden className="grid h-full w-full place-items-center">
      <div className="relative h-[74%] w-[74%] overflow-hidden rounded-full border border-sea/40 bg-gradient-to-br from-coral/70 to-night shadow-[0_0_60px_rgba(37,73,220,0.2)]">
        <div className="absolute inset-[12%] rounded-full border border-sun/15" />
        <div className="absolute inset-x-0 top-1/2 h-px -rotate-12 bg-sun/15" />
        <div className="absolute inset-y-0 left-1/3 w-1/3 rounded-[50%] border border-sun/15" />
        <div className="absolute left-[37%] top-[28%] h-[32%] w-[40%] rotate-12 rounded-[45%_65%_40%_55%] bg-sun/20 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
