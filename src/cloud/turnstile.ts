interface WidgetOptions {
  sitekey: string
  action: string
  execution: 'execute'
  appearance: 'execute'
  theme: 'light'
  size: 'flexible' | 'compact'
  language: string
  retry: 'never'
  'refresh-expired': 'manual'
  'refresh-timeout': 'manual'
  'response-field': false
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  'timeout-callback': () => void
  'unsupported-callback': () => void
}
export interface TurnstileApi {
  render: (container: HTMLElement, options: WidgetOptions) => string
  execute: (widget: string) => void
  remove: (widget: string) => void
}
type TurnstileWindow = Window & { turnstile?: TurnstileApi }
let loading: Promise<TurnstileApi> | undefined
export function loadTurnstile(): Promise<TurnstileApi> {
  const current = (window as TurnstileWindow).turnstile
  if (current) return Promise.resolve(current)
  if (!loading) {
    loading = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      const fail = () => { clearTimeout(timer); script.remove(); reject(new Error('验证服务未能加载，请检查网络后重试。')) }
      const timer = setTimeout(fail, 15000)
      script.onerror = fail
      script.onload = () => {
        clearTimeout(timer)
        const api = (window as TurnstileWindow).turnstile
        if (api) resolve(api)
        else fail()
      }
      document.head.appendChild(script)
    }).catch(error => { loading = undefined; throw error })
  }
  return loading
}
