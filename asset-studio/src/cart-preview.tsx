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
  const wheelCenters = [98, 221] as const

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
          <stop offset="100%" stopColor="#b61f2f" />
        </linearGradient>
        <linearGradient id={glassGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.colors.window} stopOpacity="1" />
          <stop offset="100%" stopColor={preset.colors.window} stopOpacity="0.94" />
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
          {wheelCenters.map((cx) => (
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
          d="M42 112C42 90 50 79 64 73C75 68 90 67 111 67H168C181 67 192 64 202 58L216 48C226 40 238 36 250 36H255C266 36 275 39 281 44C287 49 291 56 295 65L301 79C303 85 303 91 301 99C299 108 294 112 286 112H260C251 112 246 110 242 104Q221 82 200 104C196 110 191 112 181 112H137C128 112 124 110 120 104Q98 82 76 104C72 110 67 112 57 112H48Z"
          fill={`url(#${bodyGradientId})`}
          stroke={preset.colors.outline}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M126 67L145 49C154 41 163 38 175 38H206C216 38 224 41 230 47L245 67Z"
          fill={preset.colors.roof}
          stroke={preset.colors.outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M138 65L154 49C160 43 166 41 174 41H189V65Z"
          fill={`url(#${glassGradientId})`}
          stroke={preset.colors.outline}
          strokeOpacity="0.62"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M192 41H206C214 41 220 44 226 49L237 65H192Z"
          fill={`url(#${glassGradientId})`}
          stroke={preset.colors.outline}
          strokeOpacity="0.62"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M128 88H206C218 88 227 84 235 79L261 79"
          fill="none"
          stroke={preset.colors.accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M128 95H194"
          fill="none"
          stroke={preset.colors.trim}
          strokeOpacity="0.9"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M130 100H186"
          fill="none"
          stroke={preset.colors.roof}
          strokeOpacity="0.22"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect x="258" y="76" width="16" height="10" rx="5" fill={preset.colors.lamp} />
        <rect x="58" y="82" width="8" height="8" rx="4" fill={preset.colors.accent} fillOpacity="0.92" />
        <path
          d="M190 43V65"
          fill="none"
          stroke={preset.colors.roof}
          strokeOpacity="0.42"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M90 78H136"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
