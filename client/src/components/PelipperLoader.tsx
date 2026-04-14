import React from 'react';

interface PelipperLoaderProps {
  size?: number;
  darkMode?: boolean;
}

const KEYFRAMES = `
@keyframes pelipperFlyIn {
  from { transform: translateX(-160vw); }
  to   { transform: translateX(0); }
}
@keyframes pelipperHover {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-10px); }
}
@keyframes pelipperWingL {
  0%, 100% { transform: rotate(0deg); }
  50%       { transform: rotate(-18deg); }
}
@keyframes pelipperWingR {
  0%, 100% { transform: rotate(0deg); }
  50%       { transform: rotate(18deg); }
}
`;

export function PelipperLoader({ size = 120, darkMode = false }: PelipperLoaderProps) {
  const outline   = darkMode ? '#e2e8f0' : '#334155';
  const bodyFill  = darkMode ? '#e2e8f0' : 'white';
  const wingFill  = darkMode ? '#7BA7C7' : '#5E8FB5';
  const eyeFill   = darkMode ? '#1e293b' : '#0f172a';
  const eyeShine  = darkMode ? '#e2e8f0' : 'white';
  const footCol   = darkMode ? '#fb923c' : '#F97316';
  const beakPouch = darkMode ? '#60a5fa' : '#4A9FD4';

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Phase 1: fly in from left, stop at center */}
      <div style={{
        display: 'inline-block',
        animation: 'pelipperFlyIn 1.2s ease-out forwards',
      }}>
        {/* Phase 2: gentle hover bob, starts after fly-in */}
        <div style={{
          display: 'inline-block',
          animation: 'pelipperHover 1.6s ease-in-out 1.2s infinite',
        }}>
          <svg
            width={size}
            height={size * 1.15}
            viewBox="0 0 100 115"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left wing */}
            <path
              d="M 25 50 Q 2 38 4 58 Q 10 68 28 60 Z"
              fill={wingFill}
              stroke={outline}
              strokeWidth="1.5"
              strokeLinejoin="round"
              style={{
                transformOrigin: '27px 55px',
                animation: 'pelipperWingL 0.55s ease-in-out infinite',
              }}
            />
            {/* Right wing */}
            <path
              d="M 75 50 Q 98 38 96 58 Q 90 68 72 60 Z"
              fill={wingFill}
              stroke={outline}
              strokeWidth="1.5"
              strokeLinejoin="round"
              style={{
                transformOrigin: '73px 55px',
                animation: 'pelipperWingR 0.55s ease-in-out infinite',
                animationDelay: '0.275s',
              }}
            />
            {/* Body */}
            <ellipse cx="50" cy="40" rx="26" ry="24" fill={bodyFill} stroke={outline} strokeWidth="2"/>
            {/* Upper beak */}
            <path
              d="M 37 52 L 50 46 L 63 52 Q 56 50 50 50 Q 44 50 37 52 Z"
              fill="#E0F0FF"
              stroke={outline}
              strokeWidth="1"
            />
            {/* Beak pouch */}
            <path
              d="M 37 52 Q 30 68 50 82 Q 70 68 63 52 Q 56 60 50 62 Q 44 60 37 52 Z"
              fill={beakPouch}
              stroke={outline}
              strokeWidth="2"
            />
            {/* Pouch shine */}
            <ellipse cx="50" cy="68" rx="6" ry="5" fill="rgba(255,255,255,0.25)"/>
            {/* Left eye */}
            <circle cx="37" cy="33" r="5.5" fill={eyeFill}/>
            <circle cx="38.5" cy="31.5" r="1.8" fill={eyeShine}/>
            {/* Right eye */}
            <circle cx="63" cy="33" r="5.5" fill={eyeFill}/>
            <circle cx="64.5" cy="31.5" r="1.8" fill={eyeShine}/>
            {/* Left foot */}
            <path
              d="M 44 79 L 42 88 M 42 88 L 38 93 M 42 88 L 42 94 M 42 88 L 46 93"
              stroke={footCol}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Right foot */}
            <path
              d="M 56 79 L 58 88 M 58 88 L 54 93 M 58 88 L 58 94 M 58 88 L 62 93"
              stroke={footCol}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </>
  );
}
