<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowRight, KeyRound, LogIn } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import AppDialog from '@/components/assessment/AppDialog.vue'
import RegistrationPreview from '@/components/assessment/RegistrationPreview.vue'
import { apiOrigin, apiRequest } from '@/lib/api'
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const mode = ref<'login' | 'recover'>('login'), registration = ref(false), username = ref(''), password = ref(''), code = ref(''), newPassword = ref(''), error = ref(''), loading = ref(false), success = ref('')
const canSubmit = computed(() => mode.value === 'login' ? username.value.length > 0 && password.value.length > 0 : username.value.length > 0 && code.value.length > 0 && newPassword.value.length >= 12)
watch(() => props.open, (open) => { if (open) { mode.value = 'login'; error.value = ''; success.value = ''; username.value = ''; password.value = ''; code.value = ''; newPassword.value = '' } })
async function submit() { loading.value = true; error.value = ''; success.value = ''; try { if (mode.value === 'login') { await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: username.value, password: password.value }) }); success.value = 'ログインしました。'; setTimeout(() => emit('update:open', false), 500) } else { await apiRequest('/api/auth/recover', { method: 'POST', body: JSON.stringify({ username: username.value, code: code.value, newPassword: newPassword.value }) }); success.value = 'パスワードを更新しました。' } } catch { error.value = mode.value === 'login' ? 'ユーザー名またはパスワードを確認してください。' : '復旧コードまたは入力内容を確認してください。' } finally { loading.value = false } }
function provider(provider: 'google' | 'line') { const redirect = `${apiOrigin}/api/auth/${provider}/callback`; window.location.href = `${apiOrigin}/api/auth/${provider}/start?redirect_uri=${encodeURIComponent(redirect)}` }
</script>
<template>
  <AppDialog :open="open" :title="mode === 'login' ? 'ログイン' : 'パスワードを復旧'" :description="mode === 'login' ? '学びの記録を続きから使えます。' : 'ユーザー名と復旧コードでパスワードを設定します。'" @update:open="emit('update:open', $event)">
    <form class="account-access-form" @submit.prevent="submit">
      <p v-if="error" class="registration-error" role="alert">{{ error }}</p><p v-if="success" class="registration-success" role="status">{{ success }}</p>
      <label>ユーザー名<input v-model="username" autocomplete="username" required /></label>
      <label v-if="mode === 'login'">パスワード<input v-model="password" type="password" autocomplete="current-password" required /></label>
      <template v-else><label>復旧コード<input v-model="code" autocomplete="one-time-code" required /></label><label>新しいパスワード<input v-model="newPassword" type="password" autocomplete="new-password" minlength="12" required /><small>12文字以上</small></label></template>
      <Button type="submit" class="primary-action wide" :disabled="!canSubmit || loading">{{ loading ? '確認中…' : mode === 'login' ? 'ログイン' : 'パスワードを更新' }}<LogIn v-if="mode === 'login'" :size="16" /><KeyRound v-else :size="16" /></Button>
    </form>
    <div v-if="mode === 'login'" class="provider-buttons"><Button variant="outline" @click="provider('google')">Googleでログイン</Button><Button variant="outline" @click="provider('line')">LINEでログイン</Button></div>
    <div class="account-access-links"><button type="button" @click="mode = mode === 'login' ? 'recover' : 'login'">{{ mode === 'login' ? '復旧コードでパスワードを再設定' : 'ログインに戻る' }}</button><button v-if="mode === 'login'" type="button" @click="registration = true">アカウントを作成<ArrowRight :size="14" /></button></div>
  </AppDialog>
  <RegistrationPreview :open="registration" @update:open="registration = $event" />
</template>
