import { useId } from 'react'
import type { CartPreset } from './asset-manifest'

interface CartPreviewProps {
  preset: CartPreset
  size?: 'hero' | 'medium' | 'compact'
}

export function CartPreview({ preset, size = 'medium' }: CartPreviewProps) {
  const instanceId = useId().replace(/:/g, '')
  const glassGradientId = `${instanceId}-glass`
  const rimGradientId = `${instanceId}-rim`

  return (
    <svg
      viewBox="0 0 320 180"
      className={`cart-preview is-${size}`}
      role="img"
      aria-label={`${preset.name}小车预览`}
    >
      <defs>
        <linearGradient id={glassGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.colors.window} stopOpacity="0.96" />
          <stop offset="100%" stopColor={preset.colors.window} stopOpacity="0.42" />
        </linearGradient>
        <radialGradient id={rimGradientId} cx="50%" cy="38%" r="66%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="32%" stopColor={preset.colors.rim} />
          <stop offset="100%" stopColor={preset.colors.rim} stopOpacity="0.72" />
        </radialGradient>
      </defs>

      <ellipse cx="160" cy="152" rx="106" ry="18" fill={preset.colors.shadow} />

      <g transform="translate(0 2)">
        <g>
          {[90, 238].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="122" r="25" fill={preset.colors.wheel} />
              <circle cx={cx} cy="122" r="20" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1.6" />
              <circle cx={cx} cy="122" r="14" fill={`url(#${rimGradientId})`} stroke={preset.colors.wheel} strokeOpacity="0.26" strokeWidth="1.6" />
              <circle cx={cx} cy="122" r="5.2" fill={preset.colors.wheel} fillOpacity="0.66" />
              <path
                d={`M${cx} 110V134 M${cx - 12} 122H${cx + 12} M${cx - 8} 114L${cx + 8} 130 M${cx + 8} 114L${cx - 8} 130`}
                fill="none"
                stroke={preset.colors.wheel}
                strokeOpacity="0.34"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>

        <path
          d="M42 107Q42 87 55 78Q66 71 88 70H120Q131 49 151 40Q159 37 171 37H216Q236 37 249 50L273 74Q294 76 305 87Q313 96 313 105V108Q313 116 304 116H277Q271 94 247 94Q223 94 218 116H113Q108 94 84 94Q60 94 55 116H49Q42 116 42 107Z"
          fill={preset.colors.body}
          stroke={preset.colors.outline}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M128 69L146 47Q154 39 168 39H217Q233 39 243 51L255 69Z"
          fill={preset.colors.roof}
          stroke={preset.colors.outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M138 66L153 49Q158 44 168 44H191V66Z"
          fill={`url(#${glassGradientId})`}
          stroke={preset.colors.outline}
          strokeOpacity="0.62"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M194 44H217Q227 44 236 52L247 66H194Z"
          fill={`url(#${glassGradientId})`}
          stroke={preset.colors.outline}
          strokeOpacity="0.62"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M74 90H214Q233 90 246 80L281 80"
          fill="none"
          stroke={preset.colors.accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M74 97H269"
          fill="none"
          stroke={preset.colors.trim}
          strokeOpacity="0.9"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M186 68V108"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.34"
          strokeWidth="2"
        />
        <path
          d="M228 68V104"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.22"
          strokeWidth="2"
        />
        <path
          d="M57 116Q67 95 84 95Q102 95 113 116"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.38"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M218 116Q228 95 246 95Q264 95 275 116"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.38"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <rect x="283" y="80" width="16" height="10" rx="5" fill={preset.colors.lamp} />
        <rect x="56" y="84" width="8" height="10" rx="4" fill={preset.colors.accent} fillOpacity="0.88" />
        <path
          d="M96 78H136"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <rect x="172" y="82" width="14" height="4" rx="2" fill={preset.colors.trim} fillOpacity="0.88" />
      </g>
    </svg>
  )
}
