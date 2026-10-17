export type ImageFit = 'contain' | 'cover'
export type PhotoAspect = 'template' | 'original' | 'portrait' | 'square' | 'landscape'
export interface ImageFrame { x: number; y: number; zoom: number; fit: ImageFit; aspect: PhotoAspect }
export type FrameDevice = 'desktop' | 'mobile'
export interface FrameMeasure { width: number; height: number; device: FrameDevice; imageRatio: number }
export function defaultFrame(): ImageFrame { return { x: 50, y: 100, zoom: 1, fit: 'contain', aspect: 'original' } }
export function defaultAvatarFrame(): ImageFrame { return { x: 50, y: 50, zoom: 1, fit: 'cover', aspect: 'square' } }
export function cleanAvatarFrame(value?: Partial<ImageFrame>): ImageFrame {
  return { ...cleanFrame(value, defaultAvatarFrame()), fit: 'cover', aspect: 'square' }
}
function finite(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}
export function cleanFrame(value: Partial<ImageFrame> | undefined, fallback = defaultFrame()): ImageFrame {
  return { x: finite(value?.x, fallback.x, 0, 100), y: finite(value?.y, fallback.y, 0, 100), zoom: finite(value?.zoom, fallback.zoom, 1, 3), fit: value?.fit === 'cover' ? 'cover' : value?.fit === 'contain' ? 'contain' : fallback.fit, aspect: ['template', 'original', 'portrait', 'square', 'landscape'].includes(value?.aspect || '') ? value!.aspect! : fallback.aspect }
}
export function photoRatio(aspect: PhotoAspect, original: number): number {
  return aspect === 'portrait' ? 3 / 4 : aspect === 'square' ? 1 : aspect === 'landscape' ? 4 / 3 : Math.max(.1, Math.min(10, original || 1))
}
// Percent anchors keep the composition stable at different viewport sizes.
export function imageGeometry(width: number, height: number, imageWidth: number, imageHeight: number, frame: ImageFrame) {
  if (!(width > 0 && height > 0 && imageWidth > 0 && imageHeight > 0)) return null
  const scale = (frame.fit === 'cover' ? Math.max(width / imageWidth, height / imageHeight) : Math.min(width / imageWidth, height / imageHeight)) * frame.zoom
  const drawnWidth = imageWidth * scale, drawnHeight = imageHeight * scale
  const gapX = width - drawnWidth, gapY = height - drawnHeight
  return { width: drawnWidth, height: drawnHeight, left: gapX * frame.x / 100, top: gapY * frame.y / 100, gapX, gapY }
}
export function panFrame(frame: ImageFrame, geometry: NonNullable<ReturnType<typeof imageGeometry>>, dx: number, dy: number): ImageFrame {
  return cleanFrame({ ...frame,
    x: Math.abs(geometry.gapX) < 1 ? frame.x : frame.x + dx / geometry.gapX * 100,
    y: Math.abs(geometry.gapY) < 1 ? frame.y : frame.y + dy / geometry.gapY * 100,
  })
}
