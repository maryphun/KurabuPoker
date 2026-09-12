<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { skills } from '@/data/dashboard'
</script>

<template>
  <Card class="skill-panel">
    <div class="panel-heading"><div><h2>スキルプロフィール</h2><p>得意を伸ばし、苦手を少しずつ。</p></div><Info :size="16" class="muted" /></div>
    <div class="skill-overview"><div class="skill-ring" role="img" aria-label="総合スキル進捗：66%（サンプル）"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="#2b3330" stroke-width="7" /><circle cx="50" cy="50" r="42" fill="none" stroke="#a3e8c1" stroke-width="7" stroke-dasharray="174.17 263.89" stroke-linecap="round" transform="rotate(-90 50 50)" /></svg><strong>66<span>%</span></strong></div><div><span class="skill-level">着実にステップアップ</span><h3>基礎が身についています</h3><p>ベットサイズを学んで<br />判断の幅を広げましょう。</p></div></div>
    <div class="skill-list"><div v-for="skill in skills" :key="skill.label" class="skill-item"><div><span>{{ skill.label }}</span><strong>{{ skill.value }}<span>%</span></strong></div><div class="skill-track" role="meter" :aria-label="skill.label" :aria-valuenow="skill.value" :aria-valuemin="0" :aria-valuemax="100"><span :style="{ width: `${skill.value}%`, background: skill.color }" /></div></div></div>
  </Card>
</template>
