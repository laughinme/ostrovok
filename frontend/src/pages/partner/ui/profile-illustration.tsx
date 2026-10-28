export function ProfileIllustration({ coverage }: { coverage: number }) {
  return (
    <svg
      className="partner-profile-illustration"
      viewBox="0 0 320 240"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="164" cy="203" rx="112" ry="22" fill="#93ce74" />
      <path d="M68 102 156 58 248 103 160 151Z" fill="#fff" />
      <path d="M68 102 160 147V204L68 157Z" fill="#2146e4" />
      <path d="M160 147 248 103V158L160 204Z" fill="#1c36a3" />
      <path d="M95 88 157 57 218 88 156 119Z" fill="#e4edff" />
      <path d="M95 88 156 118V145L95 114Z" fill="#8ca5ef" />
      <path d="M156 118 218 88V115L156 145Z" fill="#5279e3" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((column) => (
          <path
            key={`${row}-${column}`}
            d={`M${81 + column * 25} ${119 + column * 12 + row * 12}v7l11 5v-7Z`}
            fill={row === 1 ? "#b8f28f" : "#c5d6ff"}
          />
        )),
      )}
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((column) => (
          <path
            key={`${row}-${column}`}
            d={`M${176 + column * 23} ${151 - column * 11 + row * 12}v7l11-5v-7Z`}
            fill={row === 1 ? "#b8f28f" : "#8ba9f8"}
          />
        )),
      )}
      <path d="M137 167v25l14 7v-25Z" fill="#b8f28f" />
      <path
        d="M46 172C22 130 47 56 104 38M266 182C294 161 296 113 277 80"
        stroke="#2146e4"
        strokeWidth="1.2"
        strokeDasharray="4 6"
      />
      <circle cx="244" cy="59" r="34" fill="#fff" />
      <circle cx="244" cy="59" r="28" stroke="#e4ebfb" strokeWidth="4" />
      <circle
        cx="244"
        cy="59"
        r="28"
        stroke="#2146e4"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${coverage * 1.76} 176`}
        transform="rotate(-90 244 59)"
      />
      <text
        x="244"
        y="65"
        textAnchor="middle"
        fill="#2146e4"
        fontFamily="Onest, sans-serif"
        fontSize="19"
        fontWeight="700"
      >
        {coverage}%
      </text>
      <path
        d="m50 63 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM263 188l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"
        fill="#2146e4"
      />
    </svg>
  );
}
