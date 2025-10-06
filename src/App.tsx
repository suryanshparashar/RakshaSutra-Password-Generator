import { useState, useCallback } from "react"
import {
    Copy,
    // RefreshCw,
    Shield,
    Eye,
    EyeOff,
    Lock,
    Zap,
    Check,
    Type,
    ShieldCheck,
} from "lucide-react"

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

        const syllables = Array.from({ length: 5 }, () => generateSyllable())
        const capitalizeIndex = getSecureRandomInt(5)

        syllables[capitalizeIndex] =
            syllables[capitalizeIndex].charAt(0).toUpperCase() +
            syllables[capitalizeIndex].slice(1)

        const digit = getSecureRandomInt(10).toString()

        const digitPosition = [
            `${syllables[0]}-${syllables[1]}${digit}-${syllables[2]}-${syllables[3]}-${syllables[4]}`,
            `${syllables[0]}${digit}-${syllables[1]}-${syllables[2]}-${syllables[3]}-${syllables[4]}`,
            `${syllables[0]}-${syllables[1]}-${syllables[2]}${digit}-${syllables[3]}-${syllables[4]}`,
            `${syllables[0]}-${syllables[1]}-${syllables[2]}-${syllables[3]}${digit}-${syllables[4]}`,
            `${syllables[0]}-${syllables[1]}-${syllables[2]}-${syllables[3]}-${syllables[4]}${digit}`,
        ]

        return digitPosition[getSecureRandomInt(5)]
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
            10 * Math.log2(consonants) +
            5 * Math.log2(vowels) +
            Math.log2(26) +
            Math.log2(10) +
            Math.log2(5)
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
            showAlert(
                `Password generated with ${calculatedEntropy} bits of entropy`,
                "success"
            )
        }, 400)
    }, [
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
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            showAlert("Failed to copy password", "error")
        }
    }, [password, showAlert])

    const getStrengthColor = useCallback(() => {
        if (passwordType === "easytype") return "#10b981"
        if (length < 12) return "#ef4444"
        if (length < 16) return "#f59e0b"
        if (length < 20) return "#10b981"
        return "#06b6d4"
    }, [length, passwordType])

    const getStrengthText = useCallback(() => {
        if (passwordType === "easytype") return "Strong"
        if (length < 12) return "Weak"
        if (length < 16) return "Medium"
        if (length < 20) return "Strong"
        return "Very Strong"
    }, [length, passwordType])

    const getStrengthWidth = useCallback(() => {
        if (passwordType === "easytype") return "75%"
        if (length < 12) return "25%"
        if (length < 16) return "50%"
        if (length < 20) return "75%"
        return "100%"
    }, [length, passwordType])

    return (
        <div className="app-container">
            <div className="background-grid"></div>
            <div className="background-glow"></div>

            <div className="content-wrapper">
                <header className="app-header">
                    <div className="logo-container">
                        <div className="logo-badge">
                            <Shield className="logo-icon" />
                        </div>
                        <div className="logo-text">
                            <h1 className="app-title">RakshaSutra</h1>
                            <p className="app-tagline">
                                A Protective Formula for Strong Passwords
                            </p>
                        </div>
                    </div>
                </header>

                <main className="main-card">
                    <div className="card-header">
                        <Lock size={20} />
                        <h2>Generate Password</h2>
                    </div>

                    <div className="tabs">
                        <button
                            className={`tab ${passwordType === "easytype" ? "active" : ""}`}
                            onClick={() => {
                                setPasswordType("easytype")
                                setPassword("")
                                setEntropy(0)
                            }}
                        >
                            <Type size={18} />
                            <span>Easy Type</span>
                        </button>
                        <button
                            className={`tab ${passwordType === "maxsecurity" ? "active" : ""}`}
                            onClick={() => {
                                setPasswordType("maxsecurity")
                                setPassword("")
                                setEntropy(0)
                            }}
                        >
                            <ShieldCheck size={18} />
                            <span>Max Security</span>
                        </button>
                    </div>

                    {passwordType === "easytype" && (
                        <div className="info-box">
                            <div className="info-icon">
                                <Type size={20} />
                            </div>
                            <div className="info-content">
                                <h3 className="info-title">
                                    Easy to Type Password
                                </h3>
                                <p className="info-text">
                                    Generates a 20-character password with
                                    syllable patterns, making it easy to type on
                                    any device. Perfect for situations without
                                    password managers or auto-fill.
                                </p>
                            </div>
                        </div>
                    )}

                    {passwordType === "maxsecurity" && (
                        <div className="controls-section">
                            <div className="control-group">
                                <div className="control-header">
                                    <label
                                        htmlFor="length"
                                        className="control-label"
                                    >
                                        Password Length
                                    </label>
                                    <div className="length-badge">
                                        {length} characters
                                    </div>
                                </div>

                                <input
                                    type="range"
                                    id="length"
                                    min="8"
                                    max="32"
                                    value={length}
                                    onChange={(e) =>
                                        setLength(Number(e.target.value))
                                    }
                                    className="length-slider"
                                    style={{
                                        background: `linear-gradient(to right, ${getStrengthColor()} 0%, ${getStrengthColor()} ${
                                            ((length - 8) / 24) * 100
                                        }%, #1e293b ${((length - 8) / 24) * 100}%, #1e293b 100%)`,
                                    }}
                                />

                                <div className="slider-markers">
                                    <span>8</span>
                                    <span>16</span>
                                    <span>24</span>
                                    <span>32</span>
                                </div>

                                <div className="strength-bar-container">
                                    <div className="strength-bar-bg">
                                        <div
                                            className="strength-bar-fill"
                                            style={{
                                                width: getStrengthWidth(),
                                                backgroundColor:
                                                    getStrengthColor(),
                                            }}
                                        ></div>
                                    </div>
                                    <span
                                        className="strength-text"
                                        style={{ color: getStrengthColor() }}
                                    >
                                        {getStrengthText()}
                                    </span>
                                </div>
                            </div>

                            <div className="control-group">
                                <label className="custom-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={includeSpecial}
                                        onChange={(e) =>
                                            setIncludeSpecial(e.target.checked)
                                        }
                                        className="checkbox-input"
                                    />
                                    <span className="checkbox-custom">
                                        {includeSpecial && (
                                            <Check size={14} strokeWidth={3} />
                                        )}
                                    </span>
                                    <span className="checkbox-text">
                                        Include special characters
                                        <span className="checkbox-hint">
                                            !@#$%^&*()_+-=[]{}|;:,.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={generatePassword}
                        disabled={isGenerating}
                        className={`generate-button ${isGenerating ? "generating" : ""}`}
                    >
                        <Zap
                            className={`button-icon ${isGenerating ? "spinning" : ""}`}
                            size={20}
                        />
                        <span>
                            {isGenerating
                                ? "Generating..."
                                : "Generate Secure Password"}
                        </span>
                    </button>

                    {password && (
                        <div className="result-section">
                            <div className="password-display">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    readOnly
                                    className="password-field"
                                />
                                <div className="password-actions">
                                    <button
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="action-button"
                                        title={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                    <button
                                        onClick={copyPassword}
                                        className={`action-button copy-button ${copied ? "copied" : ""}`}
                                        title="Copy password"
                                    >
                                        {copied ? (
                                            <Check size={18} />
                                        ) : (
                                            <Copy size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="password-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Length</span>
                                    <span className="stat-value">
                                        {password.length}
                                    </span>
                                </div>
                                <div className="stat-divider"></div>
                                <div className="stat-item">
                                    <span className="stat-label">Entropy</span>
                                    <span className="stat-value">
                                        {entropy} bits
                                    </span>
                                </div>
                                <div className="stat-divider"></div>
                                <div className="stat-item">
                                    <span className="stat-label">Strength</span>
                                    <span
                                        className="stat-value"
                                        style={{ color: getStrengthColor() }}
                                    >
                                        {getStrengthText()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <footer className="app-footer">
                    <div className="footer-features">
                        <div className="feature-item">
                            <Shield size={16} />
                            <span>Cryptographically Secure</span>
                        </div>
                        <div className="feature-item">
                            <Lock size={16} />
                            <span>Never Stored</span>
                        </div>
                        <div className="feature-item">
                            <Zap size={16} />
                            <span>Instant Generation</span>
                        </div>
                    </div>
                </footer>
            </div>

            {alert.show && (
                <div className={`notification notification-${alert.type}`}>
                    <div className="notification-content">
                        {alert.type === "success" && <Check size={18} />}
                        <span>{alert.message}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
