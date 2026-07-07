/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Beautiful, animated SVG presets encoded as Data URLs.
// Using @keyframes animations embedded directly inside the SVG so they play inside standard <img> tags.

const CAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="bgCat" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#311042"/>
    </linearGradient>
  </defs>
  <style>
    @keyframes catWiggle {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-8deg); }
    }
    @keyframes catWiggleRight {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(8deg); }
    }
    @keyframes catBlink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }
    .left-ear { animation: catWiggle 2.8s ease-in-out infinite; transform-origin: 35px 35px; }
    .right-ear { animation: catWiggleRight 3s ease-in-out infinite; transform-origin: 65px 35px; }
    .eye { animation: catBlink 4.2s ease-in-out infinite; transform-origin: 50px 52px; }
  </style>
  <rect width="100" height="100" rx="30" fill="url(#bgCat)"/>
  <path d="M25,85 C25,65 75,65 75,85" fill="#f43f5e" opacity="0.85"/>
  <polygon points="25,45 33,18 48,38" fill="#f1f5f9" class="left-ear"/>
  <polygon points="25,45 29,28 39,38" fill="#fda4af" class="left-ear"/>
  <polygon points="75,45 67,18 52,38" fill="#f1f5f9" class="right-ear"/>
  <polygon points="75,45 71,28 61,38" fill="#fda4af" class="right-ear"/>
  <circle cx="50" cy="55" r="22" fill="#f1f5f9"/>
  <ellipse cx="42" cy="52" rx="3" ry="4" fill="#0f172a" class="eye"/>
  <ellipse cx="58" cy="52" rx="3" ry="4" fill="#0f172a" class="eye"/>
  <polygon points="50,58 48,56 52,56" fill="#f43f5e"/>
  <path d="M47,61 C48.5,63 50,61 50,61 C50,61 51.5,63 53,61" stroke="#0f172a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`;

const PANDA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="bgPanda" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
  </defs>
  <style>
    @keyframes earRotate {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15) rotate(5deg); }
    }
    @keyframes earRotateRight {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15) rotate(-5deg); }
    }
    @keyframes pandaBlink {
      0%, 92%, 100% { transform: scaleY(1); }
      96% { transform: scaleY(0.1); }
    }
    .left-ear { animation: earRotate 4.2s ease-in-out infinite; transform-origin: 28px 30px; }
    .right-ear { animation: earRotateRight 4s ease-in-out infinite; transform-origin: 72px 30px; }
    .eye-pupil { animation: pandaBlink 3.8s ease-in-out infinite; transform-origin: 50px 51px; }
  </style>
  <rect width="100" height="100" rx="30" fill="url(#bgPanda)"/>
  <circle cx="28" cy="30" r="11" fill="#1e293b" class="left-ear"/>
  <circle cx="72" cy="30" r="11" fill="#1e293b" class="right-ear"/>
  <circle cx="50" cy="55" r="24" fill="#ffffff"/>
  <ellipse cx="40" cy="52" rx="7" ry="5" fill="#1e293b" transform="rotate(-15 40 52)"/>
  <ellipse cx="60" cy="52" rx="7" ry="5" fill="#1e293b" transform="rotate(15 60 52)"/>
  <circle cx="41" cy="51" r="2.5" fill="#ffffff" class="eye-pupil"/>
  <circle cx="59" cy="51" r="2.5" fill="#ffffff" class="eye-pupil"/>
  <ellipse cx="50" cy="58" rx="3" ry="2" fill="#0f172a"/>
  <path d="M47,62 C49,64 50,62 50,62 C50,62 51,64 53,62" stroke="#0f172a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`;

const OWL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="bgOwl" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#311042"/>
      <stop offset="100%" stop-color="#120c1f"/>
    </linearGradient>
  </defs>
  <style>
    @keyframes owlTilt {
      0%, 100% { transform: rotate(0deg); }
      33% { transform: rotate(-5deg); }
      66% { transform: rotate(5deg); }
    }
    @keyframes owlEyeBlink {
      0%, 94%, 100% { transform: scaleY(1); }
      97% { transform: scaleY(0.1); }
    }
    .owl-head { animation: owlTilt 5.5s ease-in-out infinite; transform-origin: 50px 50px; }
    .owl-eye { animation: owlEyeBlink 4.8s ease-in-out infinite; transform-origin: 50px 45px; }
  </style>
  <rect width="100" height="100" rx="30" fill="url(#bgOwl)"/>
  <g class="owl-head">
    <polygon points="28,24 40,31 30,44" fill="#f97316"/>
    <polygon points="72,24 60,31 70,44" fill="#f97316"/>
    <circle cx="50" cy="55" r="22" fill="#ea580c"/>
    <path d="M38,55 C38,42 62,42 62,55 C62,65 38,65 38,55" fill="#ffedd5"/>
    <circle cx="41" cy="45" r="8" fill="#ffffff"/>
    <circle cx="59" cy="45" r="8" fill="#ffffff"/>
    <circle cx="41" cy="45" r="4" fill="#0f172a" class="owl-eye"/>
    <circle cx="59" cy="45" r="4" fill="#0f172a" class="owl-eye"/>
    <polygon points="50,48 46,54 54,54" fill="#e11d48"/>
  </g>
</svg>`;

const DOCTOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="bgDoc" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <style>
    @keyframes docBob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @keyframes docShine {
      0%, 80%, 100% { opacity: 0.15; }
      90% { opacity: 0.95; }
    }
    .head-grp { animation: docBob 3.8s ease-in-out infinite; transform-origin: 50px 46px; }
    .shine-gls { animation: docShine 3.2s ease-in-out infinite; }
  </style>
  <rect width="100" height="100" rx="30" fill="url(#bgDoc)"/>
  <path d="M25,88 L75,88 L70,68 C70,64 62,62 50,62 C38,62 30,64 30,68 Z" fill="#f8fafc"/>
  <path d="M50,62 L42,75 L50,88 L58,75 Z" fill="#38bdf8"/>
  <polygon points="48,78 52,78 53,85 50,88 47,85" fill="#f43f5e"/>
  <g class="head-grp">
    <path d="M32,45 C30,30 70,30 68,45 Z" fill="#1e293b"/>
    <circle cx="50" cy="46" r="16" fill="#ffeedd"/>
    <circle cx="39" cy="50" r="2.5" fill="#f43f5e" opacity="0.4"/>
    <circle cx="61" cy="50" r="2.5" fill="#f43f5e" opacity="0.4"/>
    <circle cx="43" cy="45" r="1.5" fill="#0f172a"/>
    <circle cx="57" cy="45" r="1.5" fill="#0f172a"/>
    <path d="M47,51 C48,53 52,53 53,51" stroke="#0f172a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <circle cx="43" cy="45" r="5" stroke="#38bdf8" stroke-width="1.5" fill="none"/>
    <circle cx="57" cy="45" r="5" stroke="#38bdf8" stroke-width="1.5" fill="none"/>
    <line x1="48" y1="45" x2="52" y2="45" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="41,42 45,42 43,46" fill="#ffffff" class="shine-gls" opacity="0.3"/>
    <polygon points="55,42 59,42 57,46" fill="#ffffff" class="shine-gls" opacity="0.3"/>
  </g>
</svg>`;

const PROG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="bgProg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#075985"/>
    </linearGradient>
  </defs>
  <style>
    @keyframes progBob {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-2px) rotate(1deg); }
    }
    .head-grp { animation: progBob 4.5s ease-in-out infinite; transform-origin: 50px 46px; }
  </style>
  <rect width="100" height="100" rx="30" fill="url(#bgProg)"/>
  <path d="M22,90 L78,90 L72,70 C72,66 64,64 50,64 C36,64 28,66 28,70 Z" fill="#0f172a"/>
  <path d="M34,44 C34,26 66,26 66,44 Z" fill="#ea580c"/>
  <circle cx="50" cy="46" r="16" fill="#fbcfe8"/>
  <path d="M34,40 C36,36 44,36 46,40" stroke="#ea580c" stroke-width="3" fill="none"/>
  <path d="M54,40 C56,36 64,36 66,40" stroke="#ea580c" stroke-width="3" fill="none"/>
  <ellipse cx="43" cy="45" rx="3" ry="4" fill="#020617"/>
  <ellipse cx="57" cy="45" rx="3" ry="4" fill="#020617"/>
  <circle cx="44" cy="44" r="1" fill="#ffffff"/>
  <circle cx="58" cy="44" r="1" fill="#ffffff"/>
  <path d="M46,52 C48,55 52,55 54,52" stroke="#020617" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`;

const FOX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="bgFox" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
  </defs>
  <style>
    @keyframes foxWiggle {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-5deg); }
    }
    @keyframes foxWiggleRight {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(5deg); }
    }
    @keyframes foxBlink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }
    .left-ear { animation: foxWiggle 3.2s ease-in-out infinite; transform-origin: 30px 40px; }
    .right-ear { animation: foxWiggleRight 3.4s ease-in-out infinite; transform-origin: 70px 40px; }
    .eye { animation: foxBlink 4.5s ease-in-out infinite; transform-origin: 50px 52px; }
  </style>
  <rect width="100" height="100" rx="30" fill="url(#bgFox)"/>
  <polygon points="15,40 28,15 45,35" fill="#ea580c" class="left-ear"/>
  <polygon points="15,40 23,25 35,35" fill="#f3f4f6" class="left-ear"/>
  <polygon points="85,40 72,15 55,35" fill="#ea580c" class="right-ear"/>
  <polygon points="85,40 77,25 65,35" fill="#f3f4f6" class="right-ear"/>
  <circle cx="50" cy="55" r="22" fill="#ea580c"/>
  <path d="M28,55 C28,55 50,75 50,75 C50,75 72,55 72,55 C72,55 60,78 50,78 C40,78 28,55 28,55" fill="#ffffff"/>
  <ellipse cx="42" cy="52" rx="3" ry="4" fill="#1e293b" class="eye"/>
  <ellipse cx="58" cy="52" rx="3" ry="4" fill="#1e293b" class="eye"/>
  <circle cx="50" cy="74" r="3.5" fill="#000000"/>
</svg>`;

export const ANIMATED_AVATARS = [
  { id: 'cat', name: 'Playful Kitten', svg: CAT_SVG },
  { id: 'panda', name: 'Sleepy Panda', svg: PANDA_SVG },
  { id: 'owl', name: 'Wise Counselor', svg: OWL_SVG },
  { id: 'doctor', name: 'Slick Practitioner', svg: DOCTOR_SVG },
  { id: 'programmer', name: 'Innovator Fellow', svg: PROG_SVG },
  { id: 'fox', name: 'Cunning Biometrist', svg: FOX_SVG },
];

export function convertSvgToDataUrl(svgString: string): string {
  const cleanSvg = svgString.trim().replace(/\s+/g, ' ');
  return `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
}

export const ANIMATED_AVATAR_PRESETS = ANIMATED_AVATARS.map((item) => ({
  id: item.id,
  name: item.name,
  url: convertSvgToDataUrl(item.svg),
}));
