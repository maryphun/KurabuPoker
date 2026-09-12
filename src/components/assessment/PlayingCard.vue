<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ card: string }>()
const suit = computed(() => ({ s: '♠', h: '♥', d: '♦', c: '♣' })[props.card[1]!] ?? '')
const suitName = computed(() => ({ s: 'スペード', h: 'ハート', d: 'ダイヤ', c: 'クラブ' })[props.card[1]!] ?? '')
</script>
<template><span :class="['playing-card', { red: ['h', 'd'].includes(card[1]!) }]" role="img" :aria-label="`${suitName}の${card[0] === 'T' ? '10' : card[0]}`"><b>{{ card[0] === 'T' ? '10' : card[0] }}</b><span>{{ suit }}</span></span></template>
