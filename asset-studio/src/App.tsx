import { useEffect, useMemo, useState } from 'react'
import { cartAsset } from './asset-manifest'
import { CartPreview } from './cart-preview'
import './App.css'

type StudioTheme = 'light' | 'dark'
type PreviewSurface = 'stage' | 'light' | 'midnight'

const SURFACE_OPTIONS: Array<{ id: PreviewSurface; label: string; note: string }> = [
  { id: 'stage', label: '深色轨道', note: '接近正式可视化场景' },
  { id: 'light', label: '亮色卡片', note: '适合资源清单与文档封面' },
  { id: 'midnight', label: '深夜缩略', note: '适合深色列表与缩略卡片' },
]

const THEME_STORAGE_KEY = 'asset-studio.theme'
const PRESET_STORAGE_KEY = 'asset-studio.cart-preset'
const SURFACE_STORAGE_KEY = 'asset-studio.surface'

function readStoredTheme(): StudioTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

function readStoredPresetId(): string {
  if (typeof window === 'undefined') {
    return cartAsset.presets[0]?.id ?? ''
  }

  return window.localStorage.getItem(PRESET_STORAGE_KEY) ?? cartAsset.presets[0]?.id ?? ''
}

function readStoredSurface(): PreviewSurface {
  if (typeof window === 'undefined') {
    return 'stage'
  }

  const storedValue = window.localStorage.getItem(SURFACE_STORAGE_KEY)
  return storedValue === 'light' || storedValue === 'midnight' ? storedValue : 'stage'
}

function App() {
  const [theme, setTheme] = useState<StudioTheme>(readStoredTheme)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(readStoredPresetId)
  const [activeSurface, setActiveSurface] = useState<PreviewSurface>(readStoredSurface)

  const selectedPreset = useMemo(
    () => cartAsset.presets.find((preset) => preset.id === selectedPresetId) ?? cartAsset.presets[0],
    [selectedPresetId],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (selectedPresetId) {
      window.localStorage.setItem(PRESET_STORAGE_KEY, selectedPresetId)
    }
  }, [selectedPresetId])

  useEffect(() => {
    window.localStorage.setItem(SURFACE_STORAGE_KEY, activeSurface)
  }, [activeSurface])

  return (
    <div className="studio-app">
      <header className="studio-topbar">
        <div className="studio-heading">
          <span className="studio-eyebrow">Asset Studio</span>
          <h1>教学资产预览工作台</h1>
          <p>{cartAsset.summary}</p>
        </div>

        <div className="studio-topbar-actions">
          <div className="studio-stat-pill">
            <span>当前资产</span>
            <strong>{cartAsset.title}</strong>
          </div>
          <div className="studio-theme-toggle" role="tablist" aria-label="主题切换">
            <button
              type="button"
              className={theme === 'light' ? 'theme-toggle-button is-active' : 'theme-toggle-button'}
              onClick={() => setTheme('light')}
            >
              亮色
            </button>
            <button
              type="button"
              className={theme === 'dark' ? 'theme-toggle-button is-active' : 'theme-toggle-button'}
              onClick={() => setTheme('dark')}
            >
              暗色
            </button>
          </div>
        </div>
      </header>

      <div className="studio-layout">
        <aside className="studio-sidebar surface-panel">
          <section className="panel-block">
            <div className="panel-block-head">
              <span className="panel-label">资源分类</span>
              <span className="panel-count">01</span>
            </div>

            <div className="tree-card is-active">
              <strong>物理 / 力学 / 运动轨迹 / 小车</strong>
              <span>当前首批核心预览资产</span>
            </div>

            <div className="tree-card is-muted">
              <strong>品牌 / 图标</strong>
              <span>后续会逐步纳入统一预览</span>
            </div>
            <div className="tree-card is-muted">
              <strong>学科 / 通用器材</strong>
              <span>后续扩展受力块、坐标轴、分子等资产</span>
            </div>
          </section>

          <section className="panel-block">
            <div className="panel-block-head">
              <span className="panel-label">预览目标</span>
            </div>

            <ul className="info-list">
              <li>先看资产本身是否顺眼、像小车、颜色是否协调。</li>
              <li>同时看深色实验场景与亮色卡片里的观感差异。</li>
              <li>确认后再进入 `web-app/` 业务接线。</li>
            </ul>
          </section>

          <section className="panel-block">
            <div className="panel-block-head">
              <span className="panel-label">当前预设</span>
            </div>

            <div className="selected-preset-card">
              <span className="preset-badge">{selectedPreset.badge}</span>
              <strong>{selectedPreset.name}</strong>
              <p>{selectedPreset.description}</p>
            </div>
          </section>
        </aside>

        <main className="studio-main">
          <section className="surface-panel hero-panel">
            <div className="panel-block-head">
              <div>
                <span className="panel-label">主预览区</span>
                <h2>{cartAsset.title}</h2>
              </div>
              <div className="surface-switcher" role="tablist" aria-label="预览场景切换">
                {SURFACE_OPTIONS.map((surface) => (
                  <button
                    key={surface.id}
                    type="button"
                    className={activeSurface === surface.id ? 'surface-chip is-active' : 'surface-chip'}
                    onClick={() => setActiveSurface(surface.id)}
                  >
                    {surface.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`hero-stage is-${activeSurface}`}>
              <div className="hero-stage-copy">
                <span className="hero-stage-title">{selectedPreset.name}</span>
                <p>{SURFACE_OPTIONS.find((surface) => surface.id === activeSurface)?.note}</p>
              </div>
              <div className="hero-stage-grid" />
              <div className="hero-stage-floor" />
              <CartPreview preset={selectedPreset} size="hero" />
            </div>
          </section>

          <section className="surface-panel">
            <div className="panel-block-head">
              <div>
                <span className="panel-label">多场景对比</span>
                <h2>同一资产在不同背景下的观感</h2>
              </div>
            </div>

            <div className="context-grid">
              {SURFACE_OPTIONS.map((surface) => (
                <article key={surface.id} className="context-card">
                  <div className="context-card-head">
                    <strong>{surface.label}</strong>
                    <span>{surface.note}</span>
                  </div>
                  <div className={`context-preview is-${surface.id}`}>
                    <CartPreview preset={selectedPreset} size="medium" />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-panel">
            <div className="panel-block-head">
              <div>
                <span className="panel-label">配色方案</span>
                <h2>挑一版你觉得最顺眼的</h2>
              </div>
            </div>

            <div className="preset-grid">
              {cartAsset.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={preset.id === selectedPreset.id ? 'preset-card is-active' : 'preset-card'}
                  onClick={() => setSelectedPresetId(preset.id)}
                >
                  <div className="preset-card-preview">
                    <CartPreview preset={preset} size="compact" />
                  </div>
                  <div className="preset-card-copy">
                    <div className="preset-card-head">
                      <strong>{preset.name}</strong>
                      <span className="preset-badge">{preset.badge}</span>
                    </div>
                    <p>{preset.description}</p>
                    <div className="swatch-row">
                      {Object.entries(preset.colors)
                        .slice(0, 5)
                        .map(([colorKey, colorValue]) => (
                          <span key={colorKey} className="swatch-chip" title={`${colorKey}: ${colorValue}`}>
                            <i style={{ background: colorValue }} />
                          </span>
                        ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>

        <aside className="studio-inspector surface-panel">
          <section className="panel-block">
            <div className="panel-block-head">
              <span className="panel-label">资源信息</span>
            </div>

            <dl className="meta-list">
              <div>
                <dt>资源路径</dt>
                <dd>{cartAsset.group}</dd>
              </div>
              <div>
                <dt>最近更新</dt>
                <dd>{cartAsset.updatedAt}</dd>
              </div>
              <div>
                <dt>适用模块</dt>
                <dd>{cartAsset.targetModules.join(' / ')}</dd>
              </div>
            </dl>
          </section>

          <section className="panel-block">
            <div className="panel-block-head">
              <span className="panel-label">颜色 token</span>
            </div>

            <div className="token-list">
              {Object.entries(selectedPreset.colors).map(([token, color]) => (
                <div key={token} className="token-row">
                  <span className="token-swatch" style={{ background: color }} />
                  <div>
                    <strong>{token}</strong>
                    <span>{color}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-block">
            <div className="panel-block-head">
              <span className="panel-label">部件组成</span>
            </div>

            <div className="tag-list">
              {cartAsset.parts.map((part) => (
                <span key={part.id} className="tag-pill">
                  {part.label}
                </span>
              ))}
            </div>
          </section>

          <section className="panel-block">
            <div className="panel-block-head">
              <span className="panel-label">设计备注</span>
            </div>

            <ul className="info-list">
              <li>整体形态优先做成标准侧视小车，便于后续直接接入轨道运动场景。</li>
              <li>当前先以配色和观感为主，不急着做复杂资产编辑能力。</li>
              <li>如果你确认某一版颜色更合适，再把它同步接到 `web-app/` 的可视化页。</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default App
