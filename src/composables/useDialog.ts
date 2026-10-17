import { nextTick, onBeforeUnmount, watch } from 'vue'
import type { Ref } from 'vue'

export function useDialog(open: Ref<boolean>, selector: string, close: () => void) {
  let opener: HTMLElement | null = null
  let previousOverflow = ''
  let listening = false
  const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]'
  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (event.key !== 'Tab') return
    const items = Array.from(document.querySelector(selector)?.querySelectorAll<HTMLElement>(focusable) || []).filter(item => item.getClientRects().length)
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  function release() {
    if (!listening) return
    document.removeEventListener('keydown', onKey)
    document.body.style.overflow = previousOverflow
    listening = false
    if (opener?.isConnected) opener.focus()
  }
  watch(open, async value => {
    if (!value) { release(); return }
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    listening = true
    await nextTick()
    if (open.value) document.querySelector(selector)?.querySelector<HTMLElement>(focusable)?.focus()
  }, { flush: 'post' })
  onBeforeUnmount(release)
}
