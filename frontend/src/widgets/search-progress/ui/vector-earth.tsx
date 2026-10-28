import { useId } from "react";

export function VectorEarth() {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="search-flight-earth-svg" viewBox="0 0 480 480" fill="none" focusable="false">
      <defs>
        <clipPath id={`${id}-earth-clip`}>
          <circle cx="240" cy="240" r="176" />
        </clipPath>
        <g id={`${id}-earth-land`}>
          <path d="m30 117 26-26 30-1 11-17 26 2 15 9 24-4 17 20-9 15 13 8-9 17-23 2-9 15 12 11-5 17-15 5-9-14-14-6-11-14-24-3-14-17-25-5Z" />
          <path d="m137 183 13 1 7 15 15 3 8 10 15 1 3 10-17 1-12-10-15-4-9-13Z" />
          <path d="m179 228 23-15 24 8 10 20 19 9-8 23-15 11-2 22-16 17-4 24-15 20-8-23 6-19-9-15-9-24-9-23Z" />
          <path d="m181 55 33-13 28 12 7 18-13 18-25 12-15-14-2-17Z" />
          <path d="m260 88 7-12 12 4 3 13-10 8 8 11-6 9 11 10 8-4 8-18 17-2 9 12-6 12 19-2 9-14 30-4 11 11 33-7 17 28-17 20-5 21-19-1-4 21-17 11-17-14-11 3-5-20-15-5-12-15-17-1-8 13-14 2 3 15-11 12-10-9-13 6-11-11 6-14-13-4 1-14 9-7-4-12 10-7-3-13Z" />
          <path d="m259 180 18-8 26 9 14 16 15 1 11 22-12 23-16 10-6 27-20 22-10-16-4-24-17-16-12-24 2-22Z" />
          <path d="m339 265 7-10 5 10-3 22-8 11-5-11Z" />
          <path d="m351 296 18-8 17 5 11-7 20 14 7 21-12 15-17-4-17 7-20-9-11-17Z" />
          <path d="m247 132 5-8 7 2-2 14-8 5-4-6Zm-14 11 8-4 4 8-6 10-9-3Z" />
        </g>
      </defs>
      <g stroke="#c9f59a" strokeWidth="1" opacity=".22">
        <ellipse cx="240" cy="240" rx="227" ry="106" transform="rotate(-27 240 240)" />
        <ellipse cx="240" cy="240" rx="211" ry="139" transform="rotate(32 240 240)" />
      </g>
      <g clipPath={`url(#${id}-earth-clip)`}>
        <circle cx="240" cy="240" r="176" fill="#1b4de4" />
        <g className="search-flight-land" fill="#c9f59a">
          {[-440, 0, 440].map((x) => (
            <use key={x} href={`#${id}-earth-land`} transform={`translate(${x + 20} 20)`} />
          ))}
        </g>
        <g stroke="#b7d6ff" strokeWidth="1" opacity=".18">
          <ellipse cx="240" cy="240" rx="65" ry="176" />
          <ellipse cx="240" cy="240" rx="138" ry="176" />
          <ellipse cx="240" cy="240" rx="176" ry="62" />
          <ellipse cx="240" cy="240" rx="176" ry="130" />
        </g>
      </g>
      <circle cx="240" cy="240" r="176" stroke="#5384ff" strokeWidth="1" />
      <circle cx="49" cy="326" r="5" fill="#c9f59a" />
      <circle cx="393" cy="90" r="4" fill="#c9f59a" />
      <path
        d="M75 100q0 8 8 8-8 0-8 8 0-8-8-8 8 0 8-8Zm339 258q0 6 6 6-6 0-6 6 0-6-6-6 6 0 6-6Z"
        fill="#c9f59a"
      />
    </svg>
  );
}
