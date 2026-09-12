<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import AppDialog from './AppDialog.vue'
import { accountGoals, experienceOptions, isValidAccountDraft, playFormatOptions, validateAccountDraft, normalizeUsername, type AccountDraft, type AccountFieldErrors } from '@/lib/account'
import { registerAccount } from '@/lib/api'
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const step = ref<1 | 2 | 3>(1), completed = ref(false), submitting = ref(false), savedRecovery = ref(false), serverError = ref(''), recoveryCodes = ref<string[]>([]), errors = ref<AccountFieldErrors>({})
const draft = ref<AccountDraft>({ username: '', password: '', nickname: '', goal: '', experience: '', playFormat: '', consent: false })
const canContinue = computed(() => {
  const found = validateAccountDraft({ ...draft.value, nickname: '仮', goal: 'カジノで勝ちたい', consent: true })
  return !found.username && !found.password
})
watch(() => props.open, (open) => { if (open) { step.value = 1; completed.value = false; submitting.value = false; savedRecovery.value = false; recoveryCodes.value = []; serverError.value = ''; errors.value = {}; draft.value = { username: '', password: '', nickname: '', goal: '', experience: '', playFormat: '', consent: false } } })
function next() {
  errors.value = {}
  if (step.value === 1) { const found = validateAccountDraft({ ...draft.value, nickname: '仮', goal: 'カジノで勝ちたい', consent: true }); if (found.username || found.password) { errors.value = found; return }; step.value = 2; return }
  if (step.value === 2) { const found = validateAccountDraft(draft.value); errors.value = found; if (!found.nickname && !found.goal && !found.consent) step.value = 3 }
}
async function finish() {
  if (!isValidAccountDraft(draft.value)) { step.value = 2; errors.value = validateAccountDraft(draft.value); return }
  submitting.value = true; serverError.value = ''
  try { const result = await registerAccount({ username: normalizeUsername(draft.value.username), password: draft.value.password, nickname: draft.value.nickname, goal: draft.value.goal, experience: draft.value.experience || undefined, playFormat: draft.value.playFormat || undefined, consentVersion: 'draft-2026-09-13' }); recoveryCodes.value = result.recoveryCodes; completed.value = true }
  catch (error) { serverError.value = error instanceof Error && error.message === 'database_unconfigured' ? 'サーバーのデータベースがまだ設定されていません。Cloudflare D1接続後に登録できます。' : '登録に失敗しました。入力内容を確認して、もう一度お試しください。' }
  finally { submitting.value = false }
}
</script>
<template>
  <AppDialog :open="open" title="学びを続ける、あなたの場所。" description="アカウント登録のローカル試作です。認証・メール送信・決済はまだ接続されていません。" @update:open="emit('update:open', $event)">
    <div class="preview-notice">入力内容はこの画面の試作状態にのみ使われ、アカウントやパスワードは保存されません。</div>
    <div v-if="completed" class="registration-complete" role="status"><Check :size="28" /><h3>アカウントを作成しました</h3><p>復旧コードはこの画面で一度だけ表示されます。安全な場所に保存してください。</p><div class="recovery-codes"><code v-for="code in recoveryCodes" :key="code">{{ code }}</code></div><label class="consent-label recovery-confirm"><input v-model="savedRecovery" type="checkbox" />復旧コードを保存しました</label><Button class="primary-action" :disabled="!savedRecovery" @click="emit('update:open', false)">診断結果に戻る</Button></div>
    <template v-else>
      <div class="registration-steps" aria-label="登録ステップ"><strong :class="{ active: step === 1 }">1 アカウント</strong><span>→</span><strong :class="{ active: step === 2 }">2 プロフィール</strong><span>→</span><strong :class="{ active: step === 3 }">3 確認</strong></div>
      <form v-if="step === 1" class="registration-form" @submit.prevent="next">
        <label>ユーザー名（ログイン用・変更不可）<input v-model="draft.username" required maxlength="24" autocomplete="username" placeholder="例: poker_player" @blur="draft.username = normalizeUsername(draft.username)" /><small>英字と _ のみ、4〜24文字。自動で小文字になります。</small><em v-if="errors.username">{{ errors.username }}</em></label>
        <label>パスワード<input v-model="draft.password" required type="password" minlength="12" maxlength="128" autocomplete="new-password" placeholder="12文字以上" /><em v-if="errors.password">{{ errors.password }}</em></label>
        <div class="registration-provider-note">Google / LINEログインは公式OAuth接続後に利用できます。</div>
        <Button type="submit" class="primary-action wide" :disabled="!canContinue">プロフィールへ進む<ArrowRight :size="16" /></Button>
      </form>
      <form v-else-if="step === 2" class="registration-form" @submit.prevent="next">
        <label>ニックネーム<input v-model="draft.nickname" required maxlength="30" placeholder="表示名" /><small>公開プロフィールに表示する名前です。</small><em v-if="errors.nickname">{{ errors.nickname }}</em></label>
        <label>目標<select v-model="draft.goal" required><option value="" disabled>選択してください</option><option v-for="goal in accountGoals" :key="goal" :value="goal">{{ goal }}</option></select><em v-if="errors.goal">{{ errors.goal }}</em></label>
        <label>経験年数（任意）<select v-model="draft.experience"><option value="">選択しない</option><option v-for="item in experienceOptions" :key="item" :value="item">{{ item }}</option></select></label>
        <label>プレイ形式（任意）<select v-model="draft.playFormat"><option value="">選択しない</option><option v-for="item in playFormatOptions" :key="item" :value="item">{{ item }}</option></select></label>
        <label class="consent-label"><input v-model="draft.consent" type="checkbox" />利用規約とプライバシーポリシーに同意します<em v-if="errors.consent">{{ errors.consent }}</em></label>
        <div class="dialog-actions"><Button type="button" variant="outline" @click="step = 1"><ArrowLeft :size="16" />戻る</Button><Button type="submit" class="primary-action">確認へ進む<ArrowRight :size="16" /></Button></div>
      </form>
      <div v-else class="registration-form registration-review"><p>以下の内容でアカウント登録を送信します。</p><p v-if="serverError" class="registration-error" role="alert">{{ serverError }}</p><dl><dt>ユーザー名</dt><dd>{{ normalizeUsername(draft.username) }}</dd><dt>ニックネーム</dt><dd>{{ draft.nickname }}</dd><dt>目標</dt><dd>{{ draft.goal }}</dd></dl><div class="dialog-actions"><Button variant="outline" :disabled="submitting" @click="step = 2"><ArrowLeft :size="16" />戻る</Button><Button class="primary-action" :disabled="submitting" @click="finish">{{ submitting ? '送信中…' : '登録内容を送信' }}<Check :size="16" /></Button></div></div>
    </template>
  </AppDialog>
</template>
