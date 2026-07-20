import cartAssetData from '../../shared-assets/subjects/physics/mechanics/motion-track/cart/cart-presets.json'

export interface CartPresetColors {
  body: string
  roof: string
  window: string
  accent: string
  lamp: string
  wheel: string
  rim: string
  trim: string
  outline: string
  shadow: string
}

export interface CartPreset {
  id: string
  name: string
  badge: string
  description: string
  colors: CartPresetColors
}

export interface CartAssetManifest {
  id: string
  title: string
  summary: string
  updatedAt: string
  group: string
  targetModules: string[]
  tags: string[]
  parts: Array<{ id: string; label: string }>
  presets: CartPreset[]
}

export const cartAsset = cartAssetData as CartAssetManifest
