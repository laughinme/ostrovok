import {
  BEACH_PROFILE,
  BEACH_ROUTE,
  NOISE_ROAD_TRANSFORM,
  projectSpace,
  spacePath,
  SUN_ARC,
  SUN_WINDOW,
  type SpacePoint,
} from "./evidence-geometry";
import { EvidenceCar } from "./evidence-car";
import {
  SpaceBench,
  SpaceBox,
  SpaceFace,
  SpaceGround,
  SpaceHotel,
  SpaceShadow,
  SpaceTree,
  SpaceUmbrella,
  SpaceWalker,
  SpaceWater,
} from "./evidence-space";

export function SunScene() {
  return (
    <g className="evidence-scene">
      <defs>
        <radialGradient id="proof-sun-light" cx="32%" cy="28%" r="75%">
          <stop stopColor="color-mix(in srgb, var(--verified) 64%, var(--surface))" />
          <stop offset=".65" stopColor="var(--verified)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--verified) 77%, var(--primary))" />
        </radialGradient>
      </defs>
      <SpaceGround x={18} width={206} depth={110} />
      <SpaceWater id="proof-sun-water" x={224} width={208} depth={110} />
      <SpaceShadow x={53} y={38} width={102} depth={55} />
      <path
        data-sun-arc
        d={SUN_ARC}
        fill="none"
        stroke="var(--verified)"
        strokeWidth="2"
        strokeDasharray="5 7"
        mask="url(#proof-draw-0)"
      />
      <line
        data-sun-ray
        x1={SUN_WINDOW.x}
        y1={SUN_WINDOW.y}
        x2="418"
        y2="110"
        stroke="var(--verified)"
        strokeWidth="1.3"
        strokeOpacity=".65"
      />
      <circle data-sun cx="418" cy="110" r="19" fill="url(#proof-sun-light)" />
      <SpaceHotel x={53} y={38} width={102} depth={55} selected />
      <SpaceTree x={187} y={70} size={0.58} />
      <text className="scene-note" x="24" y="302">
        Фасад, этаж и открытый горизонт
      </text>
    </g>
  );
}

export function NoiseScene() {
  return (
    <g className="evidence-scene">
      <SpaceGround x={10} y={-4} width={388} depth={156} />
      <g data-noise-road transform={NOISE_ROAD_TRANSFORM}>
        <rect x="51" y="52" width="62" height="210" fill="var(--primary)" />
        <path
          d="M82 53V261"
          stroke="var(--map-sea)"
          strokeWidth="1.5"
          strokeDasharray="9 9"
          opacity=".65"
        />
        <path d="M49 53V261M115 53V261" stroke="var(--surface)" strokeWidth="2" opacity=".65" />
      </g>
      <EvidenceCar lane={62} distance={85} reverse />
      <EvidenceCar lane={89} distance={178} pale />
      <g
        clipPath="url(#proof-noise-zone-1)"
        fill="none"
        stroke="var(--on-scene-muted)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path data-noise-wave d="M198 198Q208 208 198 218" opacity=".6" />
        <path data-noise-wave d="M207 188Q226 208 207 228" opacity=".4" />
        <path data-noise-wave d="M216 178Q242 208 216 238" opacity=".2" />
      </g>
      <SpaceShadow x={174} y={75} width={108} depth={54} />
      <path
        d={spacePath(
          Array.from({ length: 35 }, (_, i): SpacePoint => [
            300 + i * 2.8,
            16 + Math.sin(i / 7) * 13,
            0.1,
          ]),
        )}
        fill="none"
        stroke="var(--surface)"
        strokeWidth="8"
        strokeOpacity=".75"
      />
      <SpaceHotel x={174} y={75} courtyard />
      <SpaceTree x={390} y={130} size={0.66} />
      <SpaceTree x={332} y={110} size={0.9} />
      <SpaceBench x={350} y={66} />
      <path d="M377 131H380V117H412" stroke="var(--verified)" strokeWidth="1.5" fill="none" />
      <text className="scene-callout" x="438" y="106" textAnchor="middle">
        Окна во двор
      </text>
      <text className="scene-note" x="24" y="302">
        Улица с одной стороны. Двор с другой.
      </text>
    </g>
  );
}

export function RouteScene() {
  const floor = -16;
  const first = BEACH_PROFILE[0];
  const last = BEACH_PROFILE[BEACH_PROFILE.length - 1]!;
  const front: SpacePoint[] = [
    ...BEACH_PROFILE.map(([x, z]): SpacePoint => [x, 0, z]),
    [last[0], 0, floor],
    [first[0], 0, floor],
  ];
  const stairPoint = projectSpace([268, 62, 15]);
  return (
    <g className="evidence-scene">
      <g data-ground>
        <SpaceFace vertices={front} fill="var(--map-sea)" />
        <SpaceFace
          vertices={[
            [350, 0, 0],
            [350, 100, 0],
            [350, 100, floor],
            [350, 0, floor],
          ]}
          fill="color-mix(in srgb, var(--map-sea) 78%, var(--primary))"
        />
        {BEACH_PROFILE.slice(0, -1).map(([x, z], i) => {
          const [nextX, nextZ] = BEACH_PROFILE[i + 1]!;
          const stairs = x >= 224;
          return (
            <SpaceFace
              key={i}
              surface={x !== nextX}
              vertices={[
                [x, 0, z],
                [nextX, 0, nextZ],
                [nextX, 100, nextZ],
                [x, 100, z],
              ]}
              fill={
                x === nextX
                  ? "var(--map-sea)"
                  : stairs
                    ? "var(--surface)"
                    : "color-mix(in srgb, var(--verified) 48%, var(--surface))"
              }
            />
          );
        })}
        <path
          d={spacePath(BEACH_PROFILE.map(([x, z]): SpacePoint => [x, 0, z + 0.1]))}
          fill="none"
          stroke="var(--surface)"
          strokeWidth="1"
          strokeOpacity=".65"
        />
      </g>
      <SpaceWater id="proof-route-water" x={350} width={88} depth={100} z={-1} />
      <SpaceShadow x={52} y={38} z={54} width={76} depth={40} />
      <SpaceHotel x={52} y={38} z={54} width={76} depth={40} height={97} floors={3} />
      <SpaceTree x={145} y={95} z={54} size={0.62} />
      <SpaceUmbrella x={319} y={70} />
      {[316, 335].map((x) => (
        <SpaceBox
          key={x}
          x={x}
          y={40}
          width={2}
          depth={9}
          height={3}
          front="var(--scene)"
          side="var(--primary)"
        />
      ))}
      <SpaceBox x={316} y={40} z={3} width={22} depth={9} height={3} />
      <SpaceFace
        vertices={[
          [332, 40, 6],
          [339, 40, 15],
          [339, 49, 15],
          [332, 49, 6],
        ]}
        fill="var(--map-sea)"
      />
      <path
        d={BEACH_ROUTE}
        fill="none"
        stroke="var(--primary)"
        strokeOpacity=".18"
        strokeWidth="2.5"
        strokeDasharray="4 5"
      />
      <path
        data-beach-route
        d={BEACH_ROUTE}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeDasharray="4 5"
        mask="url(#proof-draw-2)"
      />
      <SpaceWalker />
      <path
        d={`M312 168V187L${stairPoint.x} ${stairPoint.y - 3}`}
        stroke="var(--on-scene-muted)"
        strokeWidth="1.3"
        fill="none"
      />
      <text className="scene-callout" x="312" y="157" textAnchor="middle">
        Ступени
      </text>
      <text className="scene-callout" x="427" y="202" textAnchor="middle">
        Пляж
      </text>
      <text className="scene-note" x="24" y="302">
        Проверим и спуск, и подъём обратно
      </text>
    </g>
  );
}
