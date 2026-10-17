import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, type User } from '../cloud/api'
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false)
  let pending: Promise<void> | undefined
  function refresh() {
    if (!pending) pending = api<{ user: User | null }>('auth/me').then(result => { user.value = result.user; ready.value = true }).finally(() => { pending = undefined })
    return pending
  }
  async function authenticate(action: 'login' | 'register', username: string, password: string, turnstileToken?: string) {
    const result = await api<{ user: User; recoveryCode?: string }>('auth/' + action, { username, password, ...(action === 'register' ? { turnstileToken } : {}) })
    user.value = result.user; ready.value = true
    return result
  }
  async function logout() { await api('auth/logout', {}); user.value = null; ready.value = true }
  return { user, ready, refresh, authenticate, logout }
})
