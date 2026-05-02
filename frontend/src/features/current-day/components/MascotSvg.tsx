export type MascotMood = 'neutral' | 'happy' | 'great' | 'sad' | 'thirsty' | 'excited' | 'cheer'

interface Props {
  mood?: MascotMood
  size?: number
  className?: string
}

const BODY_GRAD: Record<MascotMood, [string, string]> = {
  neutral: ['#C8E8D4', '#8DC4A8'],
  happy:   ['#C8E8D4', '#8DC4A8'],
  cheer:   ['#C0F0D0', '#64C88C'],
  great:   ['#B0F0C4', '#4CC880'],
  sad:     ['#BCCFE8', '#78A8C8'],
  thirsty: ['#F0D8B4', '#D4A468'],
  excited: ['#FFF0A0', '#F0C030'],
}

function Eye({ cx, cy, dy = 0 }: { cx: number; cy: number; dy?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={13} fill="white" />
      <circle cx={cx} cy={cy + 1 + dy} r={8.5} fill="#2A4438" />
      <circle cx={cx} cy={cy + 1 + dy} r={4.5} fill="#162A20" />
      <circle cx={cx + 2.5} cy={cy - 2 + dy} r={2.5} fill="white" />
    </g>
  )
}

function StarPupil({ cx, cy }: { cx: number; cy: number }) {
  const s = 6, sm = 2.5
  return (
    <path
      d={`M ${cx} ${cy - s} L ${cx + sm} ${cy - sm} L ${cx + s} ${cy} L ${cx + sm} ${cy + sm} L ${cx} ${cy + s} L ${cx - sm} ${cy + sm} L ${cx - s} ${cy} L ${cx - sm} ${cy - sm} Z`}
      fill="#162A20"
    />
  )
}

function Sparkle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const d = r * 0.45
  return (
    <g>
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#FFD700" strokeWidth="2" strokeLinecap="round" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#FFD700" strokeWidth="2" strokeLinecap="round" />
      <line x1={cx - d} y1={cy - d} x2={cx + d} y2={cy + d} stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={cx + d} y1={cy - d} x2={cx - d} y2={cy + d} stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  )
}

function renderEyes(mood: MascotMood) {
  const LX = 78, RX = 122, EY = 104
  const c = '#2A4438'

  if (mood === 'great') {
    return (
      <g>
        <path d={`M 65 ${EY} Q ${LX} ${EY - 11} 91 ${EY}`} stroke={c} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d={`M 109 ${EY} Q ${RX} ${EY - 11} 135 ${EY}`} stroke={c} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
    )
  }

  if (mood === 'cheer') {
    return (
      <g>
        <path d={`M 65 ${EY} Q ${LX} ${EY + 4} 91 ${EY}`} stroke={c} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <Eye cx={RX} cy={EY} />
        <circle cx={RX + 3} cy={EY - 3} r={2} fill="rgba(255,255,255,0.5)" />
      </g>
    )
  }

  if (mood === 'sad') {
    return (
      <g>
        <Eye cx={LX} cy={EY} dy={4} />
        <Eye cx={RX} cy={EY} dy={4} />
        <path d={`M 65 ${EY - 1} Q ${LX} ${EY - 6} 91 ${EY - 1}`} stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M 109 ${EY - 1} Q ${RX} ${EY - 6} 135 ${EY - 1}`} stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M 69 ${EY - 16} L 89 ${EY - 20}`} stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d={`M 111 ${EY - 20} L 131 ${EY - 16}`} stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    )
  }

  if (mood === 'excited') {
    return (
      <g>
        <circle cx={LX} cy={EY} r={14} fill="white" />
        <circle cx={RX} cy={EY} r={14} fill="white" />
        <StarPupil cx={LX} cy={EY} />
        <StarPupil cx={RX} cy={EY} />
        <circle cx={LX + 4} cy={EY - 5} r={2.5} fill="white" />
        <circle cx={RX + 4} cy={EY - 5} r={2.5} fill="white" />
      </g>
    )
  }

  if (mood === 'thirsty') {
    return (
      <g>
        <Eye cx={LX} cy={EY} />
        <Eye cx={RX} cy={EY} />
        <path d={`M 65 ${EY} Q ${LX} ${EY - 4} 91 ${EY}`} stroke={c} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d={`M 109 ${EY} Q ${RX} ${EY - 4} 135 ${EY}`} stroke={c} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    )
  }

  return (
    <g>
      <Eye cx={LX} cy={EY} />
      <Eye cx={RX} cy={EY} />
      {mood === 'happy' && (
        <>
          <circle cx={LX + 3} cy={EY - 3} r={2} fill="rgba(255,255,255,0.4)" />
          <circle cx={RX + 3} cy={EY - 3} r={2} fill="rgba(255,255,255,0.4)" />
        </>
      )}
    </g>
  )
}

function renderMouth(mood: MascotMood) {
  const MX = 100, MY = 135
  const s = '#2A4438'

  switch (mood) {
    case 'great':
      return (
        <g>
          <path d={`M 80 ${MY} Q ${MX} ${MY + 18} 120 ${MY}`} stroke={s} strokeWidth="3.5" fill="white" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="80" y1={MY} x2="120" y2={MY} stroke={s} strokeWidth="1.2" opacity="0.35" />
        </g>
      )
    case 'cheer':
      return (
        <path d={`M 82 ${MY - 2} Q ${MX} ${MY + 14} 118 ${MY - 2}`} stroke={s} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )
    case 'sad':
      return (
        <path d={`M 86 ${MY + 6} Q ${MX} ${MY - 4} 114 ${MY + 6}`} stroke={s} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )
    case 'excited':
      return (
        <g>
          <ellipse cx={MX} cy={MY + 5} rx="13" ry="11" fill={s} />
          <ellipse cx={MX} cy={MY + 7} rx="9" ry="7" fill="#FF8090" />
        </g>
      )
    case 'thirsty':
      return (
        <g>
          <path d={`M 90 ${MY} Q ${MX} ${MY + 6} 110 ${MY}`} stroke={s} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx={MX} cy={MY + 9} rx="8" ry="6" fill="#E88888" />
          <line x1="100" y1={MY + 5} x2="100" y2={MY + 13} stroke="#D07070" strokeWidth="1" opacity="0.6" />
        </g>
      )
    case 'neutral':
      return (
        <path d={`M 88 ${MY} Q ${MX} ${MY + 8} 112 ${MY}`} stroke={s} strokeWidth="3" fill="none" strokeLinecap="round" />
      )
    default:
      return (
        <path d={`M 84 ${MY - 1} Q ${MX} ${MY + 13} 116 ${MY - 1}`} stroke={s} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )
  }
}

export function MascotSvg({ mood = 'neutral', size = 120, className }: Props) {
  const [c1, c2] = BODY_GRAD[mood]
  const gid = `mbg-${mood}`
  const blushOpacity = mood === 'thirsty' ? 0.55 : mood === 'sad' ? 0.15 : 0.28

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={Math.round(size * 1.1)}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      </defs>

      {/* Shadow */}
      <ellipse cx="100" cy="196" rx="56" ry="9" fill="rgba(0,0,0,0.07)" />

      {/* Body */}
      <circle cx="100" cy="122" r="72" fill={`url(#${gid})`} />

      {/* Leaf sprout */}
      <line x1="100" y1="50" x2="100" y2="36" stroke="#4A9660" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="95" cy="24" rx="7.5" ry="16" fill="#6ABF7C" transform="rotate(-18 95 24)" />
      <path d="M 98 38 Q 95 28 93 18" stroke="#4A9660" strokeWidth="1.2" fill="none" opacity="0.5" />

      {/* Raised arms for excited */}
      {mood === 'excited' && (
        <g>
          <ellipse cx="30" cy="90" rx="14" ry="9" fill={c2} transform="rotate(-50 30 90)" />
          <ellipse cx="170" cy="90" rx="14" ry="9" fill={c2} transform="rotate(50 170 90)" />
        </g>
      )}

      {/* Blush cheeks */}
      <ellipse cx="64" cy="126" rx="13" ry="8" fill="#FFB0B0" opacity={blushOpacity} />
      <ellipse cx="136" cy="126" rx="13" ry="8" fill="#FFB0B0" opacity={blushOpacity} />

      {renderEyes(mood)}
      {renderMouth(mood)}

      {/* Teardrop (sad) */}
      {mood === 'sad' && (
        <g>
          <circle cx="74" cy="119" r="4" fill="#A8C8F0" opacity="0.75" />
          <path d="M 70 119 Q 74 128 78 119" fill="#A8C8F0" opacity="0.75" />
        </g>
      )}

      {/* Sweat drop (thirsty) */}
      {mood === 'thirsty' && (
        <g>
          <circle cx="140" cy="82" r="4.5" fill="#A8D8F8" opacity="0.85" />
          <path d="M 135.5 82 Q 140 91 144.5 82" fill="#A8D8F8" opacity="0.85" />
        </g>
      )}

      {/* Sparkles (excited / great) */}
      {(mood === 'excited' || mood === 'great') && (
        <g>
          <Sparkle cx={154} cy={74} r={8} />
          <Sparkle cx={44} cy={82} r={6} />
          <Sparkle cx={160} cy={108} r={5} />
          {mood === 'excited' && <Sparkle cx={38} cy={56} r={7} />}
        </g>
      )}
    </svg>
  )
}
