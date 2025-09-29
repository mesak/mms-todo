import { cpSync, existsSync, mkdirSync, rmSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const ROOT = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(ROOT, "..")
const srcDir = join(projectRoot, "_locales")

if (!existsSync(srcDir)) {
  console.error("[copy-locales] Source _locales directory not found at", srcDir)
  process.exit(1)
}

const buildRoot = join(projectRoot, "build")
const targets = ["chrome-mv3-dev", "chrome-mv3-prod"]

for (const target of targets) {
  const targetRoot = join(buildRoot, target)
  if (!existsSync(targetRoot)) {
    // Skip targets that haven't been generated in this build
    continue
  }

  const destDir = join(targetRoot, "_locales")

  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true })
  }

  mkdirSync(dirname(destDir), { recursive: true })
  cpSync(srcDir, destDir, { recursive: true })
  console.log(`[copy-locales] Copied _locales to ${destDir}`)
}
