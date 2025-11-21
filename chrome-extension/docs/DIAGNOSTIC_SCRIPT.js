/**
 * 快速診斷腳本 - 在 popup 或 sidepanel DevTools Console 中執行
 * 複製粘貼以下程式碼到 DevTools Console，按 Enter 執行
 */

(function diagnoseAuth() {
    console.log('🔍 開始診斷 mms-todo 認證狀態...\n')

    // 1. 檢查 localStorage
    console.log('📱 1. localStorage 狀態：')
    const authStorageLocal = localStorage.getItem('auth.ms')
    if (authStorageLocal) {
        try {
            const auth = JSON.parse(authStorageLocal)
            console.log('✅ localStorage 中找到 auth.ms：', auth)

            if (auth.expiresAt) {
                const expiresIn = auth.expiresAt - Date.now()
                const expiresInMinutes = Math.round(expiresIn / 60000)
                if (expiresIn > 0) {
                    console.log(`⏱️ Token 有效期：${expiresInMinutes} 分鐘後過期`)
                } else {
                    console.log(`⚠️ Token 已過期 ${Math.abs(expiresInMinutes)} 分鐘`)
                }
            }

            if (auth.refreshToken) {
                console.log('✅ 找到 refresh token')
            } else {
                console.log('❌ 缺少 refresh token - 無法自動刷新')
            }
        } catch (e) {
            console.error('❌ localStorage 中的 auth.ms 格式錯誤：', e)
        }
    } else {
        console.log('❌ localStorage 中未找到 auth.ms')
    }

    // 2. 檢查 chrome.storage.local
    console.log('\n🔐 2. chrome.storage.local 狀態：')
    chrome.storage.local.get(['auth.ms'], (result) => {
        if (chrome.runtime.lastError) {
            console.error('❌ 讀取 chrome.storage.local 失敗：', chrome.runtime.lastError)
            return
        }

        if (result['auth.ms']) {
            console.log('ℹ️ chrome.storage.local 中找到 auth.ms：', result['auth.ms'])
            console.log('⚠️ 注意：當前實現使用 chrome.storage.local，應改為 localStorage')
        } else {
            console.log('ℹ️ chrome.storage.local 中未找到 auth.ms（正常，應使用 localStorage）')
        }

        // 3. 檢查登入狀態一致性
        console.log('\n🔄 3. 狀態一致性檢查：')
        const localStorageAuth = localStorage.getItem('auth.ms')
        const chromeStorageAuth = result['auth.ms']

        if (localStorageAuth && !chromeStorageAuth) {
            console.log('✅ localStorage 有，chrome.storage.local 無 - 已成功遷移')
        } else if (!localStorageAuth && chromeStorageAuth) {
            console.log('⚠️ chrome.storage.local 有，localStorage 無 - 需要遷移')
        } else if (localStorageAuth && chromeStorageAuth) {
            console.log('🟡 兩者都有 - 可能正在過渡中')
        } else {
            console.log('❌ 兩者都沒有 - 需要重新登入')
        }

        // 4. 檢查登入狀態
        console.log('\n🎫 4. 登入狀態：')
        const auth = localStorageAuth ? JSON.parse(localStorageAuth) : (chromeStorageAuth || {})

        if (auth.accessToken) {
            const expiresIn = auth.expiresAt - Date.now()
            if (expiresIn > 0) {
                console.log('✅ 已登入，Token 有效')
            } else {
                console.log('⚠️ 已登入，但 Token 已過期，需要刷新')
            }
        } else {
            console.log('❌ 未登入')
        }

        // 5. 檢查登入狀態（臨時）
        console.log('\n🛡️ 5. 登入流程狀態：')
        const loginState = localStorage.getItem('login_state')
        if (loginState) {
            try {
                const state = JSON.parse(loginState)
                const stateAge = Date.now() - state.timestamp
                console.warn(`⚠️ 登入流程進行中（${Math.round(stateAge / 1000)} 秒前開始）`)
                console.warn('提示：如果卡住，可以執行 localStorage.removeItem("login_state")')
            } catch (e) {
                console.error('❌ login_state 格式錯誤：', e)
            }
        } else {
            console.log('✅ 無進行中的登入流程')
        }

        // 6. 檢查 Chrome 警告
        console.log('\n⚠️ 6. Chrome 警告檢查：')
        console.log('(查看 Console 中是否有 "不允許" 或 "permission" 的警告)')

        // 7. 建議
        console.log('\n💡 7. 快速修復建議：')
        if (!localStorageAuth && !chromeStorageAuth) {
            console.log('→ 需要重新登入')
        } else if (!localStorageAuth && chromeStorageAuth) {
            console.log('→ 執行遷移：localStorage.setItem("auth.ms", JSON.stringify(' +
                        JSON.stringify(chromeStorageAuth, null, 2) + '))')
        } else if (auth.accessToken && auth.expiresAt - Date.now() < 0) {
            console.log('→ Token 已過期，需要刷新')
            console.log('→ 手動重新登入或等待自動刷新')
        } else {
            console.log('✅ 看起來一切正常')
        }

        console.log('\n📚 查看詳細指南：')
        console.log('- AUTH_FIX_GUIDE.md')
        console.log('- COMPARISON_REFERENCE_VS_CURRENT.md')
        console.log('- ANALYSIS_REFERENCE_AUTH.md')
    })
})()

// 輔助函數：手動刷新 Token（用於測試）
async function manualTokenRefresh() {
    console.log('🔄 嘗試手動刷新 Token...')
    try {
        // 這需要 useAuth 的 ensureValidToken 方法
        // 在這裡我們直接呼叫 API
        const auth = JSON.parse(localStorage.getItem('auth.ms') || '{}')

        if (!auth.refreshToken) {
            console.error('❌ 缺少 refresh token')
            return
        }

        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: 'c9f320b3-a966-4bb7-8d88-3b51ae7f632f',
                grant_type: 'refresh_token',
                refresh_token: auth.refreshToken,
                scope: 'Tasks.ReadWrite User.Read offline_access'
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('❌ Token 刷新失敗：', error)
            return
        }

        const data = await response.json()
        const newAuth = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || auth.refreshToken,
            expiresAt: Date.now() + (data.expires_in * 1000)
        }

        localStorage.setItem('auth.ms', JSON.stringify(newAuth))
        console.log('✅ Token 已刷新，新的過期時間：', new Date(newAuth.expiresAt).toISOString())
    } catch (error) {
        console.error('❌ 刷新失敗：', error)
    }
}

// 輔助函數：清除所有認證狀態
function clearAllAuth() {
    console.log('🗑️ 清除所有認證狀態...')
    localStorage.removeItem('auth.ms')
    localStorage.removeItem('login_state')
    chrome.storage.local.remove(['auth.ms'], () => {
        console.log('✅ 已清除')
    })
}

console.log(`
ℹ️ 可用的輔助函數：
  - manualTokenRefresh()  : 手動刷新 Token
  - clearAllAuth()        : 清除所有認證狀態
`)
