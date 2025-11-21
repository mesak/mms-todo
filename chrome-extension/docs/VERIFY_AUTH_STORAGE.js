// 在 Chrome 擴展的 DevTools Console 中執行此腳本來驗證修復

console.log("========================================")
console.log("🔍 認證系統儲存一致性驗證腳本")
console.log("========================================\n")

// 1. 檢查 localStorage
console.log("1️⃣ 檢查 localStorage 認證狀態：")
const localStorageAuth = localStorage.getItem("auth.ms")
if (localStorageAuth) {
    try {
        const auth = JSON.parse(localStorageAuth)
        console.log("   ✅ localStorage 中找到 auth.ms")
        console.log("   - Access Token:", auth.accessToken ? `${auth.accessToken.substring(0, 20)}...` : "無")
        console.log("   - Refresh Token:", auth.refreshToken ? "存在" : "不存在")
        console.log("   - Expires At:", auth.expiresAt ? new Date(auth.expiresAt).toISOString() : "無")

        // 檢查是否過期
        const isExpired = auth.expiresAt ? Date.now() >= auth.expiresAt - 30_000 : true
        if (isExpired) {
            console.log("   ⚠️ Token 已過期或即將過期")
        } else {
            console.log("   ✅ Token 有效")
        }
    } catch (e) {
        console.log("   ❌ localStorage auth.ms 格式錯誤:", e)
    }
} else {
    console.log("   ℹ️ localStorage 中未找到 auth.ms（未登入）")
}

// 2. 檢查 chrome.storage.local
console.log("\n2️⃣ 檢查 chrome.storage.local 認證狀態：")
chrome.storage.local.get(["auth.ms"], (result) => {
    if (chrome.runtime.lastError) {
        console.log("   ❌ 讀取 chrome.storage.local 失敗：", chrome.runtime.lastError)
        return
    }

    if (result["auth.ms"]) {
        console.log("   ⚠️ chrome.storage.local 中找到 auth.ms")
        console.log("   ⚠️ 警告：修復後應該只使用 localStorage！")
        console.log("   ℹ️ 資料:", result["auth.ms"])
    } else {
        console.log("   ✅ chrome.storage.local 中未找到 auth.ms（正確，已遷移到 localStorage）")
    }

    // 3. 一致性檢查
    console.log("\n3️⃣ 儲存一致性檢查：")
    const hasLocalStorage = !!localStorageAuth
    const hasChromeStorage = !!result["auth.ms"]

    if (!hasLocalStorage && !hasChromeStorage) {
        console.log("   ✅ 兩者都無認證資料（未登入狀態正常）")
    } else if (hasLocalStorage && !hasChromeStorage) {
        console.log("   ✅ 只有 localStorage 有資料（修復成功！）")
    } else if (!hasLocalStorage && hasChromeStorage) {
        console.log("   ❌ 只有 chrome.storage.local 有資料（需要清理）")
    } else {
        console.log("   ⚠️ 兩者都有資料（可能不一致）")
        try {
            const localAuth = JSON.parse(localStorageAuth)
            const chromeAuth = result["auth.ms"]
            if (JSON.stringify(localAuth) === JSON.stringify(chromeAuth)) {
                console.log("   ✅ 資料一致")
            } else {
                console.log("   ❌ 資料不一致！")
                console.log("   localStorage:", localAuth)
                console.log("   chrome.storage.local:", chromeAuth)
            }
        } catch (e) {
            console.log("   ❌ 比對失敗:", e)
        }
    }

    // 4. 其他相關資料檢查
    console.log("\n4️⃣ 其他相關資料：")
    console.log("   - ms_account (localStorage):", localStorage.getItem("ms_account") || "無")
    console.log("   - rq-mms-todo (localStorage):", localStorage.getItem("rq-mms-todo") ? "存在" : "無")
    console.log("   - login_state (localStorage):", localStorage.getItem("login_state") || "無")

    console.log("\n========================================")
    console.log("5️⃣ 建議操作：")
    if (hasChromeStorage && hasLocalStorage) {
        console.log("   🔧 建議執行清理：")
        console.log("   chrome.storage.local.remove(['auth.ms'], () => console.log('已清理 chrome.storage.local'))")
    } else if (!hasLocalStorage && !hasChromeStorage) {
        console.log("   ✅ 正常（未登入）")
    } else if (hasLocalStorage) {
        console.log("   ✅ 修復成功！只使用 localStorage")
    }
    console.log("========================================")
})

// 5. 提供手動測試命令
console.log("\n6️⃣ 手動測試命令：")
console.log("要測試登出清理，執行：")
console.log("// 模擬登出")
console.log("localStorage.removeItem('auth.ms')")
console.log("localStorage.removeItem('ms_account')")
console.log("localStorage.removeItem('rq-mms-todo')")
console.log("chrome.storage.local.remove(['auth.ms', 'ms_account', 'todos', 'categories'])")
console.log("location.reload()")
