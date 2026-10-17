let connection: Promise<IDBDatabase> | undefined
function open(): Promise<IDBDatabase> {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('fursona-assets', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('images')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { connection = undefined; reject(new Error('浏览器未允许保存图片，请检查存储权限。')) }
  })
  return connection
}
export async function putAsset(file: File): Promise<{ id: string; url: string }> {
  if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type)) throw new Error('请选择 PNG、WebP 或 JPG 图片。')
  if (file.size > 10 * 1024 * 1024) throw new Error('图片需要小于 10 MB。')
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('这张图片无法读取，请换一张。') })
  const valid = bitmap.width >= 32 && bitmap.height >= 32 && bitmap.width <= 8000 && bitmap.height <= 8000
  bitmap.close()
  if (!valid) throw new Error('图片长宽需要在 32～8000 像素之间。')
  const id = crypto.randomUUID()
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('images', 'readwrite')
    transaction.objectStore('images').put(file, id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = transaction.onabort = () => reject(new Error('图片保存失败，浏览器存储空间可能不足。'))
  })
  return { id, url: URL.createObjectURL(file) }
}
export async function getAsset(id: string): Promise<Blob | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const request = db.transaction('images').objectStore('images').get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
}
export async function deleteAsset(id: string): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('images', 'readwrite')
    transaction.objectStore('images').delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
