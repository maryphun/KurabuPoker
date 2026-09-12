<script setup lang="ts">
import { Check, ArrowRight } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { recentLessons } from '@/data/dashboard'
</script>

<template>
  <Card class="recent-panel"><div class="panel-heading"><h2>最近完了したレッスン</h2><span class="text-action">すべて見る <ArrowRight :size="15" /></span></div>
    <ul class="recent-list"><li v-for="lesson in recentLessons" :key="lesson.title"><div :class="['lesson-icon', lesson.tone]"><component :is="lesson.icon" :size="18" :stroke-width="1.5" /></div><div class="recent-title"><h3>{{ lesson.title }}</h3><p>{{ lesson.category }}<span>·</span>{{ lesson.duration }}</p></div><div class="lesson-completed"><span><Check :size="12" />完了</span><small>{{ lesson.date }}</small></div></li></ul>
  </Card>
</template>
