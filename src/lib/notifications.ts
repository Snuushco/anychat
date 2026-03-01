// Notification system — Web Notifications API + in-app fallback

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
  if (typeof window === 'undefined') return

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker?.ready
      if (reg) {
        await reg.showNotification(title, { body, icon: '/icon-192.svg', badge: '/icon-192.svg', data, tag: data?.id || 'anychat' })
      } else {
        new Notification(title, { body, icon: '/icon-192.svg' })
      }
      return
    } catch {
      new Notification(title, { body, icon: '/icon-192.svg' })
      return
    }
  }

  // Fallback: dispatch custom event for in-app banner
  window.dispatchEvent(new CustomEvent('anychat-notification', { detail: { title, body, data } }))
}

export async function scheduleNotification(message: string, triggerAt: Date): Promise<void> {
  const ms = triggerAt.getTime() - Date.now()
  if (ms <= 0) {
    await sendLocalNotification('⏰ Herinnering', message)
    return
  }
  if (ms > 2147483647) return
  setTimeout(() => sendLocalNotification('⏰ Herinnering', message), ms)
}

// PWA install prompt
let deferredPrompt: any = null

export function initInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault()
    deferredPrompt = e
    // Check if user dismissed before
    if (localStorage.getItem('anychat_install_dismissed')) return
    window.dispatchEvent(new CustomEvent('anychat-install-ready'))
  })
}

export async function triggerInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const result = await deferredPrompt.userChoice
  deferredPrompt = null
  return result.outcome === 'accepted'
}

export function dismissInstall() {
  localStorage.setItem('anychat_install_dismissed', '1')
  deferredPrompt = null
}

export function canInstall(): boolean {
  return !!deferredPrompt
}
