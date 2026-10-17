import QRCode from 'qrcode'
import logoUrl from '../assets/qr/furfolio-qr-logo-v1.png'

export interface HomepageQr { url: string; dataUrl: string; png: Blob; width: number }

// A permanent production address also works when the editor is opened on a
// temporary Pages deployment. Change this origin when moving to a custom domain.
export function homepageShareUrl(slug: string): string {
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) throw new Error('主页地址无法读取，请重新打开管理后台。')
  return `https://furfolio.pages.dev/u/${slug}`
}

function loadLogo(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('二维码标志未能加载，请重试。'))
    image.src = logoUrl
  })
}

export async function generateHomepageQr(slug: string): Promise<HomepageQr> {
  const url = homepageShareUrl(slug)
  const code = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const modules = code.modules.size, margin = 4
  // Integer pixels per module keep exported edges sharp at print resolution.
  const scale = Math.ceil(1600 / (modules + margin * 2))
  const width = (modules + margin * 2) * scale
  const logo = await loadLogo()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = width
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器暂不支持二维码生成，请换一个浏览器。')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, width)
  context.fillStyle = '#171914'
  for (let row = 0; row < modules; row++) {
    for (let column = 0; column < modules; column++) {
      if (code.modules.get(row, column)) context.fillRect((column + margin) * scale, (row + margin) * scale, scale, scale)
    }
  }
  // A small, module-aligned white badge leaves finder patterns and the entire
  // quiet zone intact. The approved artwork is used only inside this QR image.
  let badgeModules = Math.floor(modules * .16)
  if (badgeModules % 2 === 0) badgeModules--
  const badgeSize = badgeModules * scale, badgeStart = (width - badgeSize) / 2
  context.fillStyle = '#ffffff'
  context.fillRect(badgeStart, badgeStart, badgeSize, badgeSize)
  const inset = scale * .35
  context.drawImage(logo, badgeStart + inset, badgeStart + inset, badgeSize - inset * 2, badgeSize - inset * 2)
  const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob)
    else reject(new Error('二维码图片未能导出，请重试。'))
  }, 'image/png'))
  return { url, width, png, dataUrl: canvas.toDataURL('image/png') }
}
