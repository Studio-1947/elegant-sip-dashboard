/* ────────────────────────────────────────────────────────────────────────────
 * The sign-in gate.
 *
 * READ THIS BEFORE TRUSTING IT.
 *
 * This is a PRIVACY SCREEN, not a security boundary, and the login screen says
 * so out loud rather than implying otherwise. There is no server. Every figure
 * this dashboard shows lives in this browser's own localStorage, on this
 * origin, and anyone sitting at this machine can read all of it from the
 * DevTools console without signing in. A gate that runs in the same JavaScript
 * it is guarding can always be walked around.
 *
 * What it genuinely buys:
 *   - the numbers are not on screen when you step away from the desk
 *   - a colleague who opens the link does not land in the middle of the books
 *   - one deliberate act before the data appears
 *
 * What it does NOT buy: protection from anyone who wants in. If the figures
 * need to be genuinely private, they need a server, and this file becomes a
 * call to it.
 *
 * ── Why the password is not in this file ────────────────────────────────────
 * The stored credential is a PBKDF2-HMAC-SHA256 digest over a random salt at
 * 210,000 iterations — the OWASP floor for this construction. Only the digest
 * ships in the bundle. Writing the password here as a string would put it in
 * plain sight of View Source, which would be strictly worse than no gate at
 * all: it would look like protection while handing the secret to anybody who
 * pressed Ctrl+U.
 *
 * The username is compared in the clear, deliberately. A username is not a
 * secret and hashing it would only imply that it is.
 * ──────────────────────────────────────────────────────────────────────────── */

const USERNAME = 'admin'

/* PBKDF2-HMAC-SHA256, 210,000 iterations, 16-byte random salt, 256-bit output.
   Derived offline; the plaintext exists nowhere in this repository. To rotate
   the password, regenerate both values together — see README, "Signing in". */
const SALT_B64 = 'DN7AjguqZeNtsBIr14vTJg=='
const HASH_B64 = 'xznjdD5j50Vo8hML5ZmOdy1qkDUrOzFeUIwUvyUN76A='
const ITERATIONS = 210_000

export type AuthFailure = 'bad-credentials' | 'no-crypto'

const fromB64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0))

/**
 * Web Crypto's PBKDF2 needs a secure context. `http://localhost` is one — which
 * is how this app is normally served off XAMPP — but a plain-http LAN address
 * is not, and there `crypto.subtle` is simply undefined.
 *
 * When that happens the gate reports `no-crypto` and refuses to sign anyone in,
 * rather than falling back to some home-rolled digest. A weaker check that
 * still says "Welcome" would be the dishonest option, and rolling private
 * crypto to paper over a deployment problem is how you get a real one.
 */
export const cryptoAvailable = (): boolean =>
  typeof crypto !== 'undefined' &&
  typeof crypto.subtle !== 'undefined' &&
  typeof crypto.subtle.deriveBits === 'function'

/** Length-independent compare. Overkill for a local gate, cheap enough to keep. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index]
  return difference === 0
}

export async function signIn(
  username: string,
  password: string,
): Promise<{ ok: true } | { ok: false; reason: AuthFailure }> {
  if (!cryptoAvailable()) return { ok: false, reason: 'no-crypto' }

  /* The username is checked, but its result is not returned separately: telling
     someone which half they got wrong halves the work of guessing. */
  const nameMatches = username.trim().toLowerCase() === USERNAME

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromB64(SALT_B64), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )

  const passwordMatches = sameBytes(new Uint8Array(bits), fromB64(HASH_B64))
  return nameMatches && passwordMatches ? { ok: true } : { ok: false, reason: 'bad-credentials' }
}
