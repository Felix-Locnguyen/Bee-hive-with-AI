import React from 'react';

const BODIES = {
  moth: (
    <>
      <ellipse cx="150" cy="108" rx="22" ry="9" fill="#d3c2a0" />
      <path
        d="M140 103q-34-26-46-6q10 22 46 12zM160 103q34-26 46-6q-10 22-46 12z"
        fill="#b9a67f"
        opacity=".9"
      />
    </>
  ),
  ant: (
    <>
      <circle cx="130" cy="110" r="8" fill="#2a1b12" />
      <circle cx="148" cy="108" r="6" fill="#2a1b12" />
      <ellipse cx="170" cy="110" rx="12" ry="9" fill="#2a1b12" />
      <path
        d="M130 110l-14 12M148 108l-2 16M170 110l12 14M130 110l-14-8M170 110l14-8"
        stroke="#2a1b12"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
  hornet: (
    <>
      <ellipse cx="152" cy="110" rx="26" ry="11" fill="#d9a21b" />
      <path d="M140 100v20M152 99v22M164 100v20" stroke="#3a2406" strokeWidth="5" />
      <circle cx="124" cy="110" r="9" fill="#3a2406" />
      <path d="M148 100q4-30 26-26q-2 20-26 26z" fill="#e8e1d0" opacity=".7" />
    </>
  ),
};

export function BboxOverlay({ detection, hiveCode, minsAgo = 0 }) {
  if (!detection) return null;
  const kind = detection.kind || 'hornet';
  const label = `${detection.label} ${detection.conf}%`;
  const timeStr = `${minsAgo} phút trước`;

  return (
    <svg viewBox="0 0 300 200" role="img" aria-label={`Ảnh mẫu từ camera: ${detection.label}`}>
      <defs>
        <linearGradient id="detg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a14" />
          <stop offset="1" stopColor="#150e06" />
        </linearGradient>
        <pattern id="detp" width="26" height="30" patternUnits="userSpaceOnUse">
          <path
            d="M13 0l13 7.5v15L13 30 0 22.5v-15z"
            fill="none"
            stroke="#7a5a28"
            strokeOpacity=".45"
          />
        </pattern>
      </defs>
      <rect width="300" height="200" fill="url(#detg)" />
      <rect width="300" height="200" fill="url(#detp)" />
      {BODIES[kind]}
      <rect x="90" y="62" width="126" height="86" fill="none" stroke="#ff5a4d" strokeWidth="2.5" rx="3" />
      <rect x="90" y="44" width="126" height="18" fill="#ff5a4d" rx="2" />
      <text x="96" y="57" fontSize="11" fontWeight="700" fill="#fff" fontFamily="sans-serif">
        {label}
      </text>
      <text x="10" y="190" fontSize="10" fill="#e8d9b8" fontFamily="monospace">
        CAM-{hiveCode || '001'} · {timeStr}
      </text>
      <circle cx="284" cy="186" r="4" fill="#ff5a4d" />
    </svg>
  );
}
