<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import type { stats } from '@/data/dashboard'
defineProps<{ stat: (typeof stats)[number] }>()
</script>

<template>
  <Card class="stat-card">
    <div class="stat-top"><span class="stat-label">{{ stat.label }}</span><component :is="stat.icon" :size="17" :class="['tone-text', stat.tone]" :stroke-width="1.7" /></div>
    <div class="stat-middle"><div class="stat-value">{{ stat.value }}<span>{{ stat.suffix }}</span></div>
      <svg v-if="stat.spark" :class="['sparkline', stat.tone]" viewBox="0 0 84 34" aria-hidden="true"><polyline :points="stat.spark" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
      <div v-else class="streak-days" aria-label="7日間の連続学習"><span v-for="(day, index) in ['月', '火', '水', '木', '金', '土', '日']" :key="index" :class="{ today: index === 6 }">{{ day }}</span></div>
    </div>
    <p :class="['stat-detail', { muted: !stat.spark }]"><ArrowUpRight v-if="stat.spark" :size="13" />{{ stat.detail }}</p>
  </Card>
</template>
