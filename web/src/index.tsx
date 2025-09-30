import { Hono } from 'hono'
import { renderer } from './renderer'
import PrivacyPage from './privacy'

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(renderer)

app.get('/privacy', (c) => {
  return c.render(<PrivacyPage />)
})

app.get('/', (c) => {
  return c.render(
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  src="/static/mms-todo-logo500x500.png" 
                  alt="mms-todo logo" 
                  className="w-8 h-8 rounded-lg"
                />
                <span className="ml-2 text-xl font-bold text-gray-900">mms-todo</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">功能特色</a>
                <a href="#download" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">安裝</a>
                <a href="#about" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">關於</a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/static/banner-1200x630.jpg" 
            alt="mms-todo banner" 
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 opacity-90"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              與 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Microsoft To Do</span> 完美同步
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              一個現代化的 Chrome 擴充功能，讓您在瀏覽器中輕鬆管理 Microsoft To Do 待辦事項，支援即時同步、多平台存取。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#download" 
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                立即安裝
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              </a>
              <a 
                href="#features" 
                className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
              >
                了解更多
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">強大功能</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              mms-todo 提供完整的待辦事項管理體驗，與 Microsoft To Do 無縫整合
            </p>
          </div>

          {/* Feature Banner Display */}
          <div className="mb-16">
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <img 
                src="/static/banner-1200x630.jpg" 
                alt="mms-todo 功能展示" 
                className="w-full h-64 md:h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
                <div className="p-8 text-white">
                  <h3 className="text-2xl font-bold mb-2">現代化的待辦事項管理</h3>
                  <p className="text-lg opacity-90">在 Chrome 瀏覽器中直接管理您的 Microsoft To Do 任務</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Microsoft 帳號整合</h3>
              <p className="text-gray-600">
                使用 OAuth 2.0 + PKCE 安全認證，直接與您的 Microsoft 帳號連接，無需額外註冊。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">即時同步</h3>
              <p className="text-gray-600">
                透過 Microsoft Graph API 與 To Do 應用程式即時同步，在任何裝置上都能保持一致。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4m-6-6V9a2 2 0 012-2h2m0 0V5a2 2 0 012-2h4a2 2 0 012 2v2m0 0v2a2 2 0 01-2 2h-2m0 0h2a2 2 0 012 2v1M11 7h2a2 2 0 012 2v4a2 2 0 01-2 2h-1m-1 0V9a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">多種檢視模式</h3>
              <p className="text-gray-600">
                支援 Popup 快速檢視、Side Panel 完整管理、Options 設定等多種操作介面。
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border border-orange-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">現代化技術</h3>
              <p className="text-gray-600">
                使用 React 18、TypeScript、TanStack Query 等現代化技術棧，提供流暢的使用體驗。
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-2xl border border-teal-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">完整待辦管理</h3>
              <p className="text-gray-600">
                建立、編輯、刪除待辦事項，支援清單分類、標記完成等完整功能。
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-8 rounded-2xl border border-rose-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-rose-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">響應式設計</h3>
              <p className="text-gray-600">
                精美的 UI 設計，搭配 Tailwind CSS 和 shadcn/ui，在各種螢幕尺寸下都完美呈現。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">立即開始使用</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            安裝 mms-todo 擴充功能，開始更高效的待辦事項管理體驗
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://chromewebstore.google.com/detail/bmmgffjkialoohecnglopijlaedbpfig" 
              target="_blank"
              rel="noopener noreferrer"
              title="Chrome Web Store"
              className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-medium rounded-lg text-blue-600 bg-white hover:bg-blue-50 transition-all duration-200 transform hover:scale-105"
            >
              <svg className="mr-3 w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Chrome Web Store
            </a>
            <a 
              href="https://microsoftedge.microsoft.com/addons/detail/mmstodo/lpchebldfhaihkbccoioebbhlnojlmmn" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-medium rounded-lg text-blue-600 bg-white hover:bg-blue-50 transition-all duration-200 transform hover:scale-105"
              title="Edge Store"
            >
              <svg className="mr-3 w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Edge Add-ons
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">關於 mms-todo</h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              mms-todo 是一個現代化的 Chrome 擴充功能，專為需要在瀏覽器中快速存取和管理 Microsoft To Do 待辦事項的使用者而設計。
              我們致力於提供流暢、安全、功能完整的待辦事項管理體驗。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
                <div className="text-gray-600">安全認證</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">即時</div>
                <div className="text-gray-600">資料同步</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">跨平台</div>
                <div className="text-gray-600">完美整合</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <img 
                src="/static/mms-todo-logo500x500.png" 
                alt="mms-todo logo" 
                className="w-8 h-8 rounded-lg mr-3"
              />
              <span className="text-xl font-bold">mms-todo</span>
            </div>
            
            {/* Sponsor Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-gray-400 text-sm">
                喜歡這個專案嗎？考慮贊助我們：
              </div>
              <div className="flex gap-3">
                <a 
                  className="donate inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200" 
                  href="https://paypal.me/mesak" 
                  target="_blank" 
                  rel="noreferrer"
                >
                  <span className="mr-2">💰</span>
                  PayPal 贊助
                </a>
                <a 
                  href="https://www.buymeacoffee.com/mesak" 
                  target="_blank" 
                  rel="noreferrer"
                  className="transition-opacity duration-200 hover:opacity-80"
                >
                  <img 
                    src="https://img.buymeacoffee.com/button-api/?text=Buy me a beer&emoji=🍺&slug=mesak&button_colour=FFDD00&font_colour=000000&font_family=Bree&outline_colour=000000&coffee_colour=ffffff" 
                    alt="Buy me a beer button"
                    className="h-10"
                  />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-6">
            <div className="text-gray-400 text-sm text-center flex justify-center items-center space-x-4">
              <span>© 2025 mms-todo. Made with ❤️ for productivity.</span>
              <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">隱私權政策</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
})

export default app
