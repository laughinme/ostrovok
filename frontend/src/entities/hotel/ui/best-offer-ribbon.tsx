export function BestOfferRibbon() {
  return (
    <div className="absolute left-6 top-0 z-10 flex h-6 w-fit items-center whitespace-nowrap px-2.5 text-xs font-semibold leading-4 text-primary-foreground">
      <span className="pointer-events-none absolute inset-y-0 left-2 right-0 rounded-tr-[3px] bg-primary" />
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute -left-4 top-0 size-6 fill-primary"
      >
        <path d="M16 0C16 5 19 8 17 11L0 24H24V0Z" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 4 4"
        className="pointer-events-none absolute -right-1 top-2 size-1 -scale-x-100 fill-primary"
      >
        <path d="M0 4A4 4 0 0 0 4 0V4Z" />
      </svg>
      <span className="relative">Лучшее предложение</span>
    </div>
  );
}
