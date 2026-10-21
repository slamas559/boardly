// Drawn-by-hand pictures of the product for the landing page. They are illustrations of Boardly's real tools and
// layout (the tool rail, the listener count, the 3D solid card with its labelled sizes), not screenshots, so they
// stay sharp on any screen and never go out of date with a photo of someone else's data.

const INK = "#17181C";
const BLUE = "#2540D9";
const CORAL = "#E2492B";
const LEAF = "#1F9D6B";
const SUN = "#F2B01E";
const OCEAN = "#2E8FC9";
const LINE = "#E4E2DC";
const DOT = "#D6D3CB";
const HAND = "Caveat, 'Bradley Hand', cursive";
const SANS = "Figtree, system-ui, sans-serif";

function Cursor({ x, y, color, name }) {
  const w = name.length * 7.4 + 16;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L0 17 L4.6 12.9 L7.6 19.5 L10.4 18.2 L7.4 11.8 L13.2 11.5 Z" fill={color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="12" y="14" width={w} height="19" rx="4" fill={color} />
      <text x="20" y="27.4" fontFamily={SANS} fontSize="11.5" fontWeight="600" fill="#fff">{name}</text>
    </g>
  );
}

const railIcons = [
  "M6 5l4.6 11.4 2.2-4.4 4.4-2.2z", // pointer
  "M5 19l3.6-.8L18.8 8 16 5.2 5.8 15.4z", // pen
  "M6 6h12M12 6v12M9 18h6", // text
  "M5 6h14v12H5z", // shape
  "M4 18c3-12 5-12 8-3s5 3 8-9", // graph
];

/** The room as the host sees it: tools on the left, a graph and a 3D solid on the board, listeners drawing. */
export function HeroBoard({ animate = true }) {
  return (
    <svg viewBox="0 0 760 500" className="block h-auto w-full" role="img" aria-label="A Boardly room: a graph of a parabola, a 3D cone with its sizes marked, and two listeners' cursors on the board">
      <defs>
        <pattern id="hb-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.05" fill={DOT} /></pattern>
        <clipPath id="hb-clip"><rect x="0" y="44" width="760" height="456" /></clipPath>
        <style>{`
          .hb-draw { stroke-dasharray: 560; stroke-dashoffset: ${animate ? 560 : 0}; animation: hb-draw 1.8s .35s cubic-bezier(.4,.1,.2,1) forwards; }
          @keyframes hb-draw { to { stroke-dashoffset: 0; } }
          @media (prefers-reduced-motion: reduce) { .hb-draw { animation: none; stroke-dashoffset: 0; } }
        `}</style>
      </defs>

      <rect width="760" height="500" rx="10" fill="#fff" stroke="#CFCDC5" />
      {/* top bar */}
      <g>
        <path d="M0 44h760" stroke={LINE} />
        <text x="62" y="27" fontFamily={SANS} fontSize="13.5" fontWeight="650" fill={INK}>Quadratics · Week 3</text>
        <g transform="translate(16 10) scale(.75)">
          <rect width="32" height="32" rx="7" fill={BLUE} />
          <path d="M9 22.5V9.5h6.2c2.4 0 3.9 1.2 3.9 3.2 0 1.4-.8 2.4-2 2.8 1.6.3 2.6 1.4 2.6 3 0 2.2-1.7 4-4.4 4H9Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M21.5 24.2c1.6-1 3-2.6 3.6-5" stroke="#FF8A6B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
        <circle cx="590" cy="22" r="4" fill={LEAF} />
        <text x="602" y="26.5" fontFamily={SANS} fontSize="12.5" fill="#57554F">28 listening</text>
        <rect x="690" y="10" width="56" height="24" rx="5" fill="#F1F0EC" />
        <circle cx="704" cy="22" r="4.2" fill={CORAL} />
        <text x="713" y="26" fontFamily={SANS} fontSize="11" fontWeight="650" fill={INK}>Rec</text>
      </g>

      <g clipPath="url(#hb-clip)">
        <rect x="0" y="44" width="760" height="456" fill="url(#hb-dots)" />

        {/* tool rail */}
        <rect x="14" y="66" width="38" height="200" rx="8" fill="#fff" stroke={LINE} />
        {railIcons.map((d, i) => (
          <g key={i} transform={`translate(${19} ${72 + i * 38})`}>
            {i === 1 && <rect width="28" height="28" rx="6" fill={BLUE} />}
            <path d={d} transform="translate(2 2) scale(.96)" fill="none" stroke={i === 1 ? "#fff" : "#57554F"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}

        {/* the graph */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M96 300H470" stroke={INK} strokeWidth="2.4" />
          <path d="M458 292l12 8-12 8" stroke={INK} strokeWidth="2.4" />
          <path d="M290 430V92" stroke={INK} strokeWidth="2.4" />
          <path d="M282 106l8-12 8 12" stroke={INK} strokeWidth="2.4" />
          <path className="hb-draw" d="M122 118Q290 590 458 118" stroke={BLUE} strokeWidth="4.2" />
          <circle cx="290" cy="354" r="7" stroke={CORAL} strokeWidth="3" />
          <path d="M338 404 322 372" stroke={CORAL} strokeWidth="2.6" />
          <path d="M327 380l-6-10 11 1" stroke={CORAL} strokeWidth="2.6" />
          <circle cx="205" cy="300" r="4.6" fill={LEAF} stroke="none" />
          <circle cx="375" cy="300" r="4.6" fill={LEAF} stroke="none" />
        </g>
        <text x="340" y="418" fontFamily={HAND} fontSize="30" fontWeight="600" fill={CORAL}>vertex</text>
        <text x="96" y="84" fontFamily={HAND} fontSize="31" fontWeight="600" fill={INK}>f(x) = ax² + bx + c</text>
        <text x="132" y="290" fontFamily={HAND} fontSize="24" fontWeight="600" fill={LEAF}>roots</text>

        {/* a 3D solid card */}
        <g transform="translate(504 74)">
          <rect width="228" height="262" rx="10" fill="#fff" stroke={LINE} />
          <text x="16" y="26" fontFamily={SANS} fontSize="14" fontWeight="650" fill={INK}>Cone</text>
          <ellipse cx="114" cy="178" rx="62" ry="19" fill={BLUE} fillOpacity=".2" stroke={BLUE} strokeWidth="1.8" />
          <path d="M52 178L114 52l62 126" fill={BLUE} fillOpacity=".16" stroke={BLUE} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M52 178c8 22 112 22 124 0" fill={BLUE} fillOpacity=".38" stroke="none" />
          <path d="M114 52v126" stroke="#1C32B4" strokeWidth="1.6" strokeDasharray="5 4" />
          <path d="M114 178h62" stroke="#1C32B4" strokeWidth="2" />
          <circle cx="114" cy="52" r="3" fill="#1C32B4" />
          <g fontFamily={SANS} fontSize="11.5" fontWeight="650" fill="#1C32B4">
            <rect x="124" y="188" width="52" height="19" rx="5" fill="#fff" stroke="#1C32B4" />
            <text x="132" y="201.4">r = 2.5</text>
            <rect x="72" y="104" width="44" height="19" rx="5" fill="#fff" stroke="#1C32B4" />
            <text x="80" y="117.4">h = 6</text>
          </g>
          <path d="M12 226h204" stroke={LINE} />
          <text x="16" y="244" fontFamily={SANS} fontSize="11.5" fill="#57554F">Volume  V = ⅓πr²h</text>
          <text x="30" y="258" fontFamily={SANS} fontSize="11.5" fontWeight="650" fill={INK}>= 39.27 cm³</text>
        </g>

        {/* a listener has been let draw: a small ring on the cone card */}
        <circle cx="652" cy="346" r="15" fill="none" stroke={CORAL} strokeWidth="3" strokeLinecap="round" strokeDasharray="78 16" />
        <Cursor x={636} y={356} color={CORAL} name="Amaka" />
        <Cursor x={170} y={372} color={OCEAN} name="Tunde" />

        {/* page strip */}
        <g transform="translate(290 446)">
          <rect width="196" height="34" rx="8" fill="#fff" stroke={LINE} />
          <g fontFamily={SANS} fontSize="12" fill="#57554F">
            <text x="14" y="22">Page</text>
            <text x="48" y="22" fontWeight="650" fill={INK}>2 / 5</text>
          </g>
          <rect x="104" y="6" width="84" height="22" rx="5" fill="#E8F5EE" />
          <text x="114" y="21" fontFamily={SANS} fontSize="11" fontWeight="650" fill="#1F7A4D">Following</text>
        </g>
      </g>
    </svg>
  );
}

/** What a listener sees on a phone: the same board, following the host. */
export function PhoneListener() {
  return (
    <svg viewBox="0 0 170 340" className="block h-auto w-full" role="img" aria-label="The same board on a phone, following the host">
      <rect x="2" y="2" width="166" height="336" rx="26" fill="#17181C" />
      <rect x="9" y="9" width="152" height="322" rx="20" fill="#fff" />
      <rect x="62" y="15" width="46" height="9" rx="4.5" fill="#17181C" />
      <rect x="18" y="36" width="134" height="22" rx="6" fill="#F8F7F4" stroke={LINE} />
      <text x="26" y="51" fontFamily={SANS} fontSize="10.5" fontWeight="650" fill={INK}>Quadratics</text>
      <circle cx="116" cy="47" r="3" fill={LEAF} />
      <text x="123" y="51" fontFamily={SANS} fontSize="9.5" fill="#57554F">live</text>
      <rect x="9" y="64" width="152" height="196" fill="#fff" />
      <pattern id="ph-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r=".9" fill={DOT} /></pattern>
      <rect x="9" y="64" width="152" height="196" fill="url(#ph-dots)" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 170H146" stroke={INK} strokeWidth="1.8" />
        <path d="M86 248V76" stroke={INK} strokeWidth="1.8" />
        <path d="M30 84Q86 330 142 84" stroke={BLUE} strokeWidth="3" />
        <circle cx="86" cy="206" r="5" stroke={CORAL} strokeWidth="2.2" />
      </g>
      <text x="92" y="236" fontFamily={HAND} fontSize="17" fontWeight="600" fill={CORAL}>vertex</text>
      <rect x="18" y="270" width="92" height="26" rx="13" fill="#E8F5EE" />
      <circle cx="31" cy="283" r="3.4" fill={LEAF} />
      <text x="39" y="287" fontFamily={SANS} fontSize="10" fontWeight="650" fill="#1F7A4D">Following host</text>
      <rect x="116" y="270" width="38" height="26" rx="13" fill={BLUE} />
      <text x="127" y="287" fontFamily={SANS} fontSize="10" fontWeight="650" fill="#fff">Ask</text>
      <rect x="62" y="318" width="46" height="4" rx="2" fill="#CFCDC5" />
    </svg>
  );
}

/** Maths on the board: a graph with its function, an equation, and a solid. Used in the feature section. */
export function MathArt() {
  return (
    <svg viewBox="0 0 560 300" className="block h-auto w-full" aria-hidden="true">
      <defs><pattern id="ma-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.4" cy="1.4" r="1" fill={DOT} /></pattern></defs>
      <rect width="560" height="300" rx="8" fill="#fff" stroke={LINE} />
      <rect width="560" height="300" rx="8" fill="url(#ma-dots)" />
      {/* graph card */}
      <g transform="translate(18 18)">
        <rect width="262" height="264" rx="8" fill="#fff" stroke={LINE} />
        <g stroke="#E9E7E1">{[0, 1, 2, 3, 4, 5].map((i) => <path key={`v${i}`} d={`M${30 + i * 40} 36V220`} />)}{[0, 1, 2, 3, 4].map((i) => <path key={`h${i}`} d={`M20 ${48 + i * 40}H246`} />)}</g>
        <path d="M20 128H246" stroke={INK} strokeWidth="1.6" />
        <path d="M130 36V222" stroke={INK} strokeWidth="1.6" />
        <path d="M24 214C70 40 100 40 130 128S200 216 244 46" fill="none" stroke={BLUE} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M24 140C70 190 100 190 130 128S200 60 244 150" fill="none" stroke={CORAL} strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1 0" />
        <circle cx="20" cy="19" r="4" fill={BLUE} /><text x="30" y="23" fontFamily={SANS} fontSize="11.5" fill="#57554F">f(x)</text><circle cx="68" cy="19" r="4" fill={CORAL} /><text x="78" y="23" fontFamily={SANS} fontSize="11.5" fill="#57554F">g(x)</text>
        <rect x="14" y="232" width="234" height="22" rx="5" fill="#F8F7F4" />
        <text x="22" y="247" fontFamily={SANS} fontSize="10.5" fill="#57554F">a</text>
        <path d="M34 243h118" stroke="#CFCDC5" strokeWidth="2" strokeLinecap="round" /><circle cx="96" cy="243" r="5" fill={BLUE} />
        <text x="164" y="247" fontFamily={SANS} fontSize="10.5" fontWeight="650" fill={INK}>a = 1.4</text>
      </g>
      {/* equation */}
      <g transform="translate(298 22)">
        <rect width="244" height="92" rx="8" fill="#fff" stroke={LINE} />
        <text x="22" y="56" fontFamily="'Times New Roman', serif" fontStyle="italic" fontSize="26" fill={INK}>x</text>
        <text x="46" y="56" fontFamily="'Times New Roman', serif" fontSize="26" fill={INK}>=</text>
        <path d="M78 52h140" stroke={INK} strokeWidth="1.5" />
        <text x="148" y="42" fontFamily="'Times New Roman', serif" fontSize="19" fill={INK} textAnchor="middle">−b ± √(b² − 4ac)</text>
        <text x="148" y="72" fontFamily="'Times New Roman', serif" fontSize="19" fill={INK} textAnchor="middle">2a</text>
      </g>
      {/* a spun shape */}
      <g transform="translate(298 128)">
        <rect width="244" height="154" rx="8" fill="#fff" stroke={LINE} />
        <path d="M30 112 30 40 62 76 30 112Z" fill={BLUE} fillOpacity=".14" stroke={BLUE} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M30 38V116" stroke={CORAL} strokeWidth="1.6" strokeDasharray="4 3" />
        <path d="M78 76h22" stroke="#57554F" strokeWidth="1.6" strokeLinecap="round" /><path d="M94 70l8 6-8 6" fill="none" stroke="#57554F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="176" cy="112" rx="44" ry="12" fill={BLUE} fillOpacity=".2" stroke={BLUE} strokeWidth="1.6" />
        <path d="M132 112L176 32l44 80" fill={BLUE} fillOpacity=".14" stroke={BLUE} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M132 112c6 16 82 16 88 0" fill={BLUE} fillOpacity=".36" stroke="none" />
        <text x="14" y="144" fontFamily={SANS} fontSize="10.5" fill="#57554F">draw a shape, spin it around an axis</text>
      </g>
    </svg>
  );
}

/** A scatter plot from a data file. */
export function ChartArt() {
  const pts = [[44, 176], [70, 160], [92, 168], [118, 132], [142, 126], [160, 102], [188, 108], [210, 76], [236, 82], [258, 52]];
  return (
    <svg viewBox="0 0 300 220" className="block h-auto w-full" aria-hidden="true">
      <rect width="300" height="220" rx="8" fill="#fff" stroke="#C8E8D8" />
      <g stroke="#E6F2EC">{[0, 1, 2, 3].map((i) => <path key={i} d={`M30 ${46 + i * 42}H284`} />)}</g>
      <path d="M30 192H284M30 192V30" stroke={INK} strokeWidth="1.6" fill="none" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5.4" fill={LEAF} fillOpacity=".85" stroke="#fff" strokeWidth="1.4" />)}
      <text x="150" y="212" fontFamily={SANS} fontSize="10.5" fill="#57554F" textAnchor="middle">Hours studied</text>
      <text transform="translate(12 112) rotate(-90)" fontFamily={SANS} fontSize="10.5" fill="#57554F" textAnchor="middle">Exam score</text>
      <g transform="translate(168 8)">
        <rect width="122" height="24" rx="6" fill="#F3FAF6" stroke="#C8E8D8" />
        <path d="M8 5h7l4 4v11H8zM15 5v4h4" fill="none" stroke={LEAF} strokeWidth="1.4" strokeLinejoin="round" transform="translate(-1 -1) scale(.9)" />
        <text x="26" y="16.4" fontFamily={SANS} fontSize="10.5" fontWeight="650" fill="#166C49">scores.xlsx</text>
      </g>
    </svg>
  );
}

/** A PDF page marked up live. */
export function PdfArt() {
  return (
    <svg viewBox="0 0 300 250" className="block h-auto w-full" aria-hidden="true">
      <rect width="300" height="250" rx="8" fill="#fff" stroke="#C6E2F3" />
      <rect x="40" y="16" width="220" height="218" rx="3" fill="#fff" stroke={LINE} />
      <rect x="58" y="34" width="110" height="8" rx="2" fill="#17181C" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <rect key={i} x="58" y={58 + i * 15} width={i === 4 || i === 9 ? 128 : 184} height="5" rx="2.5" fill="#E1DFD8" />)}
      <rect x="58" y="86" width="150" height="12" rx="2" fill={SUN} fillOpacity=".5" />
      <path d="M58 135q20-6 40 0t40 0 40 0" fill="none" stroke={CORAL} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M150 176c18-22 46-30 66-14" fill="none" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M209 154l9 7-11 3" fill="none" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="132" y="204" fontFamily={HAND} fontSize="22" fontWeight="600" fill={BLUE}>key step</text>
      <g transform="translate(212 24)"><rect width="46" height="20" rx="5" fill="#E8F3FA" stroke="#C6E2F3" /><text x="10" y="14" fontFamily={SANS} fontSize="10.5" fontWeight="650" fill="#1B6693">p. 4</text></g>
    </svg>
  );
}

/** The host's view and a listener's view: same board, the listener looks around, then jumps back. */
export function FollowArt() {
  return (
    <svg viewBox="0 0 520 220" className="block h-auto w-full" aria-hidden="true">
      <defs><pattern id="fa-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.3" cy="1.3" r=".95" fill={DOT} /></pattern></defs>
      <rect width="520" height="220" rx="8" fill="#fff" stroke={LINE} />
      <rect x="18" y="18" width="484" height="150" rx="6" fill="url(#fa-dots)" stroke={LINE} />
      {/* the whole board */}
      <path d="M52 132c24-70 54-70 78 0M168 66h70v44h-70zM262 120c34-44 64-44 100 0M392 60h64M392 80h40" fill="none" stroke="#B9B6AD" strokeWidth="2.4" strokeLinecap="round" />
      {/* host view */}
      <rect x="40" y="38" width="120" height="104" rx="4" fill="none" stroke={BLUE} strokeWidth="2.2" />
      <rect x="40" y="25" width="68" height="14" rx="3" fill={BLUE} /><text x="46" y="35.5" fontFamily={SANS} fontSize="9.5" fontWeight="650" fill="#fff">Host's view</text>
      {/* listener has wandered */}
      <rect x="248" y="52" width="120" height="104" rx="4" fill="none" stroke={CORAL} strokeWidth="2.2" strokeDasharray="6 4" />
      <rect x="248" y="39" width="84" height="14" rx="3" fill={CORAL} /><text x="254" y="49.5" fontFamily={SANS} fontSize="9.5" fontWeight="650" fill="#fff">Looking around</text>
      <path d="M232 92C214 60 190 56 168 74" fill="none" stroke={CORAL} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 5" />
      <path d="M176 66l-10 7 12 3" fill="none" stroke={CORAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(380 178)"><rect width="122" height="30" rx="15" fill={LEAF} /><text x="14" y="19.5" fontFamily={SANS} fontSize="11.5" fontWeight="650" fill="#fff">Back to host</text><path d="M101 15h10m-4-4 4 4-4 4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  );
}

/** Voice with captions, and a listener allowed to speak. */
export function VoiceArt() {
  const bars = [10, 22, 34, 18, 40, 26, 14, 30, 44, 20, 12, 28, 36, 16, 24];
  return (
    <svg viewBox="0 0 520 190" className="block h-auto w-full" aria-hidden="true">
      <rect width="520" height="190" rx="8" fill="#fff" stroke="#FDE9A8" />
      <g transform="translate(20 22)">
        <circle cx="20" cy="20" r="20" fill={BLUE} />
        <path d="M20 11a4.2 4.2 0 0 1 4.2 4.2V20a4.2 4.2 0 0 1-8.4 0v-4.8A4.2 4.2 0 0 1 20 11Zm-7 9a7 7 0 0 0 14 0m-7 7v4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <text x="50" y="17" fontFamily={SANS} fontSize="12.5" fontWeight="650" fill={INK}>You</text>
        <g transform="translate(50 24)">{bars.map((h, i) => <rect key={i} x={i * 10} y={(34 - h) / 2} width="5" height={h} rx="2.5" fill={BLUE} opacity={0.35 + (i % 4) * 0.18} />)}</g>
      </g>
      <g transform="translate(250 22)">
        <circle cx="20" cy="20" r="20" fill={CORAL} />
        <text x="13" y="26" fontFamily={SANS} fontSize="16" fontWeight="700" fill="#fff">A</text>
        <text x="50" y="17" fontFamily={SANS} fontSize="12.5" fontWeight="650" fill={INK}>Amaka</text>
        <rect x="104" y="5" width="86" height="17" rx="8.5" fill="#FFF6DC" /><text x="112" y="17" fontFamily={SANS} fontSize="10" fontWeight="650" fill="#8A5D00">allowed to speak</text>
        <g transform="translate(50 24)">{bars.slice(0, 11).map((h, i) => <rect key={i} x={i * 10} y={(34 - h * 0.7) / 2} width="5" height={h * 0.7} rx="2.5" fill={CORAL} opacity={0.35 + ((i + 2) % 4) * 0.18} />)}</g>
      </g>
      <rect x="20" y="100" width="480" height="66" rx="8" fill="#17181C" />
      <text x="36" y="124" fontFamily={SANS} fontSize="10.5" fontWeight="650" fill="#F2B01E">LIVE CAPTIONS</text>
      <text x="36" y="146" fontFamily={SANS} fontSize="14" fill="#fff">…so the roots are where the curve crosses the x-axis.</text>
    </svg>
  );
}
