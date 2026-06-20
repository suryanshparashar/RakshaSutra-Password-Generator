import { useCallback, useEffect, useRef, useState } from "react"
import {
    Copy,
    RefreshCw,
    Eye,
    EyeOff,
    Zap,
    Check,
    Type,
    ShieldCheck,
    Info,
    Target,
} from "lucide-react"
import {
    EASY_TYPE_LENGTH,
    calculateLiveEntropy,
    generateEasyTypePassword,
    generateMaxSecurityPassword,
    getCrackTimeLabel,
    getStrengthColor,
    getStrengthText,
} from "./lib/crypto-core.js"
import "./App.css"

const LENGTH_PRESETS = [12, 16, 20, 24, 32]

type PasswordType = "easytype" | "maxsecurity"

const generateFor = (
    passwordType: PasswordType,
    length: number,
    includeSpecial: boolean
): string =>
    passwordType === "easytype"
        ? generateEasyTypePassword()
        : generateMaxSecurityPassword(length, includeSpecial)

function App() {
    const [passwordType, setPasswordType] = useState<PasswordType>("easytype")
    const [length, setLength] = useState(16)
    const [includeSpecial, setIncludeSpecial] = useState(true)
    // A1: generated synchronously during initial render so the popup is
    // never shown in an empty/dead state — there is no "click to start".
    const [password, setPassword] = useState(() =>
        generateFor("easytype", 16, true)
    )
    const [alert, setAlert] = useState({ show: false, message: "", type: "" })
    const [isGenerating, setIsGenerating] = useState(false)
    const [showPassword, setShowPassword] = useState(true)
    const [copied, setCopied] = useState(false)
    const passwordRef = useRef(password)
    passwordRef.current = password

    const showAlert = useCallback((message: string, type: string) => {
        setAlert({ show: true, message, type })
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000)
    }, [])

    const legacyCopy = (text: string): boolean => {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand("copy")
        document.body.removeChild(textarea)
        return ok
    }

    const copyPassword = useCallback(async () => {
        const current = passwordRef.current
        if (!current) {
            showAlert("Generate a password first", "warning")
            return
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(current)
            } else if (!legacyCopy(current)) {
                throw new Error("execCommand copy was rejected")
            }
            setCopied(true)
            showAlert("Copied ✓", "success")
            setTimeout(() => setCopied(false), 1500)
        } catch (err) {
            showAlert("Failed to copy password: " + err, "error")
        }
    }, [showAlert])

    // A5: opt-in only — never runs without this explicit click. Uses
    // activeTab + scripting (granted only for the tab the user is
    // currently looking at) to set the value of the focused
    // input[type="password"] on the page, or the first one if none is
    // focused, then fires input/change so framework-bound forms notice.
    const fillOnPage = useCallback(async () => {
        const current = passwordRef.current
        if (!current) {
            showAlert("Generate a password first", "warning")
            return
        }

        try {
            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            })
            const tabId = tabs[0]?.id
            if (!tabId) throw new Error("no active tab")

            const [{ result: filled }] = await chrome.scripting.executeScript({
                target: { tabId },
                func: (value: string) => {
                    const fields = Array.from(
                        document.querySelectorAll<HTMLInputElement>(
                            'input[type="password"]'
                        )
                    )
                    if (fields.length === 0) return false

                    const active = document.activeElement
                    const target =
                        active instanceof HTMLInputElement &&
                        fields.includes(active)
                            ? active
                            : fields[0]

                    // React (and several other frameworks) override the
                    // native `value` setter on the input prototype to track
                    // changes internally. Setting `target.value = value`
                    // directly only writes through React's shadowed setter,
                    // which doesn't update React's recorded "last value" —
                    // so the subsequent native `input` event gets swallowed
                    // by React's own dedupe check and the framework never
                    // sees a change. Calling the *native* prototype's setter
                    // bypasses the override and writes the real DOM value,
                    // so the dispatched event is then seen as a genuine change.
                    const proto = Object.getPrototypeOf(target)
                    const descriptor =
                        Object.getOwnPropertyDescriptor(proto, "value") ||
                        Object.getOwnPropertyDescriptor(
                            HTMLInputElement.prototype,
                            "value"
                        )
                    descriptor?.set?.call(target, value)

                    target.dispatchEvent(new Event("input", { bubbles: true }))
                    target.dispatchEvent(
                        new Event("change", { bubbles: true })
                    )

                    const originalOutline = target.style.outline
                    target.style.outline = "2px solid #2A93D2"
                    setTimeout(() => {
                        target.style.outline = originalOutline
                    }, 1000)

                    return true
                },
                args: [current],
            })

            showAlert(
                filled ? "Filled into page" : "No password field on this page",
                filled ? "success" : "warning"
            )
        } catch (err) {
            showAlert("Couldn't fill page: " + err, "error")
        }
    }, [showAlert])

    const generatePassword = useCallback(() => {
        if (isGenerating) return
        setIsGenerating(true)
        setCopied(false)

        setTimeout(() => {
            setPassword(generateFor(passwordType, length, includeSpecial))
            setIsGenerating(false)
        }, 360)
    }, [isGenerating, passwordType, length, includeSpecial])

    // A2: Ctrl/Cmd+C copies the current password from anywhere in the
    // popup, as long as the user isn't copying an actual text selection
    // (e.g. from a future text field) — copy is the hero action here.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isCopyChord = (e.ctrlKey || e.metaKey) && e.key === "c"
            if (!isCopyChord) return
            const hasSelection = (window.getSelection()?.toString().length ?? 0) > 0
            if (hasSelection) return
            e.preventDefault()
            copyPassword()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [copyPassword])

    // A3/A4: entropy, strength, and crack-time are derived live from the
    // *currently selected settings* (mode/length/charset), not frozen at
    // the moment of the last generation. Dragging the length slider or
    // toggling special characters updates these immediately, with no
    // regenerate required.
    const entropy = calculateLiveEntropy(passwordType, length, includeSpecial)
    const strengthColor = getStrengthColor(passwordType, length)
    const strengthText = getStrengthText(passwordType, length)
    const crackTimeLabel = getCrackTimeLabel(entropy)
    const gaugeDeg = (Math.min(entropy, 160) / 160) * 360
    const sliderPct = ((length - 8) / 24) * 100
    const displayLength = passwordType === "easytype" ? EASY_TYPE_LENGTH : length

    return (
        <div className="popup">
            <div className="popup-card">
                <header className="popup-header">
                    <div className="popup-brand">
                        <div className="brand-badge">
                            <img
                                src="/logo.png"
                                width={26}
                                height={26}
                                alt=""
                            />
                        </div>
                        <div>
                            <div className="brand-name">RakshaSutra</div>
                            <div className="brand-sub">Password Forge</div>
                        </div>
                    </div>
                    <div className="secure-badge">SECURE</div>
                </header>

                <div className="mode-tabs">
                    <button
                        className={`mode-tab ${passwordType === "easytype" ? "active" : ""}`}
                        onClick={() => {
                            setPasswordType("easytype")
                            setPassword(generateFor("easytype", length, includeSpecial))
                            setCopied(false)
                        }}
                    >
                        <Type size={17} />
                        Easy Type
                    </button>
                    <button
                        className={`mode-tab ${passwordType === "maxsecurity" ? "active" : ""}`}
                        onClick={() => {
                            setPasswordType("maxsecurity")
                            setPassword(
                                generateFor("maxsecurity", length, includeSpecial)
                            )
                            setCopied(false)
                        }}
                    >
                        <ShieldCheck size={17} />
                        Max Security
                    </button>
                </div>

                <div className="specimen">
                    <div className="specimen-top">
                        <span className="specimen-label">Your password</span>
                        <div className="specimen-actions">
                            <button
                                className="icon-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                title={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </button>
                            <button
                                className="icon-btn"
                                onClick={generatePassword}
                                title="Regenerate"
                            >
                                <RefreshCw
                                    size={16}
                                    className={isGenerating ? "spinning" : ""}
                                />
                            </button>
                            <button
                                className={`icon-btn icon-btn-primary ${copied ? "copied" : ""}`}
                                onClick={copyPassword}
                                title="Copy password (Ctrl/Cmd+C)"
                            >
                                {copied ? (
                                    <Check size={17} />
                                ) : (
                                    <Copy size={17} />
                                )}
                            </button>
                        </div>
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        readOnly
                        className="specimen-field"
                    />
                </div>

                <button
                    className="fill-page-btn"
                    onClick={fillOnPage}
                    title="Fill the focused password field on this tab"
                >
                    <Target size={15} />
                    Fill on page
                </button>

                <div className="gauge-row">
                    <div
                        className="gauge"
                        style={{
                            background: `conic-gradient(${strengthColor} ${gaugeDeg}deg, #19222f ${gaugeDeg}deg)`,
                        }}
                    >
                        <div className="gauge-inner">
                            <span className="gauge-value">{entropy}</span>
                            <span className="gauge-unit">bits</span>
                        </div>
                    </div>
                    <div className="meta-list">
                        <div className="meta-row">
                            <span className="meta-row-label">Strength</span>
                            <span
                                className="meta-row-value"
                                style={{ color: strengthColor }}
                            >
                                {strengthText}
                            </span>
                        </div>
                        <div className="meta-divider" />
                        <div className="meta-row">
                            <span className="meta-row-label">Length</span>
                            <span className="meta-row-value">
                                {displayLength}
                            </span>
                        </div>
                        <div className="meta-divider" />
                        <div className="meta-row">
                            <span className="meta-row-label">
                                Time to crack
                            </span>
                            <span className="meta-row-value meta-row-value-accent">
                                {crackTimeLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {passwordType === "easytype" && (
                    <div className="info-callout">
                        <Info size={16} />
                        <span>
                            20-character syllable pattern — easy to type on any
                            device, no manager needed.
                        </span>
                    </div>
                )}

                {passwordType === "maxsecurity" && (
                    <div className="max-controls">
                        <div className="length-presets">
                            {LENGTH_PRESETS.map((n) => (
                                <button
                                    key={n}
                                    className={`preset ${length === n ? "active" : ""}`}
                                    onClick={() => setLength(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <input
                            type="range"
                            min="8"
                            max="32"
                            value={length}
                            onChange={(e) => setLength(Number(e.target.value))}
                            className="length-slider"
                            style={{
                                background: `linear-gradient(to right, ${strengthColor} 0%, ${strengthColor} ${sliderPct}%, #1b2433 ${sliderPct}%, #1b2433 100%)`,
                            }}
                        />
                        <label className="special-toggle">
                            <input
                                type="checkbox"
                                checked={includeSpecial}
                                onChange={(e) =>
                                    setIncludeSpecial(e.target.checked)
                                }
                            />
                            <span className="toggle-text">
                                <span className="toggle-title">
                                    Include special characters
                                </span>
                                <span className="toggle-hint">
                                    !@#$%^&amp;*()_+-=[]
                                </span>
                            </span>
                        </label>
                    </div>
                )}

                <button
                    className="generate-btn"
                    onClick={generatePassword}
                    disabled={isGenerating}
                >
                    <Zap size={18} className={isGenerating ? "spinning" : ""} />
                    {isGenerating ? "Regenerating…" : "Regenerate"}
                </button>
            </div>

            {alert.show && (
                <div className={`popup-toast toast-${alert.type}`}>
                    <Check size={17} />
                    <span>{alert.message}</span>
                </div>
            )}
        </div>
    )
}

export default App