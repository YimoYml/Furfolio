import type { Homepage } from './api'
const key = 'furfolio:cloud-context'
let current: CloudContext | null = null
export interface CloudContext { owner: string; id: string; slug: string; version: number }
export function cloudContext(owner: string): CloudContext | null {
  if (current?.owner === owner) return current
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value?.owner === owner ? value : null } catch { return null }
}
export function rememberHomepage(owner: string, page: Homepage) {
  current = { owner, id: page.id, slug: page.slug, version: page.version }
  try { localStorage.setItem(key, JSON.stringify(current)) } catch { /* This tab retains the version for safe retries. */ }
}
