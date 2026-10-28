export function TravelGlobe({ clipId }: { clipId: string }) {
  return (
    <svg className="home-sky-globe" viewBox="0 0 440 440" fill="none" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <circle cx="220" cy="220" r="174" />
        </clipPath>
      </defs>
      <g stroke="currentColor" strokeWidth="1.2">
        <ellipse cx="220" cy="220" rx="210" ry="108" transform="rotate(-34 220 220)" />
        <ellipse cx="220" cy="220" rx="198" ry="146" transform="rotate(-34 220 220)" />
      </g>
      <g clipPath={`url(#${clipId})`}>
        <circle cx="220" cy="220" r="174" fill="currentColor" />
        <g className="home-sky-land">
          <path d="m30 117 26-26 30-1 11-17 26 2 15 9 24-4 17 20-9 15 13 8-9 17-23 2-9 15 12 11-5 17-15 5-9-14-14-6-11-14-24-3-14-17-25-5Z" />
          <path d="m137 183 13 1 7 15 15 3 8 10 15 1 3 10-17 1-12-10-15-4-9-13Z" />
          <path d="m179 228 23-15 24 8 10 20 19 9-8 23-15 11-2 22-16 17-4 24-15 20-8-23 6-19-9-15-9-24-9-23Z" />
          <path d="m181 55 33-13 28 12 7 18-13 18-25 12-15-14-2-17Z" />
          <path d="m260 88 7-12 12 4 3 13-10 8 8 11-6 9 11 10 8-4 8-18 17-2 9 12-6 12 19-2 9-14 30-4 11 11 33-7 17 28-17 20-5 21-19-1-4 21-17 11-17-14-11 3-5-20-15-5-12-15-17-1-8 13-14 2 3 15-11 12-10-9-13 6-11-11 6-14-13-4 1-14 9-7-4-12 10-7-3-13Z" />
          <path d="m259 180 18-8 26 9 14 16 15 1 11 22-12 23-16 10-6 27-20 22-10-16-4-24-17-16-12-24 2-22Z" />
          <path d="m339 265 7-10 5 10-3 22-8 11-5-11Z" />
          <path d="m351 296 18-8 17 5 11-7 20 14 7 21-12 15-17-4-17 7-20-9-11-17Z" />
          <path d="m247 132 5-8 7 2-2 14-8 5-4-6Zm-14 11 8-4 4 8-6 10-9-3Z" />
          <path d="m333 214 9 1 5 12 10 5 2 10-14-3-8-10Zm22 26 15 4 7 6-3 6-14-8Z" />
        </g>
        <g stroke="var(--lime)" strokeWidth="1" opacity=".22">
          <ellipse cx="220" cy="220" rx="80" ry="174" />
          <ellipse cx="220" cy="220" rx="145" ry="174" />
          <ellipse cx="220" cy="220" rx="174" ry="62" />
        </g>
      </g>
      <circle cx="220" cy="220" r="174" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="62" cy="292" r="5" fill="currentColor" />
      <circle cx="360" cy="99" r="3" fill="currentColor" />
    </svg>
  );
}
