import KeyvStorage from '@kangfenmao/keyv-storage'
import { loggerService } from '@logger'

import { startAutoSync } from './services/BackupService'
import { startNutstoreAutoSync } from './services/NutstoreService'
import storeSyncService from './services/StoreSyncService'
import { webTraceService } from './services/WebTraceService'
import authService from './services/AuthService'
import store from './store'

loggerService.initWindowSource('mainWindow')

function initKeyv() {
  window.keyv = new KeyvStorage()
  window.keyv.init()
}

function initAutoSync() {
  setTimeout(() => {
    const { webdavAutoSync, localBackupAutoSync, s3 } = store.getState().settings
    const { nutstoreAutoSync } = store.getState().nutstore
    if (webdavAutoSync || (s3 && s3.autoSync) || localBackupAutoSync) {
      startAutoSync()
    }
    if (nutstoreAutoSync) {
      startNutstoreAutoSync()
    }
  }, 8000)
}

function initStoreSync() {
  storeSyncService.subscribe()
}

function initWebTrace() {
  webTraceService.init()
}

initKeyv()
initAutoSync()
initStoreSync()
initWebTrace()

// Initialize Google Auth for marketplace
;(function earlyHandleOAuthCallback() {
  try {
    const url = new URL(window.location.href)
    // In dev, router uses hash routing; handle both hash and path forms
    const isHashCallback = url.hash.startsWith('#/auth/callback')
    const isPathCallback = url.pathname.startsWith('/auth/callback')
    if (isHashCallback || isPathCallback) {
      // Ensure listeners are ready
      authService.initializeGoogleAuth()

      // If we have an auth code, proactively post it to the opener to unblock the main window
      const params = new URLSearchParams(url.search)
      const code = params.get('code')
      const err = params.get('error')
      if (code && window.opener) {
        try {
          window.opener.postMessage({ type: 'GOOGLE_OAUTH_CALLBACK', code }, window.location.origin)
          // Close after a brief delay to ensure message dispatch
          setTimeout(() => window.close(), 200)
        } catch {}
      } else if (err && window.opener) {
        try {
          window.opener.postMessage({ type: 'GOOGLE_OAUTH_CALLBACK', error: err }, window.location.origin)
          setTimeout(() => window.close(), 200)
        } catch {}
      }
    }
  } catch {}
})()
