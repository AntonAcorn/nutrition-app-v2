interface MicButtonProps {
  active: boolean
  onClick: () => void
  className?: string
  ariaLabelStart?: string
  ariaLabelStop?: string
}

export function MicButton({
  active,
  onClick,
  className = 'note-mic-btn',
  ariaLabelStart = 'Start dictation',
  ariaLabelStop = 'Stop dictation',
}: MicButtonProps) {
  return (
    <button
      type="button"
      className={`${className} ${active ? `${className}--active` : ''}`}
      onClick={onClick}
      aria-label={active ? ariaLabelStop : ariaLabelStart}
    >
      {active ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  )
}
