import { useId } from "react";
import type { GeoFacade } from "../model/geo";

export function DemoWindowScene({
  facade,
  floor,
  sunVisible,
}: {
  facade: GeoFacade;
  floor: number;
  sunVisible: boolean;
}) {
  const id = useId();
  const sea = facade === "SW" || facade === "SE";
  const mountains = facade === "NE" || facade === "SE";
  const sunset = facade === "SW";
  const lift = Math.min(115, floor * 10);
  return (
    <svg
      viewBox="0 0 900 520"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Иллюстрация вида: ${facade}, ${floor} этаж`}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor={sunset ? "#c6e5f7" : "#dceef8"} />
          <stop offset="1" stopColor={sunset ? "#fff0c9" : "#f3fbf7"} />
        </linearGradient>
        <linearGradient id={`${id}-water`} x2="0" y2="1">
          <stop stopColor="#6eaff1" />
          <stop offset="1" stopColor="#2146e4" />
        </linearGradient>
        <linearGradient id={`${id}-glow`} x2="0" y2="1">
          <stop stopColor="#f6e4aa" stopOpacity=".75" />
          <stop offset="1" stopColor="#f6e4aa" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${id}-windows`} width="33" height="39" patternUnits="userSpaceOnUse">
          <rect x="9" y="9" width="11" height="17" rx="1" fill="#8da9c7" />
          <path d="M14.5 9V26" stroke="#dceaf3" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="900" height="520" fill={`url(#${id}-sky)`} />
      <g fill="#fff" opacity=".65">
        <path d="M70 112h135c-3-21-20-32-38-26-12-39-59-41-76-8-16-2-25 13-21 34Z" />
        <path d="M649 87h100c-5-18-16-23-29-20-11-28-43-30-57-7-11-1-19 12-14 27Z" />
      </g>
      {sea ? (
        <>
          <rect y="265" width="900" height="255" fill={`url(#${id}-water)`} />
          <path d="M0 266H900" stroke="#b1d1f6" strokeWidth="2" />
          {sunset && sunVisible && (
            <>
              <circle cx="375" cy="221" r="36" fill="#fff1b3" />
              <circle cx="375" cy="221" r="58" fill="#fff1b3" opacity=".16" />
              <path d="M362 270h26l91 250H272Z" fill={`url(#${id}-glow)`} />
            </>
          )}
          <g fill="none" stroke="#d9eaff" strokeLinecap="round" opacity=".45">
            <path
              d="M84 308h65m40 0h27m265 10h64m95-18h100M236 354h55m43 0h92m159 20h84M77 409h128m182 8h82m126 30h123M147 481h95m63-7h111"
              strokeWidth="2"
            />
          </g>
          <path d="M900 263C760 292 814 345 692 380s-99 100-216 140H900Z" fill="#99b9c8" />
          <path d="M900 283c-110 21-84 59-185 94s-119 102-209 143H900Z" fill="#d3e4d0" />
          <path
            d="M900 305c-87 12-84 58-157 84s-114 90-199 131"
            stroke="#fff6df"
            strokeWidth="12"
            fill="none"
          />
        </>
      ) : (
        <>
          <path d="M0 305Q150 248 298 312T600 300T900 308V520H0Z" fill="#b8d4b4" />
          <path d="M0 364Q180 292 352 367T680 354T900 378V520H0Z" fill="#92b69a" />
          <path d="M400 520Q512 401 738 364" stroke="#e8e7d1" strokeWidth="23" fill="none" />
        </>
      )}
      {facade === "NW" && <path d="M0 273H260L154 320H0Z" fill={`url(#${id}-water)`} />}
      {mountains && (
        <>
          <path d="M0 273 109 172l60 47 127-129 125 132 58-50 101 104Z" fill="#a8c6d3" />
          <path d="m206 183 90-93 74 78-54-16-19-25-26 30-18-4Z" fill="#edf4ee" />
          <path d="M0 290 62 234l80 35 113-83 128 109Z" fill="#8eb1bd" />
        </>
      )}
      <g transform={`translate(0 ${lift})`}>
        <g fill="#ecf1e9" stroke="#a9bdc4" strokeWidth="1.5">
          <path d="M0 311h103v209H0Z" />
          <path d="M18 291h68v20H18Z" fill="#d2e2df" />
          <path d="M725 372h91v148h-91Z" />
          <path d="M709 372h123l-19-19h-84Z" fill="#9cb9c4" />
          {!sea && <path d="M148 381h109v139H148Z" />}
        </g>
        <path d="M0 313h103v207H0Zm725 61h91v146h-91Z" fill={`url(#${id}-windows)`} />
        {!sea && <path d="M148 383h109v137H148Z" fill={`url(#${id}-windows)`} />}
      </g>
      <g transform={`translate(815 ${350 + lift * 0.4})`} stroke="#3c7872" strokeLinecap="round">
        <path d="M0 170Q-12 84 1 35" fill="none" strokeWidth="9" />
        <g fill="#508f78" strokeWidth="1">
          <path d="M1 35Q-51-16-86 28q48-9 87 7Z" />
          <path d="M1 35Q-16-29 19-38 15 0 1 35Z" />
          <path d="M1 35Q48-19 80 18 34 16 1 35Z" />
          <path d="M1 35Q58 33 66 79 32 49 1 35Z" />
          <path d="M1 35Q-61 35-64 84-33 55 1 35Z" />
        </g>
      </g>
    </svg>
  );
}
