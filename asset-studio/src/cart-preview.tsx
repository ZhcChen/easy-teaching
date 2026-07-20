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
          {[94, 236].map((cx) => (
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
          d="M42 106C42 89 52 78 69 73C76 71 85 70 97 70H163C184 70 198 66 210 58L223 49C233 40 245 36 260 36H272C287 36 298 44 304 57L312 76C315 84 316 92 314 98C312 103 306 106 296 106H265C257 106 252 103 248 99C243 92 238 88 230 88C222 88 217 92 212 99C209 103 203 106 194 106H129C120 106 114 103 111 99C106 92 101 88 92 88C83 88 78 92 73 99C69 103 63 106 54 106H46Z"
          fill={`url(#${bodyGradientId})`}
          stroke={preset.colors.outline}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M126 68L145 50C154 42 163 38 175 38H214C225 38 234 42 242 50L259 68Z"
          fill={preset.colors.roof}
          stroke={preset.colors.outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M138 66L154 50C160 44 166 42 174 42H192V66Z"
          fill={`url(#${glassGradientId})`}
          stroke={preset.colors.outline}
          strokeOpacity="0.62"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M195 42H214C223 42 230 45 236 51L248 66H195Z"
          fill={`url(#${glassGradientId})`}
          stroke={preset.colors.outline}
          strokeOpacity="0.62"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M78 88H208C223 88 234 84 244 78L281 78"
          fill="none"
          stroke={preset.colors.accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M77 95H266"
          fill="none"
          stroke={preset.colors.trim}
          strokeOpacity="0.9"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M78 100H255"
          fill="none"
          stroke={preset.colors.roof}
          strokeOpacity="0.22"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M186 68V100"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.34"
          strokeWidth="2"
        />
        <path
          d="M154 68V99"
          fill="none"
          stroke={preset.colors.outline}
          strokeOpacity="0.22"
          strokeWidth="2"
        />
        <rect x="279" y="76" width="18" height="10" rx="5" fill={preset.colors.lamp} />
        <rect x="60" y="82" width="8" height="8" rx="4" fill={preset.colors.accent} fillOpacity="0.92" />
        <path
          d="M90 78H136"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M70 104Q81 95 92 95Q103 95 114 104"
          fill="none"
          stroke={preset.colors.roof}
          strokeOpacity="0.3"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M212 104Q223 95 234 95Q245 95 256 104"
          fill="none"
          stroke={preset.colors.roof}
          strokeOpacity="0.3"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
