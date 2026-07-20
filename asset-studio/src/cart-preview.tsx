import { useId } from 'react'
import type { CartPreset } from './asset-manifest'

interface CartPreviewProps {
  preset: CartPreset
  size?: 'hero' | 'medium' | 'compact'
}

export function CartPreview({ preset, size = 'medium' }: CartPreviewProps) {
  const instanceId = useId().replace(/:/g, '')
  const bodyGradientId = `${instanceId}-body`
  const glassGradientId = `${instanceId}-glass`
  const wheelGradientId = `${instanceId}-wheel`

  return (
    <svg
      viewBox="0 0 320 180"
      className={`cart-preview is-${size}`}
      role="img"
      aria-label={`${preset.name}小车预览`}
    >
      <defs>
        <linearGradient id={bodyGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.colors.body} />
          <stop offset="100%" stopColor={preset.colors.roof} />
        </linearGradient>
        <linearGradient id={glassGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.colors.window} stopOpacity="0.96" />
          <stop offset="100%" stopColor={preset.colors.window} stopOpacity="0.42" />
        </linearGradient>
        <radialGradient id={wheelGradientId} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={preset.colors.rim} />
          <stop offset="42%" stopColor={preset.colors.rim} stopOpacity="0.9" />
          <stop offset="43%" stopColor={preset.colors.wheel} stopOpacity="0.96" />
          <stop offset="100%" stopColor={preset.colors.wheel} />
        </radialGradient>
      </defs>

      <ellipse cx="160" cy="152" rx="106" ry="18" fill={preset.colors.shadow} />

      <g transform="translate(0 2)">
        <path
          d="M50 104C50 85 64 70 82 70H180C195 70 205 66 215 57L234 42C240 38 247 36 255 36H272C286 36 297 44 303 56L311 77C314 84 315 89 314 96C313 101 307 104 297 104H50Z"
          fill={`url(#${bodyGradientId})`}
          stroke={preset.colors.outline}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M129 69L151 45C157 39 164 36 173 36H215C223 36 230 39 236 45L254 69Z"
          fill={preset.colors.roof}
          stroke={preset.colors.outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M141 65L160 47C164 43 169 41 176 41H212C219 41 224 43 229 49L241 65Z"
          fill={`url(#${glassGradientId})`}
          stroke={preset.colors.outline}
          strokeOpacity="0.72"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M84 88H205C220 88 232 83 243 74L282 74"
          fill="none"
          stroke={preset.colors.accent}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M82 95H262"
          fill="none"
          stroke={preset.colors.trim}
          strokeOpacity="0.92"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M186 70V101"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.38"
          strokeWidth="2"
        />
        <path
          d="M153 70V101"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.22"
          strokeWidth="2"
        />
        <rect x="279" y="72" width="18" height="10" rx="5" fill={preset.colors.lamp} />
        <rect x="68" y="82" width="8" height="8" rx="4" fill={preset.colors.accent} fillOpacity="0.92" />
        <path
          d="M94 77H140"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <g>
          <circle cx="108" cy="122" r="25" fill={`url(#${wheelGradientId})`} />
          <circle cx="108" cy="122" r="10" fill={preset.colors.rim} fillOpacity="0.94" />
          <circle cx="108" cy="122" r="4" fill={preset.colors.wheel} fillOpacity="0.7" />
        </g>
        <g>
          <circle cx="244" cy="122" r="25" fill={`url(#${wheelGradientId})`} />
          <circle cx="244" cy="122" r="10" fill={preset.colors.rim} fillOpacity="0.94" />
          <circle cx="244" cy="122" r="4" fill={preset.colors.wheel} fillOpacity="0.7" />
        </g>
      </g>
    </svg>
  )
}
