<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Bell, ChevronRight, ArrowRight, Target } from 'lucide-vue-next'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import StudyProgress from '@/components/dashboard/StudyProgress.vue'
import SkillBreakdown from '@/components/dashboard/SkillBreakdown.vue'
import ContinueLearning from '@/components/dashboard/ContinueLearning.vue'
import RecentLessons from '@/components/dashboard/RecentLessons.vue'
import AssessmentInvite from '@/components/assessment/AssessmentInvite.vue'
import QuizRunner from '@/components/assessment/QuizRunner.vue'
import QuizResults from '@/components/assessment/QuizResults.vue'
import RegistrationPreview from '@/components/assessment/RegistrationPreview.vue'
import QuestionManager from '@/components/assessment/QuestionManager.vue'
import AppDialog from '@/components/assessment/AppDialog.vue'
import { Button } from '@/components/ui/button'
import { stats } from '@/data/dashboard'
import { useQuestionBank } from '@/composables/useQuestionBank'
import { useScrollHeader } from '@/composables/useScrollHeader'
import { selectQuestions } from '@/lib/assessment'
import type { GameMode, PokerQuestion, QuizResult } from '@/types/assessment'

const view = ref<'dashboard' | 'quiz' | 'results' | 'manager'>('dashboard')
const invite = ref(false), registration = ref(false), editorDirty = ref(false)
const leaveConfirmation = ref(false), pendingTarget = ref<'dashboard' | 'assessment' | 'manager'>('dashboard')
const questions = ref<PokerQuestion[]>([]), mode = ref<GameMode>('cash'), result = ref<QuizResult>()
const { bank } = useQuestionBank()
const { hidden: headerHidden, elevated: headerElevated, reveal: revealHeader } = useScrollHeader()
const pageLabel = computed(() => ({ dashboard: 'ダッシュボード', quiz: '実力診断', results: '診断結果', manager: '問題管理' })[view.value])
const isLocalEditor = import.meta.env.DEV
onMounted(() => { try { invite.value = sessionStorage.getItem('kurabu.invite-dismissed') !== '1' } catch { invite.value = true } })
function setInvite(open: boolean) {
  invite.value = open
  if (!open) { try { sessionStorage.setItem('kurabu.invite-dismissed', '1') } catch { /* Optional preference only. */ } }
}
function navigate(target: 'dashboard' | 'assessment' | 'manager') {
  if (view.value === 'quiz' || editorDirty.value) { pendingTarget.value = target; leaveConfirmation.value = true; return }
  applyNavigation(target)
}
function applyNavigation(target: 'dashboard' | 'assessment' | 'manager') {
  leaveConfirmation.value = false
  if (target === 'assessment') { if (view.value === 'quiz' || view.value === 'manager') view.value = 'dashboard'; setInvite(true); return }
  view.value = target
}
function start(selectedMode: GameMode) {
  const selected = selectQuestions(bank.value, selectedMode)
  if (selected.length < 10) return
  mode.value = selectedMode; questions.value = selected; setInvite(false); view.value = 'quiz'
}
function complete(completed: QuizResult) { result.value = completed; view.value = 'results' }
function focusPage() {
  const heading = document.querySelector<HTMLElement>('main h1'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true })
}
watch(view, async () => {
  document.title = `${pageLabel.value} | クラブポーカー`
  document.body.classList.toggle('quiz-active', view.value === 'quiz')
  revealHeader()
  await nextTick(); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
})
function beforeUnload(event: BeforeUnloadEvent) { if (view.value === 'quiz') { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  document.body.classList.remove('quiz-active')
})
</script>

<template>
  <a class="skip-link" href="#main-content">本文へスキップ</a>
  <div class="app-shell app-ja"><AppSidebar :current="view" :show-manager="isLocalEditor" @navigate="navigate" /><div class="main-shell">
    <header :class="['topbar', { 'topbar-hidden': headerHidden, 'topbar-elevated': headerElevated }]" @focusin="revealHeader"><div class="breadcrumb"><span>学習ルーム</span><ChevronRight :size="13" /><Transition name="crumb" mode="out-in"><strong :key="pageLabel">{{ pageLabel }}</strong></Transition></div><div class="topbar-right"><span v-if="view !== 'dashboard'" class="preview-label">ローカルプレビュー</span><button class="notification-button" disabled aria-label="通知（準備中）"><Bell :size="18" :stroke-width="1.5" /></button><div class="avatar small">G</div></div></header>
    <main id="main-content" tabindex="-1">
      <Transition name="page" mode="out-in" @after-enter="focusPage"><div :key="view" class="page-view">
      <template v-if="view === 'dashboard'">
        <div class="page-heading"><div><div class="eyebrow page-eyebrow">クラブポーカー　ポーカー学習クラブ</div><h1>その一手を、もっと確かなものに。</h1><p>ポーカーを学ぶ。自分の判断を知る。次の一歩は、ここから。</p></div></div>
        <section class="diagnosis-banner"><div class="banner-icon"><Target :size="26" /></div><div><h2>あなたの強みと、見えていないEVロス。</h2><p>10ハンドの診断で、今の課題を見つけましょう。</p></div><Button class="primary-action" @click="setInvite(true)">実力診断を受ける<ArrowRight :size="16" /></Button></section>
        <section aria-label="学習統計（サンプル）" class="stats-grid"><StatCard v-for="stat in stats" :key="stat.label" :stat="stat" /></section>
        <div class="dashboard-grid"><StudyProgress /><SkillBreakdown /><ContinueLearning /><RecentLessons /></div>
      </template>
      <QuizRunner v-else-if="view === 'quiz'" :questions="questions" :mode="mode" @complete="complete" @exit="view = 'dashboard'" />
      <QuizResults v-else-if="view === 'results' && result" :result="result" @register="registration = true" @retry="setInvite(true)" @home="view = 'dashboard'" />
      <QuestionManager v-else-if="view === 'manager' && isLocalEditor" @dirty="editorDirty = $event" />
      </div></Transition>
    </main>
  </div></div>
  <AssessmentInvite :open="invite" :bank="bank" @update:open="setInvite" @start="start" />
  <RegistrationPreview :open="registration" @update:open="registration = $event" />
  <AppDialog :open="leaveConfirmation" title="この画面を離れますか？" :description="view === 'quiz' ? '診断中の回答は破棄されます。' : '保存していない問題の変更は破棄されます。'" @update:open="leaveConfirmation = $event"><div class="dialog-actions"><Button variant="outline" @click="leaveConfirmation = false">この画面に戻る</Button><Button class="primary-action" @click="applyNavigation(pendingTarget)">破棄して移動</Button></div></AppDialog>
</template>
