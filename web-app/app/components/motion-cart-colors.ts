import cartAssetData from "../../../shared-assets/subjects/physics/mechanics/motion-track/cart/cart-presets.json";

export type MotionCartColors = {
  body: string;
  roof: string;
  window: string;
  accent: string;
  lamp: string;
  wheel: string;
  rim: string;
  trim: string;
  outline: string;
  shadow: string;
};

type MotionCartAssetManifest = {
  presets: Array<{
    colors: MotionCartColors;
  }>;
};

export const MOTION_CART_FALLBACK_COLORS: MotionCartColors = {
  body: "#d62839",
  roof: "#2b303b",
  window: "#e3f4ff",
  accent: "#ffe8db",
  lamp: "#ffe89b",
  wheel: "#2a313d",
  rim: "#d1d8e2",
  trim: "#ffd0c7",
  outline: "#ffe2d9",
  shadow: "rgba(6, 8, 12, 0.28)",
};

const sharedCartPreset = (cartAssetData as MotionCartAssetManifest).presets[0];

export const MOTION_CART_COLORS =
  sharedCartPreset?.colors ?? MOTION_CART_FALLBACK_COLORS;
