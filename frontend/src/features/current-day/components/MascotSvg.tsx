export type MascotMood = 'neutral' | 'happy' | 'great' | 'sad' | 'thirsty' | 'excited' | 'cheer'

interface Props {
  mood?: MascotMood
  size?: number
  className?: string
}

const EYE_DARK = '#0E1520'
const OUTLINE = '#1A2A38'
const BODY_MID = '#9CC8F2'
const BODY_DARK = '#6AAAE8'

function Sparkle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const d = r * 0.5
  return (
    <g>
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#FFE040" strokeWidth={r * 0.36} strokeLinecap="round" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#FFE040" strokeWidth={r * 0.36} strokeLinecap="round" />
      <line x1={cx - d} y1={cy - d} x2={cx + d} y2={cy + d} stroke="#FFE040" strokeWidth={r * 0.26} strokeLinecap="round" />
      <line x1={cx + d} y1={cy - d} x2={cx - d} y2={cy + d} stroke="#FFE040" strokeWidth={r * 0.26} strokeLinecap="round" />
    </g>
  )
}

function StarPupil({ cx, cy }: { cx: number; cy: number }) {
  const s = 9, sm = 4
  return (
    <path
      d={`M ${cx} ${cy - s} L ${cx + sm} ${cy - sm} L ${cx + s} ${cy} L ${cx + sm} ${cy + sm} L ${cx} ${cy + s} L ${cx - sm} ${cy + sm} L ${cx - s} ${cy} L ${cx - sm} ${cy - sm} Z`}
      fill={EYE_DARK}
    />
  )
}

function OpenEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={18} fill="white" />
      <circle cx={cx} cy={cy + 1} r={14} fill={EYE_DARK} />
      <circle cx={cx + 5} cy={cy - 5} r={4.5} fill="white" />
      <circle cx={cx + 2} cy={cy - 2} r={1.8} fill="rgba(255,255,255,0.55)" />
    </g>
  )
}

function WinkEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      d={`M ${cx - 17} ${cy} Q ${cx} ${cy - 13} ${cx + 17} ${cy}`}
      stroke={EYE_DARK}
      strokeWidth="4.5"
      fill="none"
      strokeLinecap="round"
    />
  )
}

function SadEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={21} fill="white" />
      <circle cx={cx} cy={cy} r={21} fill="#C8E0F8" opacity="0.35" />
      <circle cx={cx} cy={cy + 2} r={17} fill={EYE_DARK} />
      <circle cx={cx + 6} cy={cy - 6} r={5} fill="white" />
    </g>
  )
}

function renderEyes(mood: MascotMood) {
  const LX = 76, RX = 124, EY = 110

  if (mood === 'sad') {
    return (
      <g>
        <SadEye cx={LX} cy={EY} />
        <SadEye cx={RX} cy={EY} />
        {/* Worried brows — inner corners raised */}
        <path d={`M 55 91 L 79 86`} stroke={OUTLINE} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M 121 86 L 145 91`} stroke={OUTLINE} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    )
  }

  if (mood === 'excited') {
    return (
      <g>
        <circle cx={LX} cy={EY} r={20} fill="white" />
        <circle cx={RX} cy={EY} r={20} fill="white" />
        <StarPupil cx={LX} cy={EY} />
        <StarPupil cx={RX} cy={EY} />
        <circle cx={LX + 6} cy={EY - 7} r={5} fill="white" />
        <circle cx={RX + 6} cy={EY - 7} r={5} fill="white" />
      </g>
    )
  }

  if (mood === 'great') {
    return (
      <g>
        <OpenEye cx={LX} cy={EY} />
        <OpenEye cx={RX} cy={EY} />
      </g>
    )
  }

  if (mood === 'thirsty') {
    return (
      <g>
        <OpenEye cx={LX} cy={EY} />
        <OpenEye cx={RX} cy={EY} />
        {/* Droopy half-lids */}
        <path d={`M ${LX - 18} ${EY} Q ${LX} ${EY - 5} ${LX + 18} ${EY}`} stroke={OUTLINE} strokeWidth="5.5" fill="none" strokeLinecap="round" />
        <path d={`M ${RX - 18} ${EY} Q ${RX} ${EY - 5} ${RX + 18} ${EY}`} stroke={OUTLINE} strokeWidth="5.5" fill="none" strokeLinecap="round" />
      </g>
    )
  }

  if (mood === 'neutral') {
    return (
      <g>
        <OpenEye cx={LX} cy={EY} />
        <OpenEye cx={RX} cy={EY} />
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
  const MX = 100, MY = 140

  if (mood === 'sad') {
    return (
      <path d={`M 87 ${MY + 8} Q ${MX} ${MY} 113 ${MY + 8}`} stroke={OUTLINE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    )
  }

  if (mood === 'thirsty') {
    return (
      <g>
        <path d={`M 88 ${MY + 2} Q ${MX} ${MY + 10} 112 ${MY + 2} Z`} fill={OUTLINE} />
        <path d={`M 91 ${MY + 3} Q ${MX} ${MY + 8} 109 ${MY + 3} Z`} fill="#E83050" />
        <ellipse cx={MX} cy={MY + 14} rx="9" ry="7" fill="#E86080" />
        <line x1="100" y1={MY + 8} x2="100" y2={MY + 19} stroke="#C04060" strokeWidth="1.2" opacity="0.55" />
      </g>
    )
  }

  if (mood === 'neutral') {
    return (
      <path d={`M 87 ${MY} Q ${MX} ${MY + 10} 113 ${MY}`} stroke={OUTLINE} strokeWidth="3" fill="none" strokeLinecap="round" />
    )
  }

  // happy, great, cheer, excited — big open smile
  return (
    <g>
      <path d={`M 80 ${MY} Q ${MX} ${MY + 22} 120 ${MY} Z`} fill={OUTLINE} />
      <path d={`M 84 ${MY + 1} Q ${MX} ${MY + 18} 116 ${MY + 1} Z`} fill="#E83050" />
    </g>
  )
}

function renderArms(mood: MascotMood) {
  if (mood === 'sad' || mood === 'neutral' || mood === 'thirsty') return null

  if (mood === 'excited') {
    return (
      <g>
        <ellipse cx="34" cy="106" rx="22" ry="13" fill={BODY_MID} transform="rotate(-52 34 106)" />
        <circle cx="22" cy="89" r="14" fill={BODY_MID} />
        <ellipse cx="166" cy="106" rx="22" ry="13" fill={BODY_MID} transform="rotate(52 166 106)" />
        <circle cx="178" cy="89" r="14" fill={BODY_MID} />
      </g>
    )
  }

  // happy, great, cheer — right arm raised
  return (
    <g>
      <ellipse cx="164" cy="114" rx="22" ry="13" fill={BODY_MID} transform="rotate(48 164 114)" />
      <circle cx="176" cy="97" r="14" fill={BODY_MID} />
    </g>
  )
}

function renderExtras(mood: MascotMood) {
  if (mood === 'sad') {
    return (
      <g>
        {/* Tear under left eye */}
        <circle cx="70" cy="134" r="5.5" fill="#A0C8F0" opacity="0.85" />
        <path d="M 64.5 137 Q 70 147 75.5 137" fill="#A0C8F0" opacity="0.85" />
        {/* Floating drops above head */}
        <ellipse cx="77" cy="46" rx="5" ry="7" fill="#A0C8F0" opacity="0.7" />
        <path d="M 72 49 Q 77 57 82 49" fill="#A0C8F0" opacity="0.7" />
        <ellipse cx="58" cy="58" rx="4" ry="5.5" fill="#A0C8F0" opacity="0.55" />
        <path d="M 54 61 Q 58 68 62 61" fill="#A0C8F0" opacity="0.55" />
      </g>
    )
  }

  if (mood === 'thirsty') {
    return (
      <g>
        <ellipse cx="148" cy="82" rx="5.5" ry="8" fill="#A0C8F0" opacity="0.85" />
        <path d="M 142.5 86 Q 148 95 153.5 86" fill="#A0C8F0" opacity="0.85" />
      </g>
    )
  }

  if (mood === 'excited') {
    return (
      <g>
        <Sparkle cx={162} cy={70} r={11} />
        <Sparkle cx={38} cy={78} r={9} />
        <Sparkle cx={168} cy={108} r={7} />
        <Sparkle cx={32} cy={52} r={8} />
      </g>
    )
  }

  if (mood === 'great' || mood === 'cheer') {
    return (
      <g>
        <Sparkle cx={160} cy={72} r={10} />
        <Sparkle cx={42} cy={80} r={7} />
      </g>
    )
  }

  return null
}

export function MascotSvg({ mood = 'neutral', size = 120, className }: Props) {
  const gid = `mbg-${mood}`
  const cheekOpacity = mood === 'sad' ? 0.5 : 0.32

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
        <radialGradient id={gid} cx="34%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#E0F2FF" />
          <stop offset="42%" stopColor="#A4CCF4" />
          <stop offset="100%" stopColor={BODY_DARK} />
        </radialGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse cx="100" cy="218" rx="62" ry="10" fill="rgba(0,0,0,0.08)" />

      {/* Feet (behind body) */}
      <ellipse cx="81" cy="208" rx="18" ry="11" fill={BODY_DARK} opacity="0.55" />
      <ellipse cx="119" cy="208" rx="18" ry="11" fill={BODY_DARK} opacity="0.55" />

      {/* Arms (behind body) */}
      {renderArms(mood)}

      {/* Body */}
      <circle cx="100" cy="130" r="76" fill={`url(#${gid})`} />

      {/* Glossy highlights */}
      <ellipse cx="77" cy="87" rx="24" ry="15" fill="rgba(255,255,255,0.74)" transform="rotate(-22 77 87)" />
      <ellipse cx="122" cy="100" rx="9" ry="5.5" fill="rgba(255,255,255,0.5)" />
      <ellipse cx="68" cy="114" rx="5.5" ry="3.5" fill="rgba(255,255,255,0.38)" />

      {/* Blush cheeks */}
      <circle cx="61" cy="122" r="13" fill="#FFB0C0" opacity={cheekOpacity} />
      <circle cx="139" cy="122" r="13" fill="#FFB0C0" opacity={cheekOpacity} />

      {renderEyes(mood)}
      {renderMouth(mood)}
      {renderExtras(mood)}
    </svg>
  )
}
