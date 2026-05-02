export type MascotMood = 'neutral' | 'happy' | 'great' | 'sad' | 'thirsty' | 'excited' | 'cheer'

interface Props {
  mood?: MascotMood
  size?: number
  className?: string
}

const D = '#0E1520'     // dark (eyes, outline)
const C = '#1C2E3A'     // outline strokes

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

// Normal open eye
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

// Closed happy squint (^ shape)
function SquintEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      d={`M ${cx - 16} ${cy} Q ${cx} ${cy - 12} ${cx + 16} ${cy}`}
      stroke={D}
      strokeWidth="4.5"
      fill="none"
      strokeLinecap="round"
    />
  )
}

// Wink (closed, flat curve)
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

// Large sad puppy eye
function SadEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={21} fill="white" />
      <circle cx={cx} cy={cy} r={21} fill="#C0D8F4" opacity="0.3" />
      <circle cx={cx} cy={cy + 2} r={16} fill={D} />
      <circle cx={cx + 6} cy={cy - 6} r={6} fill="white" />
    </g>
  )
}

// Star-shaped pupil for excited mood
function StarEye({ cx, cy }: { cx: number; cy: number }) {
  const s = 10, sm = 4.5
  return (
    <g>
      <circle cx={cx} cy={cy} r={20} fill="white" />
      <path
        d={`M ${cx} ${cy - s} L ${cx + sm} ${cy - sm} L ${cx + s} ${cy} L ${cx + sm} ${cy + sm} L ${cx} ${cy + s} L ${cx - sm} ${cy + sm} L ${cx - s} ${cy} L ${cx - sm} ${cy - sm} Z`}
        fill={D}
      />
      <circle cx={cx + 6} cy={cy - 7} r={5} fill="white" />
    </g>
  )
}

// Open mouth with teeth — proper smile shape, not a round blob
function OpenMouth({ wide = false }: { wide?: boolean }) {
  const w = wide ? 46 : 40
  const lx = 100 - w / 2
  const rx = 100 + w / 2
  const MY = 136
  const depth = wide ? 30 : 24
  return (
    <g>
      {/* Upper lip line */}
      <path d={`M ${lx} ${MY} Q 100 ${MY - 4} ${rx} ${MY}`} stroke={C} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Mouth cavity */}
      <path d={`M ${lx} ${MY} Q ${lx} ${MY + depth} 100 ${MY + depth * 0.95} Q ${rx} ${MY + depth} ${rx} ${MY} Z`} fill={C} />
      {/* Inner tongue/gum */}
      <path d={`M ${lx + 3} ${MY + 1} Q ${lx + 3} ${MY + depth - 4} 100 ${MY + depth * 0.95 - 3} Q ${rx - 3} ${MY + depth - 4} ${rx - 3} ${MY + 1} Z`} fill="#E03050" />
      {/* Teeth line */}
      <path d={`M ${lx + 2} ${MY + 7} L ${rx - 2} ${MY + 7}`} stroke="white" strokeWidth="4.5" strokeLinecap="round" opacity="0.92" />
    </g>
  )
}

function renderEyes(mood: MascotMood) {
  const LX = 76, RX = 124, EY = 104

  if (mood === 'neutral') {
    return (
      <g>
        <SquintEye cx={LX} cy={EY} />
        <SquintEye cx={RX} cy={EY} />
      </g>
    )
  }
  if (mood === 'great') {
    return (
      <g>
        <SquintEye cx={LX} cy={EY} />
        <SquintEye cx={RX} cy={EY} />
      </g>
    )
  }
  if (mood === 'sad') {
    return (
      <g>
        <SadEye cx={LX} cy={EY} />
        <SadEye cx={RX} cy={EY} />
        {/* Inner corners of brows raised */}
        <path d={`M 54 87 L 78 82`} stroke={C} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M 122 82 L 146 87`} stroke={C} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    )
  }
  if (mood === 'excited') {
    return (
      <g>
        <StarEye cx={LX} cy={EY} />
        <StarEye cx={RX} cy={EY} />
      </g>
    )
  }
  if (mood === 'thirsty') {
    return (
      <g>
        <OpenEye cx={LX} cy={EY} />
        <OpenEye cx={RX} cy={EY} />
        {/* Heavy droopy lids */}
        <path d={`M ${LX - 18} ${EY} Q ${LX} ${EY - 6} ${LX + 18} ${EY}`} stroke={C} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d={`M ${RX - 18} ${EY} Q ${RX} ${EY - 6} ${RX + 18} ${EY}`} stroke={C} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    )
  }
  // happy, cheer: wink left + open right
  return (
    <g>
      <WinkEye cx={LX} cy={EY} />
      <OpenEye cx={RX} cy={EY} />
    </g>
  )
}

function renderMouth(mood: MascotMood) {
  const MY = 136

  if (mood === 'sad') {
    return (
      <path d={`M 88 ${MY + 8} Q 100 ${MY} 112 ${MY + 8}`} stroke={C} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    )
  }
  if (mood === 'neutral') {
    return (
      <path d={`M 88 ${MY} Q 100 ${MY + 8} 112 ${MY}`} stroke={C} strokeWidth="3" fill="none" strokeLinecap="round" />
    )
  }
  if (mood === 'thirsty') {
    return (
      <g>
        <path d={`M 88 ${MY} Q 100 ${MY + 7} 112 ${MY}`} stroke={C} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="100" cy={MY + 11} rx="8" ry="6" fill="#E86080" />
        <line x1="100" y1={MY + 6} x2="100" y2={MY + 15} stroke="#C04060" strokeWidth="1.2" opacity="0.55" />
      </g>
    )
  }
  return <OpenMouth wide={mood === 'excited'} />
}

function renderArms(mood: MascotMood, bodyMid: string) {
  if (mood === 'sad' || mood === 'neutral' || mood === 'thirsty') return null

  if (mood === 'excited') {
    return (
      <g>
        <ellipse cx="34" cy="108" rx="22" ry="13" fill={bodyMid} transform="rotate(-52 34 108)" />
        <circle cx="22" cy="91" r="14" fill={bodyMid} />
        <ellipse cx="166" cy="108" rx="22" ry="13" fill={bodyMid} transform="rotate(52 166 108)" />
        <circle cx="178" cy="91" r="14" fill={bodyMid} />
      </g>
    )
  }
  // happy, great, cheer — right arm raised
  return (
    <g>
      <ellipse cx="166" cy="116" rx="22" ry="13" fill={bodyMid} transform="rotate(48 166 116)" />
      <circle cx="178" cy="99" r="14" fill={bodyMid} />
    </g>
  )
}

function renderExtras(mood: MascotMood) {
  if (mood === 'sad') {
    return (
      <g>
        {/* Tear drop under left eye */}
        <circle cx="69" cy="130" r="5.5" fill="#A0C8F0" opacity="0.85" />
        <path d="M 63.5 133 Q 69 143 74.5 133" fill="#A0C8F0" opacity="0.85" />
        {/* Floating drops above */}
        <ellipse cx="77" cy="44" rx="5" ry="7" fill="#A0C8F0" opacity="0.7" />
        <path d="M 72 47 Q 77 56 82 47" fill="#A0C8F0" opacity="0.7" />
        <ellipse cx="58" cy="56" rx="4" ry="5.5" fill="#A0C8F0" opacity="0.55" />
        <path d="M 54 59 Q 58 66 62 59" fill="#A0C8F0" opacity="0.55" />
      </g>
    )
  }
  if (mood === 'thirsty') {
    return (
      <g>
        <ellipse cx="148" cy="80" rx="5.5" ry="8" fill="#A0C8F0" opacity="0.85" />
        <path d="M 142.5 84 Q 148 93 153.5 84" fill="#A0C8F0" opacity="0.85" />
      </g>
    )
  }
  if (mood === 'excited') {
    return (
      <g>
        <Sparkle cx={162} cy={68} r={11} />
        <Sparkle cx={38} cy={76} r={9} />
        <Sparkle cx={168} cy={110} r={7} />
        <Sparkle cx={32} cy={50} r={8} />
      </g>
    )
  }
  if (mood === 'great' || mood === 'cheer') {
    return (
      <g>
        <Sparkle cx={160} cy={70} r={10} />
        <Sparkle cx={40} cy={78} r={7} />
      </g>
    )
  }
  return null
}

export function MascotSvg({ mood = 'neutral', size = 120, className }: Props) {
  const gid = `mbg-${mood}`
  // Body stays blue all moods — only expression changes
  const bodyMid = '#9CCAF4'
  const cheekOpacity = mood === 'sad' ? 0.52 : 0.3

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
      </defs>

      {/* Drop shadow */}
      <ellipse cx="100" cy="220" rx="62" ry="10" fill="rgba(0,0,0,0.08)" />

      {/* Feet (rendered before body so body overlaps the top) */}
      <circle cx="74" cy="206" r="20" fill="#6AAAE8" opacity="0.6" />
      <circle cx="126" cy="206" r="20" fill="#6AAAE8" opacity="0.6" />
      {/* Toe dots on feet */}
      <circle cx="66" cy="208" r="5" fill="#5090C8" opacity="0.5" />
      <circle cx="76" cy="212" r="5" fill="#5090C8" opacity="0.5" />
      <circle cx="118" cy="212" r="5" fill="#5090C8" opacity="0.5" />
      <circle cx="128" cy="208" r="5" fill="#5090C8" opacity="0.5" />

      {/* Arms (behind body) */}
      {renderArms(mood, bodyMid)}

      {/* Body */}
      <circle cx="100" cy="126" r="78" fill={`url(#${gid})`} />

      {/* Glossy highlights — large main + circular spots (like original) */}
      <circle cx="80" cy="82" r="22" fill="rgba(255,255,255,0.72)" />
      <circle cx="94" cy="96" r="12" fill="rgba(255,255,255,0.5)" />
      <circle cx="115" cy="88" r="7" fill="rgba(255,255,255,0.38)" />
      <circle cx="130" cy="100" r="5" fill="rgba(255,255,255,0.3)" />
      <circle cx="70" cy="110" r="4.5" fill="rgba(255,255,255,0.3)" />
      {/* Lower body texture dots */}
      <circle cx="68" cy="158" r="5" fill="rgba(255,255,255,0.35)" />
      <circle cx="79" cy="168" r="3.5" fill="rgba(255,255,255,0.27)" />
      <circle cx="128" cy="154" r="4.5" fill="rgba(255,255,255,0.28)" />

      {/* Blush cheeks */}
      <circle cx="60" cy="120" r="13" fill="#FFB0C0" opacity={cheekOpacity} />
      <circle cx="140" cy="120" r="13" fill="#FFB0C0" opacity={cheekOpacity} />

      {renderEyes(mood)}
      {renderMouth(mood)}
      {renderExtras(mood)}
    </svg>
  )
}
