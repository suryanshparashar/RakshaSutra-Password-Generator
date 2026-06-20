// B2: bakes the GitHub star count into public/index.html at build time
// (Vercel's buildCommand), so the deployed landing page makes zero runtime
// network calls to show it — the number is just static text by the time a
// visitor's browser sees it.
//
// Idempotent: replaces the contents of <span id="star-count">...</span>
// by id, so re-running (e.g. on every deploy) just refreshes the number
// rather than depending on a one-time placeholder token.
//
// Network failures (rate limit, offline, GitHub down) must never fail the
// build — we log a warning and leave whatever number is already baked in.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexPath = resolve(__dirname, "../public/index.html")
const REPO = "suryanshparashar/RakshaSutra-KeyGen-Extension"

function formatStars(count) {
    if (count < 1000) return String(count)
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`
}

async function main() {
    let stars
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO}`, {
            headers: { Accept: "application/vnd.github+json" },
        })
        if (!res.ok) throw new Error(`GitHub API responded ${res.status}`)
        const data = await res.json()
        stars = formatStars(data.stargazers_count ?? 0)
    } catch (err) {
        console.warn(
            "[fetch-github-stars] could not fetch star count, leaving existing value:",
            err.message
        )
        return
    }

    const html = readFileSync(indexPath, "utf8")
    // Attributes may be spread across lines (Prettier's HTML formatting),
    // so match past the id attribute to the tag's closing ">" rather than
    // assuming `<span id="star-count">` is contiguous.
    const pattern = /(id="star-count"[\s\S]*?>)([^<]*)(<\/span)/

    if (!pattern.test(html)) {
        console.warn(
            "[fetch-github-stars] star-count span not found in public/index.html; nothing updated"
        )
        return
    }

    const updated = html.replace(pattern, `$1${stars}$3`)
    writeFileSync(indexPath, updated, "utf8")
    console.log(`[fetch-github-stars] baked star count: ${stars}`)
}

await main()