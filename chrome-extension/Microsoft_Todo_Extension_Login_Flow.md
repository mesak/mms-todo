# Microsoft To Do 扩展 - 微软登录（OAuth 2.0 + PKCE）流程

文档目的：为后续接手的 AGENT 快速了解并复用当前扩展的微软登录实现，包含端到端流程、关键代码位置、必要配置、常见错误与排查、以及本地验证方法。

更新时间：2025-09-20
目标版本：v1.0.2（Manifest V3）

---

## 一、总体架构

- 身份验证：OAuth 2.0 Authorization Code with PKCE
- 调用入口：popup.js（登录按钮 -> 向 background.js 发消息）
- 主实现：background.js（构建授权 URL、WebAuthFlow、换取/刷新 Token）
- Token 存储：chrome.storage.local（access_token、refresh_token、expires_at）
- 定时维护：chrome.alarms（每 25 分钟检查/刷新）
- 资源权限：manifest.json 中声明 identity/storage/notifications/alarms 以及 Microsoft 端点

## 二、关键配置与代码位置

- 文件：`manifest.json`
  - client_id：`oauth2.client_id = client_id`（Azure AD 应用注册的应用 ID）
  - scopes：`Tasks.ReadWrite`, `User.Read`, `offline_access`
  - permissions：`identity`, `storage`, `notifications`, `alarms`
  - host_permissions：`https://login.microsoftonline.com/`, `https://graph.microsoft.com/`

- 文件：`background.js`
  - 常量：`CLIENT_ID`，`REDIRECT_URI = chrome.identity.getRedirectURL("oauth2")`
  - 核心函数：
    - `getAuthCode()`：生成 PKCE，`launchWebAuthFlow` 获取授权码
    - `exchangeCodeForToken(code)`：调用 token 端点换取 token
    - `refreshAccessToken()`：使用 refresh_token 刷新 access_token
    - `getValidAccessToken()`：统一获取可用 token（含刷新与兜底重授权）
    - Graph API 封装：`getTodoLists`、`getTasks`、`addTaskToMicrosoftToDo`、`toggleTaskStatus`、`deleteTask`
  - 定时任务：`checkAndRefreshToken()` + `chrome.alarms`

- 文件：`popup.js`
  - 登录触发：点击登录按钮 -> `chrome.runtime.sendMessage({ action: 'login_only' })`
  - UI 切换：依据 `access_token` 和 `expires_at` 切换登录/主界面
  - 使用数据：通过 `chrome.runtime.sendMessage` 调用 background.js 获取清单和任务

## 三、OAuth 2.0 + PKCE 端到端流程

1) 用户点击登录（popup.js）
- 清理登录提示标志，发送 `{ action: 'login_only' }` 给 background

2) 构建授权请求（background.js/getAuthCode）
- 生成 `code_verifier`（64字节随机）并存储到 `chrome.storage.local`
- 计算 `code_challenge = base64url(sha256(code_verifier))`
- 组装授权 URL：
  - 授权端点：`https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
  - 必要参数：
    - `client_id`: 与 Azure AD 应用一致
    - `response_type=code`
    - `redirect_uri=chrome.identity.getRedirectURL("oauth2")`
    - `scope=Tasks.ReadWrite User.Read offline_access`
    - `code_challenge` 与 `code_challenge_method=S256`
- 调用 `chrome.identity.launchWebAuthFlow({ url, interactive: true })`

3) 处理重定向回调
- 回调 URL 中解析 `code` 或错误（`error`, `error_description`）
- `code` 存在则进入换取 token 阶段

4) 换取 Token（background.js/exchangeCodeForToken）
- 端点：`https://login.microsoftonline.com/common/oauth2/v2.0/token`
- 请求体（x-www-form-urlencoded）：
  - `client_id`, `grant_type=authorization_code`, `code`
  - `redirect_uri`（与授权阶段一致）
  - `code_verifier`（与前面生成的对应）
- 响应：`access_token`, `refresh_token`, `expires_in`
- 存储：`access_token`, `refresh_token`, `expires_at = now + expires_in*1000`

5) 使用与维护 Token
- 获取：`getValidAccessToken()` 会判断 `expires_at`，小于 5 分钟缓冲即尝试刷新
- 刷新：`refresh_token` 调用 token 端点的 `grant_type=refresh_token`
- 兜底：刷新失败 -> 重新走授权（`getAuthCode` + `exchangeCodeForToken`）
- 定时：安装/启动时设置闹钟，并每 25 分钟检查一次

## 四、Graph API 使用清单

- 列表：GET `v1.0/me/todo/lists`
- 任务（含展开）：GET `v1.0/me/todo/lists/{listId}/tasks?$expand=checklistItems&$top=100`
- 新建：POST `v1.0/me/todo/lists/{listId}/tasks`，body: `{ title }`
- 更新状态：PATCH `v1.0/me/todo/lists/{listId}/tasks/{taskId}`，body: `{ status }`
- 删除：DELETE `v1.0/me/todo/lists/{listId}/tasks/{taskId}`
- 认证头：`Authorization: Bearer ${access_token}`

## 五、错误处理与排查

常见错误来源：
- 授权失败：回调参数 `error`、`error_description`
- Token接口非200：网络失败或参数不匹配
- 刷新失败：`refresh_token` 过期/撤销
- Graph调用失败：权限不足或 token 无效

排查建议：
- 在 `background.js` 中查看详细 console 日志（已打印授权 URL、回调、错误原因）
- 确认 Azure AD 应用中已将 `redirect_uri` 添加为 Chrome 扩展的：`chrome-extension://<extension-id>/oauth2`
- 核对 `client_id` 与 `scopes` 是否与 AzureAD 应用一致
- `host_permissions` 必须包含登录和 Graph 域名
- 检查 `expires_at` 与本地时间是否一致，考虑系统时间偏差

## 六、本地验证清单（交付即用）

1. 安装扩展并打开 popup
2. 点击“登录”，出现微软登录页
3. 完成登录授权后返回扩展，弹出“登录成功”通知
4. 打开任务列表：应能加载清单和未完成任务
5. 添加/完成/删除任务：操作应立即生效
6. 25 分钟后或接近过期时：后台自动刷新 token，无需再次登录

若失败：
- 在扩展的 Service Worker（background）日志中观察错误
- 将 `chrome.storage.local` 中 `access_token/refresh_token/expires_at` 清除后重试

## 七、安全与合规
- 使用 PKCE 防止授权码拦截
- 只请求必要的最小权限（Tasks.ReadWrite、User.Read、offline_access）
- Token 保存在浏览器本地 `chrome.storage.local`，并有过期与刷新机制
- 不在前端硬编码 `client_secret`

## 八、可改进方向
- 增加 token 刷新失败后的用户提示与重试入口
- 本地缓存清单与任务，离线时展示并在恢复后同步
- 支持账号切换与登出后的彻底清理
- i18n 多语言支持

---

附：关键函数快速定位
- `background.js`: `getAuthCode`、`exchangeCodeForToken`、`refreshAccessToken`、`getValidAccessToken`
- `popup.js`: 登录触发、状态切换、发送消息
- `manifest.json`: oauth2 配置与权限、host 权限

---

## 九、登录成功提示通知（新增）

目的：在用户成功登录（换取到 access_token）后，使用 `chrome.notifications` 展示「登录成功」的系统通知。

前置条件：
- `manifest` 必须包含 `notifications` 权限（已配置）
- MV3 背景脚本已启用（Plasmo 下为根目录 `background.ts`/`background.js`）

实现方式（两种选一）：

1) 背景脚本内直接创建通知（登录逻辑就在背景脚本时推荐）

```ts
// background.ts (示例)
function notifyLoginSuccess(username?: string) {
  chrome.notifications.create("login-success-" + Date.now(), {
    type: "basic",
    iconUrl: chrome.runtime.getURL("assets/icon.png"),
    title: "登入成功",
    message: username ? `已成功登入 Microsoft 帐号：${username}` : "已成功登入 Microsoft 帐号",
    priority: 2
  })
}

async function exchangeCodeForToken(code: string) {
  // ...调用 token 接口并成功获取 access_token 后：
  await chrome.storage.local.set({ access_token, refresh_token, expires_at })
  // 触发成功通知：
  notifyLoginSuccess(profile?.displayName)
}
```

2) 从 UI/其他上下文通过 runtime 消息请求背景脚本创建通知（已内置监听器）

```ts
// lib/notifications.ts 已提供封装
import { notifyLoginSuccess } from "../lib/notifications"

// 登录成功后（无论在 popup 或 content），可直接调用：
notifyLoginSuccess(userDisplayName)

// 背景脚本 background.ts 已监听：
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.action === "notify_login_success") {
    // 创建通知
  }
})
```

推荐做法：若登录流程在背景脚本完成，使用方式(1) 最简；若登录在 UI 侧、仅拿到结果，需要背景协助发通知，则使用方式(2)。
