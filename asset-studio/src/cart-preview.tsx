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
  const rimGradientId = `${instanceId}-rim`

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
          <stop offset="78%" stopColor={preset.colors.body} />
          <stop offset="100%" stopColor="#d95810" />
        </linearGradient>
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
          {[108, 244].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="120.5" r="22.5" fill={preset.colors.wheel} stroke="#7f8898" strokeOpacity="0.42" strokeWidth="1.2" />
              <circle cx={cx} cy="120.5" r="18.2" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1.4" />
              <circle
                cx={cx}
                cy="120.5"
                r="12.2"
                fill={`url(#${rimGradientId})`}
                stroke={preset.colors.wheel}
                strokeOpacity="0.24"
                strokeWidth="1.4"
              />
              <circle cx={cx} cy="120.5" r="4.4" fill={preset.colors.wheel} fillOpacity="0.72" />
              <path
                d={`M${cx} 109.5V131.5 M${cx - 10} 120.5H${cx + 10} M${cx - 6} 113.5L${cx + 6} 127.5 M${cx + 6} 113.5L${cx - 6} 127.5`}
                fill="none"
                stroke={preset.colors.wheel}
                strokeOpacity="0.34"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>

        <path
          d="M50 104C50 85 64 70 82 70H180C195 70 205 66 215 57L234 42C240 38 247 36 255 36H272C286 36 297 44 303 56L311 77C314 84 315 89 314 96C313 101 307 104 297 104H268Q244 88 220 104H132Q108 88 84 104H50Z"
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
          strokeOpacity="0.62"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M84 88H205C220 88 232 83 243 74L282 74"
          fill="none"
          stroke={preset.colors.accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M82 95H262"
          fill="none"
          stroke={preset.colors.trim}
          strokeOpacity="0.9"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M84 101H253"
          fill="none"
          stroke={preset.colors.roof}
          strokeOpacity="0.22"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M186 70V101"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.34"
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
          strokeOpacity="0.16"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M87 104Q108 92 129 104"
          fill="none"
          stroke={preset.colors.roof}
          strokeOpacity="0.34"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M223 104Q244 92 265 104"
          fill="none"
          stroke={preset.colors.roof}
          strokeOpacity="0.34"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
