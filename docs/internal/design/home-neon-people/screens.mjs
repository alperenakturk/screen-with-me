// TH3 screen ideas (Design, 15 Nov 2026): what the three device screens on the home art could show instead of today's
// sunset. Each is the inside of `<symbol id="hm-pic" viewBox="0 0 160 100">` in apps/web/src/home.ts, plain shapes, no
// images. The moving part (`.hm-move`) runs on the same 6 s clock as the progress bars, so all three screens show it at
// the same spot: the art's "same moment". prefers-reduced-motion keeps it still at its middle.
export const SCREENS = {
  // A: today's sunset (kept) + a hot-air balloon drifting across.
  balloon: `
    <rect width="160" height="100" fill="url(#hm-sky)"/>
    <circle cx="86" cy="38" r="15" fill="#fff3d6" opacity=".88"/>
    <path d="M0 74 Q40 54 82 70 T160 64 V100 H0Z" fill="#4b2f8f"/>
    <path d="M0 84 Q56 70 106 86 T160 80 V100 H0Z" fill="#2c1c63"/>
    <g class="hm-move" transform="translate(62 30)">
      <path d="M0 -14 C9 -14 13 -7 13 0 C13 7 5 11 3 15 H-3 C-5 11 -13 7 -13 0 C-13 -7 -9 -14 0 -14Z" fill="#ff6b5a"/>
      <path d="M0 -14 C4 -14 5 -7 5 0 C5 7 2 11 1.5 15 H-1.5 C-2 11 -5 7 -5 0 C-5 -7 -4 -14 0 -14Z" fill="#ffd27a"/>
      <path d="M-3 15 L-2.5 19 M3 15 L2.5 19" stroke="#3b2050" stroke-width=".8"/>
      <rect x="-3" y="19" width="6" height="4" rx="1" fill="#6b3f2a"/>
    </g>`,
  // B: a city at night: moon, skyline, windows; three windows light up in turn on the shared clock.
  city: `
    <rect width="160" height="100" fill="#1a1d48"/>
    <rect width="160" height="60" fill="#262a66" opacity=".7"/>
    <circle cx="124" cy="24" r="10" fill="#fff1c9"/>
    <circle cx="128" cy="21" r="9" fill="#262a66" opacity=".0"/>
    <g fill="#0f1130">
      <rect x="4" y="52" width="22" height="48"/><rect x="28" y="40" width="18" height="60"/><rect x="48" y="58" width="20" height="42"/>
      <rect x="70" y="34" width="16" height="66"/><rect x="88" y="50" width="24" height="50"/><rect x="114" y="44" width="18" height="56"/>
      <rect x="134" y="60" width="26" height="40"/>
    </g>
    <g fill="#ffc65a" opacity=".85">
      <rect x="9" y="60" width="4" height="4"/><rect x="17" y="72" width="4" height="4"/><rect x="33" y="48" width="4" height="4"/>
      <rect x="74" y="44" width="4" height="4"/><rect x="78" y="62" width="4" height="4"/><rect x="94" y="58" width="4" height="4"/>
      <rect x="104" y="70" width="4" height="4"/><rect x="119" y="52" width="4" height="4"/><rect x="140" y="68" width="4" height="4"/>
    </g>
    <g class="hm-move-windows" fill="#ffe7a8"><rect x="38" y="64" width="4" height="4"/><rect x="56" y="66" width="4" height="4"/><rect x="123" y="74" width="4" height="4"/></g>`,
  // C: a lake at dawn: hills, still water with the sun's reflection, a paper boat crossing.
  lake: `
    <defs><linearGradient id="hm-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd6e8"/><stop offset="1" stop-color="#ffd6a0"/></linearGradient></defs>
    <rect width="160" height="100" fill="url(#hm-dawn)"/>
    <circle cx="48" cy="46" r="11" fill="#fff6dc"/>
    <path d="M0 58 L30 36 L58 56 L92 28 L130 54 L160 40 V62 H0Z" fill="#3f7f8a"/>
    <path d="M0 60 Q50 52 100 60 T160 58 V62 H0Z" fill="#2e6470"/>
    <rect y="62" width="160" height="38" fill="#4a9bb0"/>
    <g fill="#fff6dc" opacity=".55"><rect x="40" y="66" width="16" height="2" rx="1"/><rect x="43" y="71" width="10" height="2" rx="1"/><rect x="45" y="76" width="6" height="2" rx="1"/></g>
    <g class="hm-move" transform="translate(96 70)"><path d="M-9 0 H9 L5 5 H-5Z" fill="#fffaf0"/><path d="M0 0 V-10 L6 -1Z" fill="#fffaf0"/><path d="M0 0 V-8 L-5 -1Z" fill="#e8dcc6"/></g>`,
};
