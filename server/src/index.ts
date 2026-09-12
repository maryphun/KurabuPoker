import { argon2id } from 'hash-wasm'

export interface Env {
  ENVIRONMENT: string
  DB?: D1Database
  SESSION_COOKIE?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  LINE_CLIENT_ID?: string
  LINE_CLIENT_SECRET?: string
  SQUARE_APPLICATION_ID?: string
  SQUARE_ACCESS_TOKEN?: string
  SQUARE_MONTHLY_PLAN_VARIATION_ID?: string
  SQUARE_ANNUAL_PLAN_VARIATION_ID?: string
  SQUARE_ENVIRONMENT?: string
  SQUARE_WEBHOOK_SIGNATURE_KEY?: string
  SQUARE_WEBHOOK_URL?: string
}

type ProfileInput = { nickname: string; goal: string; experience?: string; playFormat?: string }
const json = (body: unknown, status = 200, headers: HeadersInit = {}): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } })
const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
async function digest(value: string): Promise<string> { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))) }
function cookieName(env: Env) { return env.SESSION_COOKIE || 'kurabu_session' }
function readCookie(request: Request, name: string) { return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) }
function sessionCookie(name: string, value: string, maxAge = 60 * 60 * 24 * 30) { return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax` }
function csrfCookie(value: string) { return `kurabu_csrf=${value}; Max-Age=2592000; Path=/; Secure; SameSite=Lax` }
function text(value: unknown) { return typeof value === 'string' ? value : '' }
function csrfValid(request: Request) { const cookie = readCookie(request, 'kurabu_csrf'); const header = request.headers.get('x-csrf-token'); return Boolean(cookie && header && cookie === header) }
function validUsername(value: string) { return /^[a-z_]{4,24}$/.test(value) }
function validPassword(value: string) { return [...value].length >= 12 && [...value].length <= 128 }
function validNickname(value: string) { return [...value.trim()].length >= 1 && [...value].length <= 30 && !/[\u0000-\u001f\u007f]/u.test(value) }
function base64url(bytes: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '') }
async function pkceChallenge(verifier: string) { return base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))) }
async function hmacSignature(key: string, value: string) { const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value))); return btoa(String.fromCharCode(...bytes)) }
function constantTimeEqual(a: string, b: string) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0 }
async function passwordHash(password: string, salt = crypto.randomUUID()) {
  return argon2id({ password, salt, iterations: 3, memorySize: 19456, parallelism: 1, hashLength: 32, outputType: 'encoded' })
}
async function legacyPasswordHash(password: string, salt: string) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 310_000, hash: 'SHA-256' }, key, 256); return `pbkdf2-sha256$${salt}$${hex(bits)}` }
async function passwordMatches(password: string, stored: string) { if (stored.startsWith('$argon2id$')) return (await argon2id({ password, salt: stored.split('$')[4], iterations: 3, memorySize: 19456, parallelism: 1, hashLength: 32, outputType: 'encoded' })) === stored; const [, salt, expected] = stored.split('$'); return Boolean(salt && expected && (await legacyPasswordHash(password, salt)).endsWith(`$${expected}`)) }
async function currentAccount(request: Request, env: Env) {
  if (!env.DB) return null
  const raw = readCookie(request, cookieName(env)); if (!raw) return null
  const row = await env.DB.prepare('SELECT a.id, a.username FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.id_hash = ?1 AND s.revoked_at IS NULL AND s.expires_at > ?2 AND a.deleted_at IS NULL').bind(await digest(raw), now()).first<{ id: string; username: string }>()
  return row ?? null
}
async function register(request: Request, env: Env) {
  if (!env.DB) return json({ error: 'database_unconfigured' }, 503)
  const body = await request.json<{ username?: string; password?: string; nickname?: string; goal?: string; experience?: string; playFormat?: string; consentVersion?: string }>().catch(() => ({}))
  const username = text(body.username).toLowerCase(), password = text(body.password), profile: ProfileInput = { nickname: text(body.nickname), goal: text(body.goal), experience: text(body.experience), playFormat: text(body.playFormat) }
  if (!validUsername(username) || !validPassword(password) || !validNickname(profile.nickname) || !profile.goal || !text(body.consentVersion)) return json({ error: 'invalid_input' }, 400)
  const accountId = id(), createdAt = now(), hash = await passwordHash(password), publicId = id().replaceAll('-', '').slice(0, 16)
  const recovery = Array.from({ length: 10 }, () => crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase())
  try { await env.DB.batch([
    env.DB.prepare('INSERT INTO accounts (id, username, password_hash, created_at) VALUES (?1, ?2, ?3, ?4)').bind(accountId, username, hash, createdAt),
    env.DB.prepare('INSERT INTO profiles (account_id, nickname, goal, experience, play_format, public_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(accountId, profile.nickname.trim(), profile.goal, profile.experience || null, profile.playFormat || null, publicId),
    env.DB.prepare('INSERT INTO memberships (account_id, status, updated_at) VALUES (?1, \'free\', ?2)').bind(accountId, createdAt),
    ...await Promise.all(recovery.map(async code => env.DB!.prepare('INSERT INTO recovery_codes (id, account_id, code_hash) VALUES (?1, ?2, ?3)').bind(id(), accountId, 'sha256$' + await digest(code)))),
    env.DB.prepare('INSERT INTO consent_records (id, account_id, consent_type, version, created_at) VALUES (?1, ?2, \'terms_privacy\', ?3, ?4)').bind(id(), accountId, text(body.consentVersion), createdAt),
  ]) } catch { return json({ error: 'username_unavailable' }, 409) }
  return json({ account: { id: accountId, username, nickname: profile.nickname.trim(), goal: profile.goal, publicId }, membership: { status: 'free' }, recoveryCodes: recovery }, 201)
}
async function login(request: Request, env: Env) {
  if (!env.DB) return json({ error: 'database_unconfigured' }, 503)
  const body = await request.json<{ username?: string; password?: string }>().catch(() => ({})), username = text(body.username).toLowerCase(), password = text(body.password)
  const account = await env.DB.prepare('SELECT id, username, password_hash FROM accounts WHERE username = ?1 AND deleted_at IS NULL').bind(username).first<{ id: string; username: string; password_hash: string | null }>()
  if (!account?.password_hash || !(await passwordMatches(password, account.password_hash))) return json({ error: 'invalid_credentials' }, 401)
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`, expires = new Date(Date.now() + 30 * 86400000).toISOString()
  await env.DB.prepare('INSERT INTO sessions (id_hash, account_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)').bind(await digest(raw), account.id, expires, now()).run()
  const csrf = crypto.randomUUID(); return json({ account: { id: account.id, username: account.username }, expiresAt: expires }, 200, { 'set-cookie': `${sessionCookie(cookieName(env), raw)}, ${csrfCookie(csrf)}` })
}
async function me(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); const row = await env.DB.prepare('SELECT a.id, a.username, p.nickname, p.goal, p.experience, p.play_format AS playFormat, p.public_id AS publicId, m.status, m.trial_ends_at AS trialEndsAt, m.paid_until AS paidUntil FROM accounts a JOIN profiles p ON p.account_id = a.id JOIN memberships m ON m.account_id = a.id WHERE a.id = ?1').bind(account.id).first(); return json({ account: row }) }
async function logout(request: Request, env: Env) { const raw = readCookie(request, cookieName(env)); if (raw && env.DB) await env.DB.prepare('UPDATE sessions SET revoked_at = ?1 WHERE id_hash = ?2').bind(now(), await digest(raw)).run(); return json({ ok: true }, 200, { 'set-cookie': sessionCookie(cookieName(env), '', 0) }) }
async function startTrial(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); const membership = await env.DB.prepare('SELECT status, trial_started_at FROM memberships WHERE account_id = ?1').bind(account.id).first<{ status: string; trial_started_at: string | null }>(); if (!membership || membership.trial_started_at) return json({ error: 'trial_unavailable' }, 409); const started = now(), ends = new Date(Date.now() + 7 * 86400000).toISOString(); await env.DB.prepare('UPDATE memberships SET status = \'trial\', trial_started_at = ?1, trial_ends_at = ?2, updated_at = ?1 WHERE account_id = ?3').bind(started, ends, account.id).run(); return json({ status: 'trial', trialEndsAt: ends }) }
async function publicProfile(request: Request, env: Env) { if (!env.DB) return json({ error: 'database_unconfigured' }, 503); const publicId = new URL(request.url).pathname.split('/').pop(); const row = await env.DB.prepare('SELECT nickname, goal, experience, public_id AS publicId FROM profiles WHERE public_id = ?1').bind(publicId).first(); return row ? json({ profile: row }) : json({ error: 'not_found' }, 404) }
async function updateProfile(request: Request, env: Env) {
  const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401)
  const body = await request.json<ProfileInput>().catch(() => ({} as ProfileInput)); const nickname = text(body.nickname), goal = text(body.goal)
  if (!validNickname(nickname) || !goal) return json({ error: 'invalid_input' }, 400)
  await env.DB.prepare('UPDATE profiles SET nickname = ?1, goal = ?2, experience = ?3, play_format = ?4 WHERE account_id = ?5').bind(nickname.trim(), goal, text(body.experience) || null, text(body.playFormat) || null, account.id).run()
  return me(request, env)
}
async function changePassword(request: Request, env: Env) {
  const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401)
  const body = await request.json<{ currentPassword?: string; newPassword?: string }>().catch(() => ({})); const row = await env.DB.prepare('SELECT password_hash FROM accounts WHERE id = ?1').bind(account.id).first<{ password_hash: string | null }>(); if (!row?.password_hash || !(await passwordMatches(text(body.currentPassword), row.password_hash)) || !validPassword(text(body.newPassword))) return json({ error: 'invalid_credentials' }, 401)
  const timestamp = now(); await env.DB.batch([env.DB.prepare('UPDATE accounts SET password_hash = ?1 WHERE id = ?2').bind(await passwordHash(text(body.newPassword)), account.id), env.DB.prepare('UPDATE sessions SET revoked_at = ?1 WHERE account_id = ?2 AND revoked_at IS NULL').bind(timestamp, account.id)]); return json({ ok: true })
}
async function deleteAccount(request: Request, env: Env) {
  const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401)
  const body = await request.json<{ confirmation?: string }>().catch(() => ({})); if (body.confirmation !== 'DELETE') return json({ error: 'confirmation_required' }, 400)
  await env.DB.prepare('UPDATE accounts SET deleted_at = ?1, password_hash = NULL WHERE id = ?2').bind(now(), account.id).run()
  return logout(request, env)
}
async function createAssessment(request: Request, env: Env) {
  const account = await currentAccount(request, env); if (!env.DB) return json({ error: 'database_unconfigured' }, 503)
  const body = await request.json<{ mode?: string; payload?: unknown }>().catch(() => ({})); const attemptId = id(), createdAt = now()
  await env.DB.prepare('INSERT INTO assessment_attempts (id, account_id, mode, payload_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(attemptId, account?.id ?? null, text(body.mode) || 'cash', JSON.stringify(body.payload ?? {}), createdAt).run()
  return json({ attemptId, createdAt }, 201)
}
async function completeAssessment(request: Request, env: Env, attemptId: string) {
  const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401)
  const body = await request.json<{ result?: unknown }>().catch(() => ({})); const result = await env.DB.prepare('UPDATE assessment_attempts SET result_json = ?1, completed_at = ?2 WHERE id = ?3 AND account_id = ?4').bind(JSON.stringify(body.result ?? {}), now(), attemptId, account.id).run()
  return result.meta.changes ? json({ ok: true }) : json({ error: 'not_found' }, 404)
}
async function assessmentHistory(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); const rows = await env.DB.prepare('SELECT id, mode, result_json AS result, completed_at AS completedAt, created_at AS createdAt FROM assessment_attempts WHERE account_id = ?1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 50').bind(account.id).all(); return json({ attempts: rows.results }) }
async function recoveryCodes(request: Request, env: Env) {
  const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401)
  const codes = Array.from({ length: 10 }, () => crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase())
  await env.DB.prepare('DELETE FROM recovery_codes WHERE account_id = ?1').bind(account.id).run()
  await env.DB.batch(await Promise.all(codes.map(async code => env.DB!.prepare('INSERT INTO recovery_codes (id, account_id, code_hash) VALUES (?1, ?2, ?3)').bind(id(), account.id, 'sha256$' + await digest(code)))))
  return json({ codes, shownOnce: true })
}
async function recover(request: Request, env: Env) {
  if (!env.DB) return json({ error: 'database_unconfigured' }, 503)
  const body = await request.json<{ username?: string; code?: string; newPassword?: string }>().catch(() => ({})); const username = text(body.username).toLowerCase(), code = text(body.code).toUpperCase(), newPassword = text(body.newPassword)
  const account = await env.DB.prepare('SELECT a.id, a.username FROM accounts a JOIN recovery_codes r ON r.account_id = a.id WHERE a.username = ?1 AND r.used_at IS NULL AND a.deleted_at IS NULL').bind(username).first<{ id: string; username: string }>()
  if (!account || !code) return json({ error: 'invalid_recovery_code' }, 401)
  const match = await env.DB.prepare('SELECT id FROM recovery_codes WHERE account_id = ?1 AND code_hash = ?2 AND used_at IS NULL').bind(account.id, 'sha256$' + await digest(code)).first<{ id: string }>()
  if (!match || !validPassword(newPassword)) return json({ error: 'invalid_recovery_code' }, 401)
  const timestamp = now(); await env.DB.batch([
    env.DB.prepare('UPDATE recovery_codes SET used_at = ?1 WHERE id = ?2 AND used_at IS NULL').bind(timestamp, match.id),
    env.DB.prepare('UPDATE accounts SET password_hash = ?1 WHERE id = ?2').bind(await passwordHash(newPassword), account.id),
    env.DB.prepare('UPDATE sessions SET revoked_at = ?1 WHERE account_id = ?2 AND revoked_at IS NULL').bind(timestamp, account.id),
    env.DB.prepare('INSERT INTO audit_events (id, account_id, event_type, metadata_json, created_at) VALUES (?1, ?2, \'password_recovered\', \'{}\', ?3)').bind(id(), account.id, timestamp),
  ])
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`, expires = new Date(Date.now() + 30 * 86400000).toISOString(); await env.DB.prepare('INSERT INTO sessions (id_hash, account_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)').bind(await digest(raw), account.id, expires, now()).run()
  return json({ account: { id: account.id, username: account.username }, expiresAt: expires }, 200, { 'set-cookie': `${sessionCookie(cookieName(env), raw)}, ${csrfCookie(crypto.randomUUID())}` })
}
async function membershipStatus(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); const row = await env.DB.prepare('SELECT status, trial_started_at AS trialStartedAt, trial_ends_at AS trialEndsAt, paid_until AS paidUntil FROM memberships WHERE account_id = ?1').bind(account.id).first<{ status: string; trialStartedAt?: string; trialEndsAt?: string; paidUntil?: string }>(); const status = row?.status === 'trial' && row.trialEndsAt && row.trialEndsAt <= now() ? 'free' : (row?.status || 'free'); return json({ membership: { ...row, status, trialEligible: !row?.trialStartedAt, capabilities: { diagnosisSave: true, rangesCustomize: status === 'trial' || status === 'paid', drillsRun: status === 'trial' || status === 'paid', handsReview: status === 'trial' || status === 'paid', communityPublish: status === 'trial' || status === 'paid', paidCourses: status === 'trial' || status === 'paid' } } }) }
async function cancelMembership(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); await env.DB.prepare("UPDATE memberships SET status = 'free', paid_until = NULL, updated_at = ?1 WHERE account_id = ?2").bind(now(), account.id).run(); return json({ status: 'free' }) }
async function adminQuestions(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); const role = await env.DB.prepare('SELECT role FROM accounts WHERE id = ?1').bind(account.id).first<{ role: string }>(); if (role?.role !== 'admin') return json({ error: 'forbidden' }, 403); if (request.method === 'GET') { const rows = await env.DB.prepare('SELECT id, payload_json AS payload, enabled, created_at AS createdAt FROM admin_questions ORDER BY created_at DESC').all(); return json({ questions: rows.results }) } const body = await request.json<{ id?: string; payload?: unknown; enabled?: boolean }>().catch(() => ({})); if (!body.id || body.payload === undefined) return json({ error: 'invalid_input' }, 400); await env.DB.prepare('INSERT INTO admin_questions (id, payload_json, enabled, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4) ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, enabled = excluded.enabled, updated_at = excluded.updated_at').bind(body.id, JSON.stringify(body.payload), body.enabled === false ? 0 : 1, now()).run(); return json({ ok: true }) }
async function oauthStart(request: Request, env: Env, provider: 'google' | 'line') {
  if (!env.DB) return json({ error: 'database_unconfigured' }, 503)
  const clientId = provider === 'google' ? env.GOOGLE_CLIENT_ID : env.LINE_CLIENT_ID; if (!clientId) return json({ error: 'oauth_provider_unconfigured', provider }, 503)
  const url = new URL(request.url), redirectUri = url.searchParams.get('redirect_uri'); if (!redirectUri) return json({ error: 'redirect_uri_required' }, 400)
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer), state = base64url(crypto.getRandomValues(new Uint8Array(24)).buffer); await env.DB.prepare('INSERT INTO oauth_states (state_hash, provider, code_verifier, redirect_uri, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(await digest(state), provider, verifier, redirectUri, new Date(Date.now() + 10 * 60 * 1000).toISOString(), now()).run()
  const challenge = await pkceChallenge(verifier), auth = provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://access.line.me/oauth2/v2.1/authorize'; const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state, scope: provider === 'google' ? 'openid profile' : 'openid profile', code_challenge: challenge, code_challenge_method: 'S256' }); return Response.redirect(`${auth}?${params}`, 302)
}
async function oauthCallback(request: Request, env: Env, provider: 'google' | 'line') { const url = new URL(request.url); const state = url.searchParams.get('state'); const code = url.searchParams.get('code'); if (!state || !code || !env.DB) return json({ error: 'oauth_callback_invalid' }, 400); const row = await env.DB.prepare('SELECT provider, code_verifier, redirect_uri FROM oauth_states WHERE state_hash = ?1 AND expires_at > ?2').bind(await digest(state), now()).first<{ provider: string; code_verifier: string; redirect_uri: string }>(); if (!row || row.provider !== provider) return json({ error: 'oauth_state_invalid' }, 400); await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash = ?1').bind(await digest(state)).run(); return json({ error: 'oauth_exchange_not_configured', provider, message: 'トークン交換とverified issuer/subject紐付けはプロバイダー資格情報設定後に有効になります。' }, 501) }
async function oauthCallbackV2(request: Request, env: Env, provider: 'google' | 'line') {
  const url = new URL(request.url), state = url.searchParams.get('state'), code = url.searchParams.get('code'); if (!state || !code || !env.DB) return json({ error: 'oauth_callback_invalid' }, 400)
  const row = await env.DB.prepare('SELECT provider, code_verifier, redirect_uri FROM oauth_states WHERE state_hash = ?1 AND expires_at > ?2').bind(await digest(state), now()).first<{ provider: string; code_verifier: string; redirect_uri: string }>(); if (!row || row.provider !== provider) return json({ error: 'oauth_state_invalid' }, 400)
  const clientId = provider === 'google' ? env.GOOGLE_CLIENT_ID : env.LINE_CLIENT_ID, clientSecret = provider === 'google' ? env.GOOGLE_CLIENT_SECRET : env.LINE_CLIENT_SECRET; if (!clientId || !clientSecret) return json({ error: 'oauth_provider_unconfigured' }, 503)
  const tokenUrl = provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://api.line.me/oauth2/v2.1/token'; const tokenResponse = await fetch(tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: row.redirect_uri, client_id: clientId, client_secret: clientSecret, code_verifier: row.code_verifier }) }); if (!tokenResponse.ok) return json({ error: 'oauth_token_exchange_failed' }, 401); const token = await tokenResponse.json<{ access_token?: string; id_token?: string }>(); if (!token.access_token) return json({ error: 'oauth_token_missing' }, 401)
  const profileResponse = await fetch(provider === 'google' ? 'https://openidconnect.googleapis.com/v1/userinfo' : 'https://api.line.me/v2/profile', { headers: { authorization: `Bearer ${token.access_token}` } }); if (!profileResponse.ok) return json({ error: 'oauth_profile_failed' }, 401); const profile = await profileResponse.json<{ sub?: string; userId?: string; name?: string }>(); const subject = profile.sub || profile.userId; if (!subject) return json({ error: 'oauth_subject_missing' }, 401)
  await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash = ?1').bind(await digest(state)).run(); return json({ provider, issuer: provider === 'google' ? 'https://accounts.google.com' : 'https://access.line.me', subject, suggestedNickname: text(profile.name), message: '認証済みです。ユーザー名・パスワード・学習目的を入力して登録を続けてください。' })
}
async function squareCheckout(request: Request, env: Env) {
  const account = await currentAccount(request, env); if (!account) return json({ error: 'unauthorized' }, 401)
  if (!env.SQUARE_APPLICATION_ID || !env.SQUARE_ACCESS_TOKEN) return json({ error: 'square_not_configured' }, 503)
  const body = await request.json<{ interval?: string; idempotencyKey?: string }>().catch(() => ({})); const interval = text(body.interval), variationId = interval === 'annual' ? env.SQUARE_ANNUAL_PLAN_VARIATION_ID : env.SQUARE_MONTHLY_PLAN_VARIATION_ID, key = text(body.idempotencyKey) || crypto.randomUUID(); if (!variationId || !['monthly', 'annual'].includes(interval)) return json({ error: 'square_plan_not_configured' }, 503)
  const base = env.SQUARE_ENVIRONMENT === 'Production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com'; const response = await fetch(`${base}/v2/online-checkout/payment-links`, { method: 'POST', headers: { authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`, 'content-type': 'application/json', 'square-version': '2026-08-19' }, body: JSON.stringify({ idempotency_key: key, payment_note: `kurabu:${account.id}`, quick_pay: { name: `KurabuPoker ${interval === 'monthly' ? '月額' : '年額'}会員`, price_money: { amount: planPrice(interval), currency: 'JPY' }, subscription_plan_id: variationId } }) }); const result = await response.json<{ payment_link?: { url?: string; id?: string }; errors?: unknown }>(); if (!response.ok || !result.payment_link?.url || !result.payment_link.id) return json({ error: 'square_checkout_failed', details: result.errors }, 502); await env.DB.prepare('INSERT INTO square_payment_links (payment_link_id, account_id, interval, amount_jpy, created_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(result.payment_link.id, account.id, interval, planPrice(interval), now()).run(); return json({ checkoutUrl: result.payment_link.url, paymentLinkId: result.payment_link.id, interval, amountJpy: planPrice(interval) }, 201)
}
async function squareWebhook(request: Request, env: Env) { if (!env.SQUARE_APPLICATION_ID || !env.SQUARE_WEBHOOK_SIGNATURE_KEY || !env.DB) return json({ error: 'square_not_configured' }, 503); const payload = await request.text(), signature = request.headers.get('x-square-hmacsha256-signature') || '', notificationUrl = env.SQUARE_WEBHOOK_URL || request.url, expected = await hmacSignature(env.SQUARE_WEBHOOK_SIGNATURE_KEY, notificationUrl + payload); if (!constantTimeEqual(signature, expected)) return json({ error: 'invalid_webhook_signature' }, 403); const event = JSON.parse(payload) as { event_id?: string; type?: string; data?: { object?: { subscription?: { id?: string; status?: string; customer_id?: string }; payment_link?: { id?: string }; order?: { metadata?: Array<{ key?: string; value?: string }> } } } }; if (!event.event_id) return json({ error: 'event_id_required' }, 400); const duplicate = await env.DB.prepare('SELECT event_id FROM square_event_ids WHERE event_id = ?1').bind(event.event_id).first(); if (duplicate) return json({ received: true, duplicate: true }); await env.DB.prepare('INSERT INTO square_event_ids (event_id, event_type, received_at) VALUES (?1, ?2, ?3)').bind(event.event_id, event.type || 'unknown', now()).run(); await env.DB.prepare('INSERT INTO billing_events (id, provider, event_type, payload_json, received_at) VALUES (?1, \'square\', ?2, ?3, ?4)').bind(id(), event.type || 'unknown', payload, now()).run(); const subscription = event.data?.object?.subscription; if (subscription?.id) { const status = subscription.status === 'ACTIVE' ? 'active' : ['CANCELED', 'DEACTIVATED'].includes(subscription.status || '') ? 'expired' : 'pending'; await env.DB.prepare("UPDATE subscriptions SET status = ?1, updated_at = ?2 WHERE provider = 'square' AND provider_subscription_id = ?3").bind(status, now(), subscription.id).run() } return json({ received: true }) }
const planPrice = (interval: string) => interval === 'annual' ? 16500 : interval === 'monthly' ? 1650 : 0
async function billingCheckout(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); if (env.ENVIRONMENT !== 'development') return json({ error: 'simulator_disabled' }, 403); const body = await request.json<{ interval?: string; idempotencyKey?: string }>().catch(() => ({})); const interval = text(body.interval), key = text(body.idempotencyKey); if (!planPrice(interval) || !key) return json({ error: 'invalid_input' }, 422); const existing = await env.DB.prepare('SELECT status, payload_json AS payload FROM billing_operations WHERE idempotency_key = ?1 AND account_id = ?2').bind(key, account.id).first<{ status: string; payload: string }>(); if (existing) return json({ status: existing.status, ...JSON.parse(existing.payload) }); const started = new Date(), until = new Date(started.getTime() + (interval === 'annual' ? 365 : 30) * 86400000), timestamp = now(); await env.DB.batch([env.DB.prepare('INSERT INTO billing_operations (idempotency_key, account_id, operation, payload_json, status, created_at, updated_at) VALUES (?1, ?2, \'checkout\', ?3, \'succeeded\', ?4, ?4)').bind(key, account.id, JSON.stringify({ interval, amountJpy: planPrice(interval) }), timestamp), env.DB.prepare('INSERT INTO subscriptions (id, account_id, provider, interval, status, paid_started_at, paid_until, created_at, updated_at) VALUES (?1, ?2, \'fake\', ?3, \'active\', ?4, ?5, ?4, ?4) ON CONFLICT(account_id) DO UPDATE SET interval = excluded.interval, status = \'active\', paid_started_at = excluded.paid_started_at, paid_until = excluded.paid_until, updated_at = excluded.updated_at').bind(id(), account.id, interval, timestamp, until.toISOString()), env.DB.prepare("UPDATE memberships SET status = 'paid', paid_until = ?1, updated_at = ?2 WHERE account_id = ?3").bind(until.toISOString(), timestamp, account.id)]); return json({ status: 'succeeded', interval, amountJpy: planPrice(interval), paidUntil: until.toISOString(), simulator: true }, 201) }
async function upgradeQuote(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); const sub = await env.DB.prepare("SELECT interval, paid_started_at AS started, paid_until AS until FROM subscriptions WHERE account_id = ?1 AND status = 'active'").bind(account.id).first<{ interval: string; started: string; until: string }>(); if (!sub || sub.interval !== 'monthly') return json({ error: 'annual_upgrade_unavailable' }, 409); const total = new Date(sub.until).getTime() - new Date(sub.started).getTime(), remaining = Math.max(0, new Date(sub.until).getTime() - Date.now()), credit = Math.min(1650, Math.floor(1650 * remaining / total)); return json({ interval: 'annual', annualPriceJpy: 16500, creditJpy: credit, amountDueJpy: 16500 - credit, expiresAt: new Date(Date.now() + 5 * 60000).toISOString() }) }
async function cancelBilling(request: Request, env: Env) { const account = await currentAccount(request, env); if (!account || !env.DB) return json({ error: 'unauthorized' }, 401); const result = await env.DB.prepare("UPDATE subscriptions SET cancel_at_period_end = 1, status = 'cancel_at_period_end', updated_at = ?1 WHERE account_id = ?2 AND status = 'active'").bind(now(), account.id).run(); return result.meta.changes ? json({ status: 'cancel_at_period_end' }) : json({ error: 'no_active_subscription' }, 409) }
export default { async fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const publicMutation = (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login' || url.pathname === '/api/auth/recover')
  if (request.method !== 'GET' && !publicMutation && readCookie(request, cookieName(env)) && !csrfValid(request)) return json({ error: 'csrf_invalid' }, 403)
  if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true, environment: env.ENVIRONMENT, databaseConfigured: Boolean(env.DB) })
  if (url.pathname === '/api/auth/register' && request.method === 'POST') return register(request, env)
  if (url.pathname === '/api/auth/login' && request.method === 'POST') return login(request, env)
  if (url.pathname === '/api/auth/recover' && request.method === 'POST') return recover(request, env)
  if (url.pathname === '/api/auth/google/start' && request.method === 'GET') return oauthStart(request, env, 'google')
  if (url.pathname === '/api/auth/google/callback' && request.method === 'GET') return oauthCallbackV2(request, env, 'google')
  if (url.pathname === '/api/auth/line/start' && request.method === 'GET') return oauthStart(request, env, 'line')
  if (url.pathname === '/api/auth/line/callback' && request.method === 'GET') return oauthCallbackV2(request, env, 'line')
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return logout(request, env)
  if (url.pathname === '/api/auth/session' && request.method === 'GET') return me(request, env)
  if (url.pathname === '/api/membership/trial' && request.method === 'POST') return startTrial(request, env)
  if (url.pathname === '/api/membership' && request.method === 'GET') return membershipStatus(request, env)
  if (url.pathname === '/api/membership/cancel' && request.method === 'POST') return cancelMembership(request, env)
  if (url.pathname === '/api/billing/square/checkout' && request.method === 'POST') return squareCheckout(request, env)
  if (url.pathname === '/api/billing/square/webhook' && request.method === 'POST') return squareWebhook(request, env)
  if (url.pathname === '/api/billing/checkout' && request.method === 'POST') return billingCheckout(request, env)
  if (url.pathname === '/api/billing/upgrade-quote' && request.method === 'POST') return upgradeQuote(request, env)
  if (url.pathname === '/api/billing/cancel' && request.method === 'POST') return cancelBilling(request, env)
  if (url.pathname === '/api/account/profile' && request.method === 'PATCH') return updateProfile(request, env)
  if (url.pathname === '/api/account/password' && request.method === 'POST') return changePassword(request, env)
  if (url.pathname === '/api/account' && request.method === 'DELETE') return deleteAccount(request, env)
  if (url.pathname === '/api/account/recovery-codes' && request.method === 'POST') return recoveryCodes(request, env)
  if (url.pathname === '/api/assessments' && request.method === 'POST') return createAssessment(request, env)
  if (url.pathname === '/api/assessments/history' && request.method === 'GET') return assessmentHistory(request, env)
  if (url.pathname.startsWith('/api/assessments/') && url.pathname.endsWith('/complete') && request.method === 'POST') return completeAssessment(request, env, url.pathname.split('/')[3] || '')
  if ((url.pathname.startsWith('/api/public-profiles/') || url.pathname.startsWith('/api/profiles/')) && request.method === 'GET') return publicProfile(request, env)
  if (url.pathname === '/api/admin/questions' && (request.method === 'GET' || request.method === 'POST')) return adminQuestions(request, env)
  return json({ error: 'not_found' }, 404)
} } satisfies ExportedHandler<Env>
