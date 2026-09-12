<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { Plus, Copy, Download, Upload, Save, Trash2, ArrowLeft, Undo2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useQuestionBank } from '@/composables/useQuestionBank'
import { defaultBank } from '@/data/question-bank'
import type { PokerQuestion, QuestionBank, GameMode, Opponent } from '@/types/assessment'
import { positions, playerTypes, modeLabels, streetLabels, difficultyLabels } from '@/types/assessment'
import { actionLabels } from '@/lib/poker-hand'
import { parseBank } from '@/lib/assessment'
import AppDialog from './AppDialog.vue'

const emit = defineEmits<{ dirty: [value: boolean] }>()
const { bank, save, storageMessage } = useQuestionBank()
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const filter = ref<'all' | GameMode>('all')
const draft = ref<PokerQuestion>(clone(bank.value.questions[0]!))
const original = ref(JSON.stringify(draft.value))
const message = ref(''), error = ref(''), mobileEditing = ref(false)
const undoBank = ref<QuestionBank>()
const fileInput = ref<HTMLInputElement>()
const dirty = computed(() => JSON.stringify(draft.value) !== original.value)
watch(dirty, value => emit('dirty', value), { immediate: true })
const visibleQuestions = computed(() => bank.value.questions.filter(q => filter.value === 'all' || q.mode === filter.value))
const boardText = ref(draft.value.board.join(' '))
watch(boardText, value => { draft.value.board = value.trim() ? value.trim().split(/\s+/) : [] })
const historyText = computed({ get: () => draft.value.history.join('\n'), set: value => { draft.value.history = value.split('\n') } })
const confirmationOpen = ref(false), confirmationText = ref('')
let resolveConfirmation: ((answer: boolean) => void) | undefined
function askConfirmation(text: string) {
  confirmationText.value = text; confirmationOpen.value = true
  return new Promise<boolean>(resolve => { resolveConfirmation = resolve })
}
function finishConfirmation(answer: boolean) { confirmationOpen.value = false; resolveConfirmation?.(answer); resolveConfirmation = undefined }
async function allowDiscard() { return !dirty.value || await askConfirmation('未保存の変更を破棄しますか？') }
watch(error, async value => { if (value) { await nextTick(); document.querySelector<HTMLElement>('.manager-page [role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }) } })
function load(question: PokerQuestion, isNew = false) {
  draft.value = clone(question); boardText.value = draft.value.board.join(' '); original.value = isNew ? '' : JSON.stringify(draft.value)
  error.value = ''; message.value = ''; mobileEditing.value = true
}
async function select(question: PokerQuestion) { if (await allowDiscard()) load(question) }
async function add(copy = false) {
  if (!await allowDiscard()) return
  const question = clone(copy ? draft.value : defaultBank.questions[0]!)
  question.id = crypto.randomUUID(); question.title = copy ? `${question.title}（コピー）` : '新しい問題'
  question.enabled = false
  load(question, true)
}
function changeHero() {
  const oldSeats = draft.value.opponents
  draft.value.opponents = positions.filter(p => p !== draft.value.heroPosition).map(position => oldSeats.find(p => p.position === position) ?? { position, type: 'TAG', stackBb: 100, inHand: false } as Opponent)
}
function addOption() { draft.value.options.push({ id: crypto.randomUUID(), action: 'raise', sizeBb: 1, label: '', evBb: 0, explanation: '' }) }
function addAction() { (draft.value.actions ??= []).push({ position: 'dealer', action: 'deal', street: draft.value.street, amountBb: 0 }) }
function moveAction(index: number, delta: number) { const list = draft.value.actions!; const other = index + delta; if (other < 0 || other >= list.length) return; [list[index], list[other]] = [list[other]!, list[index]!] }
function persist() {
  error.value = ''; message.value = ''
  try {
    const next = clone(bank.value)
    const index = next.questions.findIndex(q => q.id === draft.value.id)
    if (index < 0) next.questions.push(clone(draft.value)); else next.questions[index] = clone(draft.value)
    undoBank.value = clone(bank.value); save(next); original.value = JSON.stringify(draft.value)
    message.value = '保存しました。次に開始する診断から反映されます。'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '保存できませんでした。' }
}
async function remove() {
  if (!await askConfirmation('この問題を削除しますか？「元に戻す」で直前の変更を取り消せます。')) return
  const next = clone(bank.value); next.questions = next.questions.filter(q => q.id !== draft.value.id)
  try { undoBank.value = clone(bank.value); save(next); load(bank.value.questions[0]!); message.value = '問題を削除しました。' }
  catch (cause) { error.value = (cause as Error).message }
}
async function undo() {
  if (!undoBank.value || !await allowDiscard()) return
  try { save(undoBank.value); undoBank.value = undefined; load(bank.value.questions[0]!); message.value = '直前の変更を取り消しました。' }
  catch (cause) { error.value = (cause as Error).message }
}
function exportBank() {
  const blob = new Blob([JSON.stringify(bank.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = 'kurabu-questions.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  message.value = '保存済みの問題集を書き出しました。未保存の変更は含まれません。'
}
async function importBank(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]
  if (!file) return
  error.value = ''; message.value = ''
  try {
    if (file.size > 2_000_000) throw new Error('読み込めるファイルは2MBまでです。')
    const next = parseBank(await file.text())
    if (!await allowDiscard() || !await askConfirmation(`現在の問題集を${next.questions.length}問の問題集に置き換えますか？`)) return
    undoBank.value = clone(bank.value); save(next); load(bank.value.questions[0]!); message.value = '問題集を読み込みました。'
  } catch (cause) { error.value = (cause as Error).message }
  finally { input.value = '' }
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); emit('dirty', false) })
</script>
<template>
  <section class="manager-page"><div class="manager-heading"><div><span class="section-kicker">ローカル管理</span><h1>診断問題をつくる</h1><p>状況も、相手も、選択肢も。あなたの教材に合わせて編集できます。</p></div><Button class="primary-action" @click="add()"><Plus :size="16" />問題を追加</Button></div>
    <div class="manager-notice">編集内容はこのブラウザだけに保存されます。別の端末やブラウザへ移すにはJSONを書き出してください。各選択肢のEVは作成者が設定する教材の基準値です。</div>
    <div class="manager-toolbar"><div><Button variant="outline" @click="exportBank"><Download :size="15" />JSON書き出し</Button><Button variant="outline" @click="fileInput?.click()"><Upload :size="15" />JSON読み込み</Button><input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importBank" /></div><button class="quiet-button" :disabled="!undoBank" @click="undo"><Undo2 :size="15" />元に戻す</button></div>
    <p v-if="storageMessage" class="error-message" role="alert">{{ storageMessage }}</p><p v-if="message" class="success-message" role="status">{{ message }}</p><p v-if="error" class="error-message" role="alert">{{ error }}</p>
    <div :class="['manager-layout', { 'mobile-editing': mobileEditing }]"><aside class="question-list"><label class="filter-label">ゲーム形式<select v-model="filter"><option value="all">すべて（{{ bank.questions.length }}問）</option><option value="cash">リングゲーム</option><option value="tournament">トーナメント</option></select></label><button v-for="question in visibleQuestions" :key="question.id" :class="{ active: draft.id === question.id }" @click="select(question)"><span>{{ modeLabels[question.mode] }} · {{ question.enabled ? '出題中' : '下書き' }}</span><strong>{{ question.title }}</strong><small>{{ question.category }} · {{ streetLabels[question.street] }}</small></button><p v-if="!visibleQuestions.length" class="fine-print">この形式の問題はありません。</p></aside>
    <form class="question-editor" @submit.prevent="persist"><button type="button" class="quiet-button mobile-list-back" @click="mobileEditing = false"><ArrowLeft :size="15" />問題一覧へ</button><div class="editor-heading"><h2>{{ draft.title }}</h2><span :class="['tiny-badge', { amber: dirty }]">{{ dirty ? '未保存' : '保存済み' }}</span></div>
      <fieldset><legend>基本情報</legend><label>問題タイトル<input v-model="draft.title" required maxlength="120" /></label><div class="form-grid three"><label>ゲーム形式<select v-model="draft.mode"><option v-for="(label, key) in modeLabels" :key="key" :value="key">{{ label }}</option></select></label><label>難易度<select v-model="draft.difficulty"><option v-for="(label, key) in difficultyLabels" :key="key" :value="key">{{ label }}</option></select></label><label>分野<input v-model="draft.category" required maxlength="60" placeholder="例：ポットオッズ" /></label></div><label class="checkbox-label"><input v-model="draft.enabled" type="checkbox" />診断に出題する（オフで下書き保存）</label></fieldset>
      <fieldset><legend>ハンドの状況</legend><div class="form-grid three"><label>ストリート<select v-model="draft.street"><option v-for="(label, key) in streetLabels" :key="key" :value="key">{{ label }}</option></select></label><label>自分のポジション<select v-model="draft.heroPosition" @change="changeHero"><option v-for="p in positions" :key="p">{{ p }}</option></select></label><label>残り実効スタック（bb）<input v-model.number="draft.effectiveStackBb" type="number" min="0.01" step="any" required /></label></div><div class="form-grid"><label>手札1<input v-model="draft.heroCards[0]" required maxlength="2" placeholder="As" /></label><label>手札2<input v-model="draft.heroCards[1]" required maxlength="2" placeholder="Kh" /></label></div><label>ボード（半角スペース区切り）<input v-model="boardText" placeholder="Qs Js Ts 4d 2c" /><small>A〜2、T＝10、s＝♠、h＝♥、d＝♦、c＝♣。プリフロップは空欄。</small></label><div class="form-grid"><label>相手のベットを含むポット（bb）<input v-model.number="draft.potBb" required type="number" min="0" step="any" /></label><label>コールに必要な額（bb）<input v-model.number="draft.toCallBb" required type="number" min="0" step="any" /></label></div><label>状況・レンジの前提<textarea v-model="draft.context" rows="4" required /></label><label>旧形式の履歴メモ（再生には下のアクションを使用）<textarea v-model="historyText" rows="4" required /></label><label>ユーザーへの質問<input v-model="draft.prompt" required /></label></fieldset>
      <fieldset><legend>再生するアクション</legend><p class="fine-print">上から順に再生します。金額はその時に追加するチップ（レイズ総額ではありません）。配札はディーラー、その他は席を選択。最終ポット・残りスタックから初期状態を復元します。最初からの履歴を入れるとハンド全体を再生できます。</p><div v-for="(action, i) in draft.actions" :key="i" class="replay-editor-row"><label>{{ i + 1 }} · ストリート<select v-model="action.street"><option v-for="(name, key) in streetLabels" :key="key" :value="key">{{ name }}</option></select></label><label>プレイヤー<select v-model="action.position"><option value="dealer">ディーラー</option><option v-for="p in positions" :key="p">{{ p }}</option></select></label><label>アクション<select v-model="action.action"><option v-for="(name, key) in actionLabels" :key="key" :value="key">{{ name }}</option></select></label><label>追加額（bb）<input v-model.number="action.amountBb" required type="number" min="0" step="any" /></label><div><button type="button" :aria-label="'アクション' + (i + 1) + 'を上へ'" :disabled="i === 0" @click="moveAction(i, -1)">↑</button><button type="button" :aria-label="'アクション' + (i + 1) + 'を下へ'" :disabled="i === draft.actions!.length - 1" @click="moveAction(i, 1)">↓</button><button type="button" :aria-label="'アクション' + (i + 1) + 'を削除'" @click="draft.actions!.splice(i, 1)">×</button></div></div><Button type="button" variant="outline" :disabled="(draft.actions?.length ?? 0) >= 80" @click="addAction"><Plus :size="15" />アクションを追加</Button></fieldset>
      <fieldset><legend>相手プレイヤー</legend><p class="fine-print">Heroにはタイプを設定しません。相手の各席のタイプ・残りスタック・参加状態を指定できます。タイプを変更した場合、レンジと基準EVも見直してください。</p><div v-for="opponent in draft.opponents" :key="opponent.position" class="opponent-editor"><strong>{{ opponent.position }}</strong><label>プレイヤータイプ<select v-model="opponent.type"><option v-for="(type, key) in playerTypes" :key="key" :value="key">{{ key }} · {{ type.name }}</option></select></label><label>残りスタック（bb）<input v-model.number="opponent.stackBb" type="number" min="0" step="any" required /></label><label class="checkbox-label"><input v-model="opponent.inHand" type="checkbox" />参加中</label></div></fieldset>
      <fieldset><legend>アクションとサイズ別EV</legend><div class="form-grid"><label>自分のこのストリートの投入済み額（bb）<input v-model.number="draft.heroInvestedBb" type="number" min="0" step="any" /></label><label>レイズサイズ（bb）<input v-model.number="draft.minRaiseToBb" type="number" min="1" step="any" /></label></div><p class="fine-print">レイズは最小額から投入済み額＋残り実効スタックまで、2点以上のサイズ別EVを設定。間のサイズは直線補間します。オールインには最大サイズと同じEVを入力してください。ベットがない状況ではレイズが「ベット」、コールが「チェック」と表示されます。</p><p class="fine-print">同じ意思決定時点を基準に、各アクションのEVをbbで入力してください。最大EVの選択肢を正答として採点します。同率も正答です。</p><div v-for="(option, i) in draft.options" :key="option.id" class="option-editor"><div class="form-grid"><label>選択肢{{ i + 1 }}<input v-model="option.label" required /></label><label>基準EV（bb）<input v-model.number="option.evBb" type="number" step="any" required /></label></div><div class="form-grid"><label>アクション種別<select v-model="option.action"><option value="fold">フォールド</option><option value="call">コール</option><option value="check">チェック</option><option value="raise">レイズ／ベットのEV基準点</option><option value="all-in">オールイン</option></select></label><label v-if="option.action === 'raise'">レイズサイズ（bb）<input v-model.number="option.sizeBb" required type="number" min="0.01" step="any" /></label></div><label>この選択肢の解説<textarea v-model="option.explanation" rows="2" required /></label><button type="button" class="quiet-button" :disabled="draft.options.length <= 2" @click="draft.options.splice(i, 1)">この選択肢を削除</button></div><Button type="button" variant="outline" :disabled="draft.options.length >= 20" @click="addOption"><Plus :size="15" />選択肢を追加</Button><label>EVの計算・仮定・出典<textarea v-model="draft.evBasis" rows="4" required /></label></fieldset>
      <div class="editor-actions"><div><button type="button" class="quiet-button" @click="add(true)"><Copy :size="15" />複製</button><button type="button" class="quiet-button danger-text" :disabled="bank.questions.length <= 1 || !bank.questions.some(q => q.id === draft.id)" @click="remove"><Trash2 :size="15" />削除</button></div><Button type="submit" class="primary-action"><Save :size="16" />問題を保存</Button></div>
    </form></div>
  </section>
  <AppDialog :open="confirmationOpen" title="変更の確認" :description="confirmationText" @update:open="!$event && finishConfirmation(false)"><div class="dialog-actions"><Button variant="outline" @click="finishConfirmation(false)">キャンセル</Button><Button class="primary-action" @click="finishConfirmation(true)">変更を適用</Button></div></AppDialog>
</template>
