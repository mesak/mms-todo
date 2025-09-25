import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="zh-TW">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* SEO Meta Tags */}
        <title>mms-todo - Microsoft To Do Chrome 擴充功能 | 即時同步待辦事項管理</title>
        <meta name="description" content="mms-todo 是一個現代化的 Chrome 擴充功能，與 Microsoft To Do 完美整合。支援即時同步、安全認證、多平台存取，讓您在瀏覽器中輕鬆管理待辦事項。" />
        <meta name="keywords" content="Microsoft To Do, Chrome Extension, 待辦事項, 生產力工具, 任務管理, 同步, 擴充功能" />
        <meta name="author" content="mms-todo Team" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="mms-todo - Microsoft To Do Chrome 擴充功能" />
        <meta property="og:description" content="與 Microsoft To Do 完美同步的現代化 Chrome 擴充功能，提升您的生產力！" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/static/banner-1200x630.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="mms-todo - Microsoft To Do Chrome Extension" />
        <meta property="og:site_name" content="mms-todo" />
        <meta property="og:locale" content="zh_TW" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="mms-todo - Microsoft To Do Chrome 擴充功能" />
        <meta name="twitter:description" content="與 Microsoft To Do 完美同步的現代化 Chrome 擴充功能，提升您的生產力！" />
        <meta name="twitter:image" content="/static/banner-1200x630.jpg" />
        <meta name="twitter:image:alt" content="mms-todo Chrome Extension" />
        
        {/* Favicon and Icons */}
        <link rel="icon" type="image/x-icon" href="/static/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/static/mms-todo-logo500x500.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/static/mms-todo-logo500x500.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/static/mms-todo-logo500x500.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3b82f6" />
        
        {/* Additional Meta Tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="mms-todo" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://mms-todo.wiz.tw" />
        
        {/* DNS Prefetch for Performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
        
        {/* Preload Critical Resources */}
        <link rel="preload" href="/static/style.css" as="style" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "mms-todo",
            "description": "一個與 Microsoft To Do 完美同步的現代化 Chrome 擴充功能",
            "applicationCategory": "Productivity",
            "operatingSystem": "Chrome OS, Windows, macOS, Linux",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "author": {
              "@type": "Organization",
              "name": "mms-todo Team"
            },
            "downloadUrl": "https://chrome.google.com/webstore",
            "screenshot": "/static/banner-1200x630.jpg",
            "featureList": [
              "Microsoft To Do 即時同步",
              "安全的 OAuth 2.0 認證",
              "多種檢視模式",
              "現代化 UI 設計",
              "完整待辦事項管理",
              "跨平台支援"
            ]
          })}
        </script>
        
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
})
