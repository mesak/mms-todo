const PrivacyPage = () => (
  <div className="min-h-screen bg-gray-50">
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <a href="/" className="flex-shrink-0 flex items-center">
              <img
                src="/static/mms-todo-logo500x500.png"
                alt="mms-todo logo"
                className="w-8 h-8 rounded-lg"
              />
              <span className="ml-2 text-xl font-bold text-gray-900">mms-todo</span>
            </a>
          </div>
        </div>
      </div>
    </nav>

    <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-lg">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 border-b pb-4">
          隱私權政策（Chrome 線上應用程式商店）
        </h1>
        <p className="text-sm text-gray-500 mb-8">生效日期：2025-09-22</p>

        <div className="prose prose-indigo max-w-none">
          <p>
            感謝您使用「mms-todo」Chrome 擴充功能（以下稱「本擴充功能」）。我們重視您的隱私與資料安全。本政策說明我們如何於本擴充功能中收集、使用、儲存與分享資料，並符合 Chrome 線上應用程式商店之使用者資料政策要求。
          </p>
          <p>
            本政策僅適用於本擴充功能，且不適用於第三方網站或服務（例如 Microsoft 的登入頁面與 Microsoft Graph API）。
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">我們處理的資料類型</h2>
          <p>
            本擴充功能不會蒐集或傳送任何個人資料至開發者自有伺服器。所有資料皆在您的瀏覽器本機儲存，或直接與 Microsoft 官方服務通訊。
          </p>
          <p>我們可能處理的資料包含：</p>
          <ul>
            <li>
              <strong>Microsoft 帳號授權資訊：</strong>
              存取權杖（access token）、更新權杖（refresh token）、有效期限（expiresAt）。僅儲存在瀏覽器本機（chrome.storage.local）。
            </li>
            <li>
              <strong>Microsoft Graph To Do 內容（由您於 Microsoft 帳號擁有）：</strong>
              待辦清單與任務的標題、狀態與其他欄位（透過 Microsoft Graph API 即時讀取/寫入）。為了加速 UI 顯示，待辦清單/任務可能暫存於本機快取（例如 React Query 持久化快取或 localStorage），僅用於您本機的使用體驗。
            </li>
            <li>
              <strong>使用者偏好設定：</strong>
              UI 相關設定（字體、大小等）、側邊欄展開狀態、已選清單等，儲存在本機（chrome.storage.local 或頁面 localStorage）。
            </li>
          </ul>
          <p>
            本擴充功能不會主動收集敏感類別資料（例如健康、財務、生物特徵等），亦不進行行為追蹤或第三方分析。
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">資料使用目的</h2>
          <p>我們僅將資料用於提供與改善本擴充功能之核心功能：</p>
          <ul>
            <li>完成 Microsoft OAuth 登入並取得 Microsoft Graph 權限範圍（Tasks.ReadWrite、User.Read、offline_access）。</li>
            <li>顯示、建立、更新與刪除您的 Microsoft To Do 待辦事項與附件（皆透過 Microsoft Graph API 與 Microsoft 之伺服器直接通訊）。</li>
            <li>提供本機體驗（例如記住您最後選擇的清單、UI 設定、快取清單/任務以加快載入）。</li>
            <li>顯示必要的系統提示（如登入成功通知）。</li>
          </ul>
          <p>
            我們不會將您的資料用於廣告、行銷、再行銷，亦不會用於建立、改善或訓練一般化的 AI/ML 模型。
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">資料分享與轉移</h2>
          <ul>
            <li>不出售、不出租您的資料。</li>
            <li>不與第三方分享您的個人資料，除了：為提供核心功能而必要之 Microsoft 官方服務（登入與 Microsoft Graph API）。</li>
            <li>不向開發者自有伺服器或其他非必要服務上傳您的待辦內容或權杖。</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">儲存位置與保留期間</h2>
          <ul>
            <li>權杖與設定皆儲存在瀏覽器本機（chrome.storage.local 或頁面 localStorage）。</li>
            <li>React Query 的快取亦僅保留在本機，用於提升載入速度。</li>
            <li>當您「登出」時，本擴充功能會清除本機的授權資訊。</li>
            <li>當偵測到帳號切換（不同 Microsoft 帳號）時，會清除與使用者相關之本機資料與快取以避免交叉顯示。</li>
            <li>您也可透過「移除擴充功能」或清除瀏覽資料來移除本機資料。</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">權限與用途說明</h2>
          <p>本擴充功能在 Manifest 中請求以下權限：</p>
          <ul>
            <li><strong>identity：</strong>用於啟動 OAuth 2.0 登入流程（chrome.identity.launchWebAuthFlow）以登入 Microsoft 帳號。</li>
            <li><strong>storage：</strong>儲存本機的登入狀態、UI 設定與快取。</li>
            <li><strong>notifications：</strong>顯示登入成功等必要提示。</li>
            <li><strong>alarms：</strong>用於必要的背景排程（例如權杖更新或資料同步排程，如有使用）。</li>
            <li>
              <strong>host_permissions：</strong>
              <ul>
                <li>https://login.microsoftonline.com/*（Microsoft 登入與權杖交換）</li>
                <li>https://graph.microsoft.com/*（Microsoft Graph API 讀寫 To Do 資料）</li>
              </ul>
            </li>
          </ul>
          <p>我們僅在提供核心功能時使用上述權限，且不進行與功能無關之資料存取。</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Microsoft Graph 與 OAuth</h2>
          <ul>
            <li>您的 Microsoft 帳號驗證與授權由 Microsoft 官方頁面完成，授權範圍僅限提供待辦事項功能之必要權限。</li>
            <li>權杖僅用於呼叫 Microsoft Graph API；不會傳送到開發者自有伺服器。</li>
            <li>我們遵循 Microsoft API 使用條款與政策，並僅在您主動操作功能時進行相關 API 呼叫。</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">使用者控制與資料刪除</h2>
          <ul>
            <li><strong>登出：</strong>於擴充功能中登出後，會清除本機儲存的權杖與使用者相關資料。</li>
            <li><strong>帳號切換：</strong>偵測到帳號切換時，自動清空與先前帳號相關之資料快取。</li>
            <li><strong>移除擴充功能：</strong>在瀏覽器移除本擴充功能後，本機儲存的資料將不再被使用；您亦可使用瀏覽器提供的「清除瀏覽資料」功能移除殘留快取。</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">安全性</h2>
          <ul>
            <li>權杖與設定僅儲存在您的本機，且在不同使用者帳號間進行隔離與快取清除以降低混用風險。</li>
            <li>與 Microsoft 服務的通訊透過 HTTPS 完成。</li>
            <li>然而，任何軟體皆可能存在風險。我們建議您保持瀏覽器與擴充功能更新，並設定安全的帳號密碼與多重驗證。</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">兒童隱私</h2>
          <p>本擴充功能並非為 13 歲以下兒童設計或鎖定。</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">政策更新</h2>
          <p>我們可能因功能或法規變更而更新本政策。重大變更將更新於此檔案並標示最新「生效日期」。</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">聯絡我們</h2>
          <p>若您對本政策或您的資料權利有任何疑問，請聯絡：</p>
          <ul>
            <li>開發者：mesak</li>
            <li>Email：mesakey@gmail.com</li>
          </ul>

          <hr className="my-8" />

          <p className="text-sm text-gray-600">
            附註：本擴充功能不進行廣告或分析追蹤，不出售或出租資料，亦不使用您的資料來建立一般化 AI/ML 模型。您的待辦資料屬於您的 Microsoft 帳號；本擴充功能僅在您的授權下，透過 Microsoft Graph API 讀寫這些資料。
          </p>
        </div>
      </div>
    </main>

    <footer className="bg-gray-900 text-white py-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-gray-400 text-sm text-center">
          © 2025 mms-todo. Made with ❤️ for productivity.
        </div>
      </div>
    </footer>
  </div>
);

export default PrivacyPage;