export const accountGoals = ['アミューズメントポーカーを優勝したい', 'カジノで勝ちたい', 'トーナメントプロを目指したい'] as const
export const experienceOptions = ['未経験', '1年未満', '1〜3年', '3年以上'] as const
export const playFormatOptions = ['ライブ', 'オンライン', '両方'] as const
export type AccountGoal = typeof accountGoals[number]
export type Experience = typeof experienceOptions[number]
export type PlayFormat = typeof playFormatOptions[number]
export interface AccountDraft { username: string; password: string; nickname: string; goal: AccountGoal | ''; experience: Experience | ''; playFormat: PlayFormat | ''; consent: boolean }
export interface AccountFieldErrors { username?: string; password?: string; nickname?: string; goal?: string; consent?: string }
const usernamePattern = /^[A-Za-z_]{4,24}$/
export function normalizeUsername(value: string): string { return value.toLowerCase() }
export function hasControlCharacter(value: string): boolean { return /[\u0000-\u001f\u007f]/u.test(value) }
export function validateAccountDraft(draft: AccountDraft): AccountFieldErrors {
  const errors: AccountFieldErrors = {}
  if (!usernamePattern.test(normalizeUsername(draft.username))) errors.username = '4〜24文字の英字とアンダースコアで入力してください。'
  if (draft.password.length < 12 || draft.password.length > 128) errors.password = 'パスワードは12〜128文字で入力してください。'
  if (!draft.nickname.trim() || draft.nickname.length > 30 || hasControlCharacter(draft.nickname)) errors.nickname = 'ニックネームは1〜30文字で入力してください。'
  if (!draft.goal) errors.goal = '目標を1つ選択してください。'
  if (!draft.consent) errors.consent = '利用規約とプライバシーに同意してください。'
  return errors
}
export function isValidAccountDraft(draft: AccountDraft): boolean { return Object.keys(validateAccountDraft(draft)).length === 0 }
