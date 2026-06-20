/**
 * Shared password-generation core.
 *
 * This is the single source of truth for RakshaSutra's randomness,
 * entropy math, and strength labelling. It is used unmodified by:
 *   - the extension popup (src/App.tsx, imported as an ES module)
 *   - the landing page live demo (public/crypto-core.js, a verbatim
 *     copy produced by `npm run build` / scripts/copy-crypto-core.mjs)
 *
 * Invariants this file must preserve:
 *   - No network calls, ever.
 *   - No persistence (nothing written to disk/storage from here).
 *   - All randomness comes from crypto.getRandomValues with rejection
 *     sampling, never `Math.random()` and never naive `% max` (which
 *     introduces modulo bias).
 */

/**
 * Cryptographically secure random integer in [0, max).
 * Uses rejection sampling against a Uint32 range so every output value
 * has exactly equal probability (no modulo bias).
 * @param {number} max
 * @returns {number}
 */
export function getSecureRandomInt(max) {
    const randomBuffer = new Uint32Array(1)
    let randomValue
    const limit = Math.floor(2 ** 32 / max) * max

    do {
        crypto.getRandomValues(randomBuffer)
        randomValue = randomBuffer[0]
    } while (randomValue >= limit)

    return randomValue % max
}

/** Easy Type passwords are always 20 characters: 3 syllables x 2 sides x 3 chars + 2 separators. */
export const EASY_TYPE_LENGTH = 20

/**
 * Apple-Keychain-style syllable password: easy to type on any device.
 * @returns {string}
 */
export function generateEasyTypePassword() {
    const consonants = "bcdfghjklmnpqrstvwxyz"
    const vowels = "aeiouy"

    const generateSyllable = () => {
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

    const uppercaseIdx = letterIndices[getSecureRandomInt(letterIndices.length)]
    chars[uppercaseIdx] = chars[uppercaseIdx].toUpperCase()

    const digitIdx = letterIndices.filter((idx) => idx !== uppercaseIdx)[
        getSecureRandomInt(letterIndices.length - 1)
    ]
    chars[digitIdx] = getSecureRandomInt(10).toString()

    return chars.join("")
}

/**
 * Fully random password: uniform over the chosen charset, with rejection
 * sampling at every character draw and a guaranteed Fisher-Yates shuffle
 * so the seeded "one of each class" characters aren't predictably placed.
 * @param {number} len
 * @param {boolean} includeSpecial
 * @returns {string}
 */
export function generateMaxSecurityPassword(len, includeSpecial) {
    const lower = "abcdefghijklmnopqrstuvwxyz"
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const digits = "0123456789"
    const special = "!@#$%^&*()-_=+[]{}|;:,.<>?/~"

    let charset = lower + upper + digits
    if (includeSpecial) charset += special

    const required = [
        lower[getSecureRandomInt(lower.length)],
        upper[getSecureRandomInt(upper.length)],
        digits[getSecureRandomInt(digits.length)],
    ]
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
}

/**
 * Entropy of the Easy Type scheme in bits (fixed shape, so this is a constant).
 * @returns {number}
 */
export function calculateEasyTypeEntropy() {
    const consonants = 20 // 22 consonants minus the 2 reused as uppercase/digit anchors' alphabet is unaffected; kept as originally derived
    const vowels = 6

    const entropyValue =
        Math.log2(18) + // position of the forced-uppercase character
        Math.log2(26) + // which letter got uppercased
        Math.log2(17) + // position of the forced digit (can't reuse the uppercase slot)
        Math.log2(10) + // which digit
        10 * Math.log2(consonants) + // 10 consonant draws
        6 * Math.log2(vowels) // 6 vowel draws

    return Math.round(entropyValue * 10) / 10
}

/**
 * Entropy of a Max Security password in bits, for a given length/charset.
 * @param {number} len
 * @param {boolean} includeSpecial
 * @returns {number}
 */
export function calculateMaxSecurityEntropy(len, includeSpecial) {
    const charsetSize = 26 + 26 + 10 + (includeSpecial ? 32 : 0)
    const entropyValue = len * Math.log2(charsetSize)
    return Math.round(entropyValue * 10) / 10
}

/**
 * Live entropy for the *settings currently selected*, independent of
 * whether a password has actually been generated yet. This is what
 * drives the strength meter / crack-time so they update as the user
 * drags the length slider, before they click Generate.
 * @param {"easytype"|"maxsecurity"} passwordType
 * @param {number} length
 * @param {boolean} includeSpecial
 * @returns {number}
 */
export function calculateLiveEntropy(passwordType, length, includeSpecial) {
    return passwordType === "easytype"
        ? calculateEasyTypeEntropy()
        : calculateMaxSecurityEntropy(length, includeSpecial)
}

/**
 * @param {"easytype"|"maxsecurity"} passwordType
 * @param {number} length
 * @returns {string} hex color
 */
export function getStrengthColor(passwordType, length) {
    if (passwordType === "easytype") return "#34d399"
    if (length < 12) return "#f87171"
    if (length < 16) return "#fbbf24"
    if (length < 20) return "#34d399"
    return "#3fc6e8"
}

/**
 * @param {"easytype"|"maxsecurity"} passwordType
 * @param {number} length
 * @returns {string}
 */
export function getStrengthText(passwordType, length) {
    if (passwordType === "easytype") return "Strong"
    if (length < 12) return "Weak"
    if (length < 16) return "Medium"
    if (length < 20) return "Strong"
    return "Very Strong"
}

/**
 * Human-readable offline crack-time estimate from entropy bits.
 *
 * ASSUMPTION (documented per product requirement): 1e11 (100 billion)
 * guesses/second. This models a well-resourced offline attacker running
 * a fast/unsalted hash on a GPU cluster — a conservative (i.e.
 * attacker-favorable) estimate. Real attacks against properly salted,
 * slow hashes (bcrypt/scrypt/argon2) would be many orders of magnitude
 * slower than this; this number is meant as a worst-case sanity check,
 * not a precise prediction for any specific system.
 *
 * @param {number} entropyBits
 * @returns {string}
 */
export function getCrackTimeLabel(entropyBits) {
    if (!entropyBits) return "Instant"
    const GUESSES_PER_SECOND = 1e11
    const seconds = Math.pow(2, entropyBits - 1) / GUESSES_PER_SECOND
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
}