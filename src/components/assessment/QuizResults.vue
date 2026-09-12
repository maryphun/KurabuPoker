<script setup lang="ts">
import SmoothDisclosure from './SmoothDisclosure.vue'
import { computed } from 'vue'
import { ArrowRight, RotateCcw, Check, TrendingDown, Target, Clock3, GraduationCap } from 'lucide-vue-next'
import type { QuizResult } from '@/types/assessment'
import { modeLabels } from '@/types/assessment'
import { summarizeAnswers, evaluateAnswer, formatBb } from '@/lib/assessment'
import { Button } from '@/components/ui/button'
import PlayingCard from './PlayingCard.vue'
const props = defineProps<{ result: QuizResult }>()
defineEmits<{ register: []; retry: []; home: [] }>()
const stats = computed(() => summarizeAnswers(props.result.answers))
const rows = computed(() => props.result.answers.map(answer => ({ ...answer, ...evaluateAnswer(answer) })))
</script>
<template>
  <section class="results-page">
    <div class="result-heading"><span class="section-kicker"><Check :size="16" />診断完了 · {{ modeLabels[result.mode] }}</span><h1>あなたの判断を、次の強みに。</h1><p>{{ result.answers.length }}ハンド、おつかれさまでした。この診断での傾向を振り返りましょう。</p></div>
    <div class="result-level"><div class="level-icon"><GraduationCap :size="30" /></div><div><span>今回の診断での目安</span><h2>{{ stats.level }}</h2><p>この{{ result.answers.length }}問の正答率による参考評価です。</p></div><button class="quiet-button" @click="$emit('retry')"><RotateCcw :size="16" />もう一度診断</button></div>
    <div class="result-stats"><div><Target :size="19" /><span>正答率</span><strong>{{ stats.accuracy }}<small>%</small></strong><p>{{ stats.correctCount }} / {{ result.answers.length }} ハンドで基準EV最大の選択</p></div><div class="loss-stat"><TrendingDown :size="19" /><span>合計EVロス</span><strong>{{ formatBb(stats.totalLoss) }}<small>bb</small></strong><p>1ハンド平均 {{ formatBb(stats.averageLoss) }} bb</p></div><div><Clock3 :size="19" /><span>回答時間</span><strong>{{ Math.floor(stats.seconds / 60) }}<small>分</small>{{ stats.seconds % 60 }}<small>秒</small></strong><p>考えた時間を含む診断中の合計</p></div></div>
    <p class="ev-note">EVロス = 各ハンドの最大基準EV − 選択したアクションの基準EV。数値は教材の仮定に基づく期待値の差で、実際に失った金額ではありません。{{ result.mode === 'tournament' ? 'トーナメントはチップEVで評価し、賞金EV（ICM）は含みません。' : '1 bbはビッグブラインド1回分です。' }}</p>
    <section class="result-breakdown"><div><h2>分野別の診断結果</h2><p>EVロスが大きい分野から振り返りましょう。</p></div><div class="category-results"><div v-for="category in stats.categories" :key="category.name"><div class="category-label"><strong>{{ category.name }}</strong><span>{{ category.correct }}/{{ category.count }} 正答 <b>{{ formatBb(category.loss) }} bb ロス</b></span></div><div class="skill-track"><span :style="{ width: `${category.correct / category.count * 100}%`, background: 'var(--primary)' }" /></div></div></div></section>
    <section class="register-callout"><div><span class="section-kicker">診断を、成長のきっかけに</span><h2>あなたに合う改善ヒントを受け取ろう。</h2><p>アカウントを登録して、{{ stats.categories.find(c => c.loss > 0)?.name ?? '次のレベル' }}の学習につなげましょう。</p></div><div><Button class="primary-action" @click="$emit('register')">アカウント登録へ<ArrowRight :size="17" /></Button><small>現在は登録画面のプレビューです</small></div></section>
    <section class="hand-review"><div class="review-heading"><h2>ハンドごとの振り返り</h2><span>問題の基準値・仮定まで確認できます</span></div><SmoothDisclosure v-for="(row, i) in rows" :key="row.question.id"><template #summary><span class="review-number">{{ String(i + 1).padStart(2, '0') }}</span><div><strong>{{ row.question.title }}</strong><span>あなたの選択：{{ row.selected.label }}</span></div><b :class="{ 'has-loss': !row.correct }">{{ row.correct ? '最適な選択' : `${formatBb(row.loss)} bb ロス` }}</b></template><div class="review-body"><div class="review-cards"><span>手札</span><PlayingCard v-for="card in row.question.heroCards" :key="card" :card="card" /><span v-if="row.question.board.length">ボード</span><PlayingCard v-for="card in row.question.board" :key="card" :card="card" /></div><p>{{ row.question.context }}</p><div v-if="row.raiseToBb !== undefined" class="review-option"><div><strong>{{ row.selected.label }}</strong><span class="tiny-badge">あなたの回答</span><b>{{ formatBb(row.selected.evBb) }} bb EV</b></div><p>{{ row.selected.explanation }}</p></div><div class="review-option" v-for="option in row.question.options" :key="option.id"><div><strong>{{ option.label }}</strong><span v-if="option.id === row.optionId" class="tiny-badge">あなたの回答</span><span v-if="row.best.some(best => best.id === option.id)" class="tiny-badge mint">基準EV最大</span><b>{{ option.evBb > 0 ? '+' : '' }}{{ formatBb(option.evBb) }} bb</b></div><p>{{ option.explanation }}</p></div><div class="ev-basis"><strong>EVの計算・前提</strong><p>{{ row.question.evBasis }}</p></div></div></SmoothDisclosure></section>
    <button class="quiet-button" @click="$emit('home')">ダッシュボードに戻る</button>
  </section>
</template>
