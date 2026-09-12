<script setup lang="ts">
import SmoothDisclosure from './SmoothDisclosure.vue'
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { modeLabels, difficultyLabels } from '@/types/assessment'
import type { PokerQuestion, GameMode, AnswerRecord, QuizResult } from '@/types/assessment'
import { decisionChoices, raisePoints, actionLabel } from '@/lib/poker-hand'
import PokerTable from './PokerTable.vue'
import AppDialog from './AppDialog.vue'

const props = defineProps<{ questions: PokerQuestion[]; mode: GameMode }>()
const emit = defineEmits<{ complete: [result: QuizResult]; exit: [] }>()
const index = ref(0), selected = ref(''), confirmExit = ref(false), submitting = ref(false)
const answers: AnswerRecord[] = []
const question = computed(() => props.questions[index.value]!)
const actions = computed(() => (question.value.actions ?? []).filter(action => action.action !== 'post'))
const cursor = ref(actions.value.length), playing = ref(false)
const choices = computed(() => decisionChoices(question.value))
const modern = computed(() => question.value.options.some(o => o.action))
const points = computed(() => raisePoints(question.value))
const minRaise = computed(() => points.value[0]?.sizeBb ?? 1)
const maxRaise = computed(() => points.value.at(-1)?.sizeBb ?? question.value.effectiveStackBb)
const raiseSize = ref(minRaise.value)
const choice = computed(() => choices.value.find(c => c.key === selected.value))
const valid = computed(() => modern.value ? !!choice.value?.enabled && (selected.value !== 'raise' || (Number.isFinite(raiseSize.value) && raiseSize.value >= minRaise.value && raiseSize.value <= maxRaise.value)) : question.value.options.some(o => o.id === selected.value))
const heading = ref<HTMLElement>()
let started = performance.now(), timer: ReturnType<typeof setInterval> | undefined
function pause() { clearInterval(timer); timer = undefined; playing.value = false }
function step(delta: number) { pause(); cursor.value = Math.max(0, Math.min(actions.value.length, cursor.value + delta)) }
function startReplay() {
  pause()
  cursor.value = 0
  if (!actions.value.length) return
  playing.value = true
  timer = setInterval(() => { cursor.value++; if (cursor.value >= actions.value.length) pause() }, 1100)
}
function replay() {
  if (playing.value) { pause(); return }
  startReplay()
}
watch(confirmExit, value => { if (value) pause() })
watch(index, async () => { pause(); selected.value = ''; cursor.value = actions.value.length; raiseSize.value = minRaise.value; started = performance.now(); await nextTick(); startReplay(); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) })
onBeforeUnmount(pause)
function next() {
  if (submitting.value || !valid.value || playing.value || cursor.value !== actions.value.length) return
  submitting.value = true
  answers.push({ question: question.value, optionId: modern.value ? choice.value!.optionId! : selected.value, ...(selected.value === 'raise' ? { raiseToBb: raiseSize.value } : {}), ...(selected.value === 'all-in' ? { chosenAction: 'all-in' as const } : {}), elapsedMs: performance.now() - started })
  if (index.value === props.questions.length - 1) emit('complete', { mode: props.mode, answers, completedAt: new Date().toISOString() })
  else { index.value++; nextTick(() => { submitting.value = false }) }
}
nextTick(startReplay)
</script>
<template>
  <section class="quiz-page" aria-label="ポーカー実力診断">
    <div class="quiz-top"><button class="quiet-button" @click="confirmExit = true"><ArrowLeft :size="16" />診断を終了</button><span>{{ modeLabels[mode] }}診断</span><strong>{{ index + 1 }} <span>/ {{ questions.length }} ハンド</span></strong></div>
    <div class="quiz-progress" role="progressbar" aria-label="回答済みの問題" :aria-valuenow="index" :aria-valuemin="0" :aria-valuemax="questions.length"><span :style="{ width: `${index / questions.length * 100}%` }" /></div>
    <Transition name="hand" mode="out-in" @after-enter="heading?.focus({ preventScroll: true })"><div :key="question.id" class="hand-content">
    <div class="question-heading"><p class="eyebrow">ハンド {{ String(index + 1).padStart(2, '0') }} · {{ question.category }} · {{ difficultyLabels[question.difficulty] }}</p><h1 ref="heading" tabindex="-1">{{ question.title }}</h1></div>
    <div class="hand-workspace"><div class="table-column"><PokerTable :question="question" :cursor="cursor" />
      <section class="action-timeline" aria-label="アクション履歴"><div class="timeline-heading"><h2>アクション</h2><span>{{ cursor }} / {{ actions.length }}</span><div class="replay-controls"><button aria-label="前のアクション" :disabled="cursor === 0" @click="step(-1)"><ChevronLeft :size="18" /></button><button :aria-label="playing ? '再生を一時停止' : '最初から再生'" :disabled="!actions.length" @click="replay"><Pause v-if="playing" :size="16" /><Play v-else :size="16" /></button><button aria-label="次のアクション" :disabled="cursor === actions.length" @click="step(1)"><ChevronRight :size="18" /></button></div></div>
        <ol v-if="actions.length" class="action-chips"><li v-for="(action, i) in actions" :key="i" :class="{ 'current-action': cursor === i + 1, 'future-action': cursor < i + 1, 'street-action': action.action === 'deal', 'action-fold': action.action === 'fold', 'action-call': action.action === 'call' || action.action === 'check', 'action-raise': action.action === 'raise' || action.action === 'bet', 'action-all-in': action.action === 'all-in' }"><button :aria-label="`${i + 1}. ${actionLabel(action)}`" :aria-current="cursor === i + 1 ? 'step' : undefined" @click="pause(); cursor = i + 1">{{ actionLabel(action) }}</button></li></ol><p v-else class="fine-print">{{ question.actions?.length ? 'あなたからアクションを始めます。' : 'この保存済み問題には再生履歴がありません。問題管理から設定できます。' }}</p>
      </section></div>
      <div class="decision-panel new-decision"><h2>どうアクションしますか？</h2>
        <SmoothDisclosure class="hand-assumptions" :open="selected !== 'raise'"><template #summary>前提説明</template><p>{{ question.context }}</p></SmoothDisclosure>
        <form @submit.prevent="next"><fieldset v-if="modern" class="action-choices"><legend class="sr-only">アクションを選択</legend><label v-for="item in choices" :key="item.key" :class="{ selected: selected === item.key, unavailable: !item.enabled }"><input v-model="selected" type="radio" name="answer" :value="item.key" :disabled="!item.enabled" /><span><b>{{ item.label }}</b><small>{{ item.english }}</small></span><em>{{ item.detail }}</em></label></fieldset>
          <fieldset v-else class="answer-options"><legend>{{ question.prompt }}</legend><label v-for="option in question.options" :key="option.id" :class="{ selected: selected === option.id }"><input v-model="selected" :value="option.id" name="answer" type="radio" /><span>{{ option.label }}</span></label></fieldset>
          <Transition name="expand"><div v-if="selected === 'raise' && modern" class="sizing-reveal"><div class="sizing-clip"><div class="raise-sizing"><label for="raise-size">{{ question.toCallBb ? 'レイズサイズ' : 'ベット額' }} <span>bb</span></label><input id="raise-size" v-model.number="raiseSize" type="number" :min="minRaise" :max="maxRaise" step="any" required /><input v-model.number="raiseSize" aria-label="レイズサイズのスライダー" type="range" :min="minRaise" :max="maxRaise" step="0.1" /><div><span>最小 {{ minRaise }} bb</span><span>最大 {{ maxRaise }} bb</span></div><p v-if="!valid" class="error-message" role="alert">{{ minRaise }}〜{{ maxRaise }} bbの範囲で入力してください。</p></div></div></div></Transition>
          <p v-if="cursor !== actions.length" class="replay-hint">最後のアクションまで確認して回答してください。<button type="button" @click="pause(); cursor = actions.length">現在の状況へ</button></p>
          <Button type="submit" class="primary-action wide submit-decision" :disabled="!valid || submitting || playing || cursor !== actions.length">{{ index === questions.length - 1 ? '診断結果を見る' : '回答して次へ' }}<ArrowRight :size="16" /></Button>
        </form><p class="fine-print">全10ハンド回答後に解説を確認できます。</p>
      </div>
    </div>
    </div></Transition>
  </section>
  <AppDialog :open="confirmExit" title="診断を終了しますか？" description="ここまでの回答は破棄されます。もう一度受ける場合は、最初のハンドから開始します。" @update:open="confirmExit = $event"><div class="dialog-actions"><Button variant="outline" @click="confirmExit = false">診断を続ける</Button><Button class="primary-action" @click="emit('exit')">終了する</Button></div></AppDialog>
</template>

