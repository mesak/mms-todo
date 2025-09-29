import * as React from "react"
import { LogIn } from "lucide-react"
import { Button } from "./button"
import { debounce } from "../../lib/utils"
import { useAuth as useAuthHook } from "../../hooks/useAuth"
import { useI18n } from "../../lib/i18n"

export type AuthPhase = "initializing" | "refreshing" | "ready" | "prompt" | "error"
export type AuthFlowStep = "checking-token" | "checking-refresh-token" | "exchanging-new-token" | "done" | "error"

export type AuthLike = {
  token?: string
  isLoggedIn: boolean
  isLoading: boolean
  phase?: AuthPhase
  flowStep?: AuthFlowStep
  login: () => Promise<void> | void
  logout: () => Promise<void> | void
}

type AuthGateProps = {
  children: React.ReactNode
  /**
   * Pass external auth snapshot to avoid duplicate hooks. If omitted, AuthGate will call useAuth internally.
   */
  auth?: AuthLike
  /**
   * Visual density of the prompt screens.
   */
  size?: "sm" | "md"
  className?: string
  /** Override the login description text */
  loginTitle?: string
}

export function AuthGate({ children, auth, size = "md", className, loginTitle }: AuthGateProps) {
  const internal = useAuthHook()
  const a = auth ?? internal
  const { t } = useI18n()
  const resolvedLoginTitle = loginTitle ?? t("login_prompt")

  const onLoginClick = React.useMemo(() => debounce(() => { a.login?.() }, 800, true, false), [a.login])

  const loadingEl = (
    <div className={`w-full h-full min-h-[420px] flex items-center justify-center p-6 ${className ?? ""}`}>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="relative flex h-4 w-4">
          <span className="animate-spin inline-flex h-full w-full rounded-full border-2 border-current border-t-transparent"></span>
        </span>
        {t("loading")}
      </div>
    </div>
  )

  const refreshingEl = (
    <div className={`w-full h-full min-h-[420px] flex flex-col items-center justify-center gap-4 p-8 ${className ?? ""}`}>
      <div className="flex items-center gap-3 text-base font-medium text-foreground">
        <span className="relative flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-5 w-5 bg-primary"></span>
        </span>
        {t("verifying")}
      </div>
      <div className="text-sm text-muted-foreground text-center bg-muted/50 px-6 py-3 rounded-lg border max-w-sm">
        {a.flowStep === "checking-token" && t("checking_access_token")}
        {a.flowStep === "checking-refresh-token" && t("checking_refresh_token")}
        {a.flowStep === "exchanging-new-token" && t("exchanging_access_token")}
        {a.flowStep === "done" && t("verification_done")}
        {a.flowStep === "error" && t("verification_failed")}
      </div>
    </div>
  )

  const loggedOutEl = (
    <div className={`w-full h-full min-h-[420px] flex flex-col items-center justify-center gap-4 ${className ?? ""}`}>
      <div className={size === "sm" ? "text-sm font-medium" : "text-base font-medium"}>{resolvedLoginTitle}</div>
      <Button onClick={onLoginClick} className={size === "sm" ? "h-8 px-3" : undefined}>
        <span className="inline-flex items-center gap-2">
          <LogIn className="h-4 w-4" />
          {t("sign_in")}
        </span>
      </Button>
    </div>
  )

  if (a.isLoading) return loadingEl
  if (a.phase === "refreshing") return refreshingEl
  if (!a.isLoggedIn) return loggedOutEl

  return <>{children}</>
}

export default AuthGate
