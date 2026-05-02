interface Props {
  size?: number
  className?: string
}

const D = '#0E1520'
const C = '#1C2E3A'
const BODY_MID = '#9CCAF4'

function Sparkle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const d = r * 0.5
  return (
    <g>
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#FFE040" strokeWidth={r * 0.38} strokeLinecap="round" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#FFE040" strokeWidth={r * 0.38} strokeLinecap="round" />
      <line x1={cx - d} y1={cy - d} x2={cx + d} y2={cy + d} stroke="#FFE040" strokeWidth={r * 0.26} strokeLinecap="round" />
      <line x1={cx + d} y1={cy - d} x2={cx - d} y2={cy + d} stroke="#FFE040" strokeWidth={r * 0.26} strokeLinecap="round" />
    </g>
  )
}

function OpenEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={18} fill="white" />
      <circle cx={cx} cy={cy + 1} r={13} fill={D} />
      <circle cx={cx + 5} cy={cy - 5} r={5.5} fill="white" />
      <circle cx={cx + 1} cy={cy + 5} r={2} fill="rgba(255,255,255,0.45)" />
    </g>
  )
}

function WinkEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      d={`M ${cx - 16} ${cy} Q ${cx} ${cy - 10} ${cx + 16} ${cy}`}
      stroke={D}
      strokeWidth="4.5"
      fill="none"
      strokeLinecap="round"
    />
  )
}

export function MascotCameraSvg({ size = 120, className }: Props) {
  const gid = 'mbg-camera'

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={Math.round(size * 1.2)}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={gid} cx="33%" cy="27%" r="72%">
          <stop offset="0%" stopColor="#E4F4FF" />
          <stop offset="40%" stopColor="#A8CFF4" />
          <stop offset="100%" stopColor="#6AAAE8" />
        </radialGradient>
        {/* Phone screen reflection */}
        <linearGradient id="phone-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2A2A40" />
          <stop offset="100%" stopColor="#10101E" />
        </linearGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse cx="100" cy="220" rx="62" ry="10" fill="rgba(0,0,0,0.08)" />

      {/* Feet */}
      <circle cx="74" cy="206" r="20" fill="#6AAAE8" opacity="0.6" />
      <circle cx="126" cy="206" r="20" fill="#6AAAE8" opacity="0.6" />
      <circle cx="66" cy="208" r="5" fill="#5090C8" opacity="0.5" />
      <circle cx="76" cy="212" r="5" fill="#5090C8" opacity="0.5" />
      <circle cx="118" cy="212" r="5" fill="#5090C8" opacity="0.5" />
      <circle cx="128" cy="208" r="5" fill="#5090C8" opacity="0.5" />

      {/* Right arm — behind body */}
      <ellipse cx="168" cy="110" rx="22" ry="13" fill={BODY_MID} transform="rotate(46 168 110)" />

      {/* Body */}
      <circle cx="100" cy="126" r="78" fill={`url(#${gid})`} />

      {/* Glossy highlights */}
      <circle cx="80" cy="82" r="22" fill="rgba(255,255,255,0.72)" />
      <circle cx="94" cy="96" r="12" fill="rgba(255,255,255,0.5)" />
      <circle cx="115" cy="88" r="7" fill="rgba(255,255,255,0.38)" />
      <circle cx="130" cy="100" r="5" fill="rgba(255,255,255,0.3)" />
      <circle cx="70" cy="110" r="4.5" fill="rgba(255,255,255,0.3)" />
      <circle cx="68" cy="158" r="5" fill="rgba(255,255,255,0.35)" />
      <circle cx="79" cy="168" r="3.5" fill="rgba(255,255,255,0.27)" />
      <circle cx="128" cy="154" r="4.5" fill="rgba(255,255,255,0.28)" />

      {/* Blush cheeks */}
      <circle cx="60" cy="120" r="13" fill="#FFB0C0" opacity={0.32} />
      <circle cx="140" cy="120" r="13" fill="#FFB0C0" opacity={0.32} />

      {/* Eyes: wink left, open right */}
      <WinkEye cx={76} cy={104} />
      <OpenEye cx={124} cy={104} />

      {/* Mouth: happy open */}
      <g>
        <path d={`M 79 136 Q 79 162 100 163 Q 121 162 121 136 Z`} fill={C} />
        <path d={`M 82 137 Q 82 158 100 159 Q 118 158 118 137 Z`} fill="#E03050" />
        <path d={`M 82 143 L 118 143`} stroke="white" strokeWidth="4.5" strokeLinecap="round" opacity="0.92" />
        <path d={`M 79 136 Q 100 132 121 136`} stroke={C} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Hand (right, in front of body) */}
      <circle cx="178" cy="93" r="15" fill={BODY_MID} />

      {/* Phone — rotated, held up to face level */}
      <g transform="rotate(-22 158 72)">
        {/* Phone body */}
        <rect x="143" y="48" width="30" height="48" rx="5" fill="url(#phone-grad)" />
        {/* Phone rim highlight */}
        <rect x="143" y="48" width="30" height="48" rx="5" fill="none" stroke="#3A3A58" strokeWidth="1.5" />
        {/* Side button */}
        <rect x="173" y="64" width="2.5" height="10" rx="1.5" fill="#2A2A42" />
        {/* Camera module — dark bump */}
        <rect x="148" y="55" width="20" height="18" rx="3.5" fill="#0C0C1A" />
        <rect x="148" y="55" width="20" height="18" rx="3.5" fill="none" stroke="#1E1E30" strokeWidth="1" />
        {/* Lens 1 (main) */}
        <circle cx="155" cy="62" r="6" fill="#08080E" />
        <circle cx="155" cy="62" r="4" fill="#04040A" />
        {/* Lens 1 reflections */}
        <circle cx="157" cy="60" r="1.8" fill="rgba(255,255,255,0.6)" />
        <circle cx="153" cy="64" r="0.8" fill="rgba(255,255,255,0.25)" />
        {/* Lens 2 */}
        <circle cx="163" cy="62" r="4.5" fill="#08080E" />
        <circle cx="163" cy="62" r="2.8" fill="#04040A" />
        <circle cx="164.5" cy="60.5" r="1.2" fill="rgba(255,255,255,0.55)" />
        {/* Flash */}
        <circle cx="158" cy="71" r="2" fill="#B0B0C8" />
        <circle cx="158" cy="71" r="1" fill="#D8D8F0" />
      </g>

      {/* Sparkle */}
      <Sparkle cx={44} cy={76} r={10} />
      <Sparkle cx={34} cy={58} r={7} />
    </svg>
  )
}
