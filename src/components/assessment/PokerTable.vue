<script setup lang="ts">
import { computed } from 'vue'
import type { PokerQuestion } from '@/types/assessment'
import { playerTypes, streetLabels } from '@/types/assessment'
import { replayState, actionLabels } from '@/lib/poker-hand'
import { formatBb } from '@/lib/assessment'
import PlayingCard from './PlayingCard.vue'
import AnimatedBb from './AnimatedBb.vue'
const props = defineProps<{ question: PokerQuestion; cursor: number }>()
const state = computed(() => replayState(props.question, props.cursor, { skipPosts: true }))
const playbackLength = computed(() => (props.question.actions ?? []).filter(action => action.action !== 'post').length)
</script>
<template>
  <div class="replay-scene">
    <div class="table-topline"><span>6人卓 · NLホールデム</span><span>{{ streetLabels[state.street] }}</span></div>
    <div class="poker-arena" aria-label="6人のポーカーテーブル">
      <div class="oval-felt"><div class="felt-mark">KURABU POKER</div><div class="community" aria-label="ボード"><template v-for="i in 5" :key="i"><PlayingCard v-if="state.board[i - 1]" :card="state.board[i - 1]!" /><span v-else class="card-placeholder" aria-hidden="true">♧</span></template></div><div class="pot-pill">POT <strong><AnimatedBb :value="state.potBb" /></strong> BB</div></div>
      <div v-for="seat in state.seats" :key="seat.position" :class="['ring-seat', `seat-${seat.position.toLowerCase()}`, { 'is-hero': seat.hero, 'is-folded': !seat.inHand, 'is-acting': state.current?.position === seat.position, 'has-chip-action': (state.lastActions[seat.position]?.amountBb ?? 0) > 0 }]">
        <div v-if="seat.hero" class="seat-holecards" aria-label="あなたの手札"><PlayingCard v-for="card in question.heroCards" :key="card" :card="card" /></div>
        <span v-else-if="seat.inHand || state.lastActions[seat.position]?.action === 'fold'" :class="['secret-cards', { 'is-folded': !seat.inHand }]" aria-label="非公開の手札"><span class="secret-card" /><span class="secret-card" /></span>
        <div class="seat-chip"><div><strong>{{ seat.position }}</strong><span><AnimatedBb :value="seat.stackBb" /><small> BB</small></span></div><span v-if="seat.hero" class="seat-subtitle">あなた</span><span v-else :title="playerTypes[seat.type!].description" class="seat-subtitle">{{ seat.type }}<small> · {{ playerTypes[seat.type!].name }}</small></span></div>
        <span v-if="state.lastActions[seat.position]" :class="['seat-last-action', `action-${state.lastActions[seat.position]!.action}`, { 'action-current': state.current?.position === seat.position && state.current.action !== 'deal' }]"><span class="action-name">{{ actionLabels[state.lastActions[seat.position]!.action] }}</span><span v-if="state.lastActions[seat.position]!.amountBb" class="action-amount">{{ formatBb(state.lastActions[seat.position]!.amountBb) }}BB</span></span><span v-else-if="!seat.inHand" class="seat-last-action folded-label action-fold">フォールド</span>
      </div>
    </div>
    <div class="table-bottomline"><strong>{{ cursor === playbackLength ? 'あなたのアクション' : 'アクションを確認中' }}</strong></div>
  </div>
</template>
