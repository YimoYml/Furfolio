export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    return
  } catch {
    // Older browsers and embedded previews may deny the Clipboard API.
    const previous = document.activeElement
    const field = document.createElement('textarea')
    field.value = value
    field.readOnly = true
    field.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none'
    document.body.appendChild(field)
    try {
      field.focus(); field.select()
      if (!document.execCommand('copy')) throw new Error('copy_failed')
    } finally {
      field.remove()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }
}
