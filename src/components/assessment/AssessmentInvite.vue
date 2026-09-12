<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowRight, Trophy, Spade, Clock3, Target, TrendingDown } from 'lucide-vue-next'
import AppDialog from './AppDialog.vue'
import { Button } from '@/components/ui/button'
import type { GameMode, QuestionBank } from '@/types/assessment'
const props = defineProps<{ open: boolean; bank: QuestionBank }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; start: [mode: GameMode] }>()
const mode = ref<GameMode>('cash')
const count = computed(() => Math.min(10, props.bank.questions.filter(q => q.mode === mode.value && q.enabled).length))
</script>
<template>
  <AppDialog :open="open" title="まずは自分の実力を把握する" @update:open="emit('update:open', $event)">
    <template #icon><div class="invite-brand"><img src="/kurabu-poker-logo.svg" width="48" height="48" alt="" /><span>ポーカー実力診断</span></div></template>
    <div class="invite-facts"><span><Clock3 :size="16" />約5〜8分</span><span><Target :size="16" />10ハンド</span><span><TrendingDown :size="16" />EVロスを確認</span></div>
    <fieldset class="mode-picker"><legend>ゲームを選択</legend>
      <label :class="{ chosen: mode === 'cash' }"><input v-model="mode" type="radio" value="cash" name="game-mode" /><Spade :size="24" /><strong>リングゲーム</strong></label>
      <label :class="{ chosen: mode === 'tournament' }"><input v-model="mode" type="radio" value="tournament" name="game-mode" /><Trophy :size="24" /><strong>トーナメント</strong></label>
    </fieldset>
    <Button class="primary-action wide" :disabled="count < 10" @click="emit('start', mode)">{{ count === 10 ? 'テストを開始' : `公開問題があと${10 - count}問必要です` }}<ArrowRight :size="17" /></Button>
    <button class="quiet-button wide" @click="emit('update:open', false)">あとで試す</button>
    <p class="invite-footnote">登録不要です。</p>
  </AppDialog>
</template>
