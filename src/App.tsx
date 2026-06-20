import { useState, useCallback } from "react"
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
} from "lucide-react"
import "./App.css"

const getSecureRandomInt = (max: number): number => {
    const randomBuffer = new Uint32Array(1)
    let randomValue: number
    const limit = Math.floor(2 ** 32 / max) * max

    do {
        crypto.getRandomValues(randomBuffer)
        randomValue = randomBuffer[0]
    } while (randomValue >= limit)

    return randomValue % max
}

const LENGTH_PRESETS = [12, 16, 20, 24, 32]

function App() {
    const [passwordType, setPasswordType] = useState<
        "easytype" | "maxsecurity"
    >("easytype")
    const [length, setLength] = useState(16)
    const [includeSpecial, setIncludeSpecial] = useState(true)
    const [password, setPassword] = useState("")
    const [entropy, setEntropy] = useState(0)
    const [alert, setAlert] = useState({ show: false, message: "", type: "" })
    const [isGenerating, setIsGenerating] = useState(false)
    const [showPassword, setShowPassword] = useState(true)
    const [copied, setCopied] = useState(false)

    const showAlert = useCallback((message: string, type: string) => {
        setAlert({ show: true, message, type })
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000)
    }, [])

    const generateAppleStylePassword = useCallback((): string => {
        const consonants = "bcdfghjklmnpqrstvwxyz"
        const vowels = "aeiouy"

        const generateSyllable = (): string => {
            const c1 = consonants[getSecureRandomInt(consonants.length)]
            const v = vowels[getSecureRandomInt(vowels.length)]
            const c2 = consonants[getSecureRandomInt(consonants.length)]
            return c1 + v + c2
        }

        const syllables = Array.from({ length: 6 }, () => generateSyllable())

        const password = `${syllables[0]}${syllables[1]}-${syllables[2]}${syllables[3]}-${syllables[4]}${syllables[5]}`

        const chars = password.split("")

        const letterIndices = chars
            .map((char, idx) => (char !== "-" ? idx : -1))
            .filter((idx) => idx !== -1)
        const uppercaseIdx =
            letterIndices[getSecureRandomInt(letterIndices.length)]
        chars[uppercaseIdx] = chars[uppercaseIdx].toUpperCase()

        const digitIdx = letterIndices.filter((idx) => idx !== uppercaseIdx)[
            getSecureRandomInt(letterIndices.length - 1)
        ]
        chars[digitIdx] = getSecureRandomInt(10).toString()

        return chars.join("")
    }, [])

    const generateRandomPassword = useCallback(
        (len: number, includeSpecial: boolean): string => {
            const lower = "abcdefghijklmnopqrstuvwxyz"
            const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            const digits = "0123456789"
            const special = "!@#$%^&*()-_=+[]{}|;:,.<>?/~"

            let charset = lower + upper + digits
            if (includeSpecial) charset += special

            const required: string[] = []
            required.push(lower[getSecureRandomInt(lower.length)])
            required.push(upper[getSecureRandomInt(upper.length)])
            required.push(digits[getSecureRandomInt(digits.length)])
            if (includeSpecial) {
                required.push(special[getSecureRandomInt(special.length)])
            }

            for (let i = required.length; i < len; i++) {
                required.push(charset[getSecureRandomInt(charset.length)])
            }

            for (let i = required.length - 1; i > 0; i--) {
                const j = getSecureRandomInt(i + 1)
                ;[required[i], required[j]] = [required[j], required[i]]
            }

            return required.join("")
        },
        []
    )

    const calculateAppleStyleEntropy = useCallback((): number => {
        const consonants = 20
        const vowels = 6

        const entropyValue =
            Math.log2(18) + // position for uppercase
            Math.log2(26) + // uppercase letter choice
            Math.log2(17) + // position for digit (can't be same as uppercase)
            Math.log2(10) + // digit choice
            10 * Math.log2(consonants) + // 10 consonants (16 total - 6 vowels)
            6 * Math.log2(vowels) // 6 vowels

        return Math.round(entropyValue * 10) / 10
    }, [])

    const calculateRandomPasswordEntropy = useCallback(
        (len: number, includeSpecial: boolean): number => {
            const charsetSize = 26 + 26 + 10 + (includeSpecial ? 32 : 0)
            const entropyValue = len * Math.log2(charsetSize)
            return Math.round(entropyValue * 10) / 10
        },
        []
    )

    const generatePassword = useCallback(() => {
        if (isGenerating) return
        setIsGenerating(true)
        setCopied(false)

        setTimeout(() => {
            let generatedPassword: string
            let calculatedEntropy: number

            if (passwordType === "easytype") {
                generatedPassword = generateAppleStylePassword()
                calculatedEntropy = calculateAppleStyleEntropy()
            } else {
                generatedPassword = generateRandomPassword(
                    length,
                    includeSpecial
                )
                calculatedEntropy = calculateRandomPasswordEntropy(
                    length,
                    includeSpecial
                )
            }

            setPassword(generatedPassword)
            setEntropy(calculatedEntropy)
            setIsGenerating(false)
            showAlert(`${calculatedEntropy} bits of entropy`, "success")
        }, 360)
    }, [
        isGenerating,
        passwordType,
        length,
        includeSpecial,
        showAlert,
        generateAppleStylePassword,
        generateRandomPassword,
        calculateAppleStyleEntropy,
        calculateRandomPasswordEntropy,
    ])

    const copyPassword = useCallback(async () => {
        if (!password) {
            showAlert("Generate a password first", "warning")
            return
        }

        try {
            await navigator.clipboard.writeText(password)
            setCopied(true)
            showAlert("Copied to clipboard", "success")
            setTimeout(() => setCopied(false), 1800)
        } catch (err) {
            showAlert("Failed to copy password: " + err, "error")
        }
    }, [password, showAlert])

    const getStrengthColor = useCallback(
        (len: number) => {
            if (passwordType === "easytype") return "#34d399"
            if (len < 12) return "#f87171"
            if (len < 16) return "#fbbf24"
            if (len < 20) return "#34d399"
            return "#3fc6e8"
        },
        [passwordType]
    )

    const getStrengthText = useCallback(
        (len: number) => {
            if (passwordType === "easytype") return "Strong"
            if (len < 12) return "Weak"
            if (len < 16) return "Medium"
            if (len < 20) return "Strong"
            return "Very Strong"
        },
        [passwordType]
    )

    const getCrackTime = useCallback((entropyBits: number): string => {
        if (!entropyBits) return "Generate to see"
        const seconds = Math.pow(2, entropyBits - 1) / 1e11
        const years = seconds / 3.15576e7
        if (seconds < 1) return "Instant"
        if (seconds < 60) return `${Math.round(seconds)} seconds`
        if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
        if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`
        if (years < 1) return `${Math.round(seconds / 86400)} days`
        if (years < 1e6) return `${Math.round(years).toLocaleString()} years`
        if (years < 1e9)
            return `${Math.round(years / 1e6).toLocaleString()} million years`
        if (years < 1.4e10)
            return `${Math.round(years / 1e9).toLocaleString()} billion years`
        return "Longer than the universe has existed"
    }, [])

    const sliderColor = getStrengthColor(length)
    const strengthColor = password
        ? getStrengthColor(passwordType === "easytype" ? 20 : password.length)
        : "#3b4554"
    const strengthText = password
        ? getStrengthText(passwordType === "easytype" ? 20 : password.length)
        : "—"
    const gaugeDeg = (Math.min(entropy, 160) / 160) * 360
    const sliderPct = ((length - 8) / 24) * 100

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
                            setPassword("")
                            setEntropy(0)
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
                            setPassword("")
                            setEntropy(0)
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
                                className={`icon-btn ${copied ? "copied" : ""}`}
                                onClick={copyPassword}
                                title="Copy password"
                            >
                                {copied ? (
                                    <Check size={16} />
                                ) : (
                                    <Copy size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                    {password ? (
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            readOnly
                            className="specimen-field"
                        />
                    ) : (
                        <div
                            className="specimen-placeholder"
                            style={{ letterSpacing: "1.5px" }}
                        >
                            · · · · · · · · · · · ·
                        </div>
                    )}
                </div>

                <div className="gauge-row">
                    <div
                        className="gauge"
                        style={{
                            background: `conic-gradient(${strengthColor} ${gaugeDeg}deg, #19222f ${gaugeDeg}deg)`,
                        }}
                    >
                        <div className="gauge-inner">
                            <span className="gauge-value">{entropy || 0}</span>
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
                                {password.length || "—"}
                            </span>
                        </div>
                        <div className="meta-divider" />
                        <div className="meta-row">
                            <span className="meta-row-label">
                                Time to crack
                            </span>
                            <span className="meta-row-value meta-row-value-accent">
                                {getCrackTime(entropy)}
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
                                background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${sliderPct}%, #1b2433 ${sliderPct}%, #1b2433 100%)`,
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
                    {isGenerating ? "Generating…" : "Generate password"}
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
