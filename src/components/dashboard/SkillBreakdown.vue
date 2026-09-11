<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { skills } from '@/data/dashboard'
</script>

<template>
  <Card class="skill-panel">
    <div class="panel-heading"><div><h2>Your skill profile</h2><p>A more balanced game starts here.</p></div><Info :size="16" class="muted" /></div>
    <div class="skill-overview"><div class="skill-ring" role="img" aria-label="Overall skill progress: 66 percent"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="#2b3330" stroke-width="7" /><circle cx="50" cy="50" r="42" fill="none" stroke="#a3e8c1" stroke-width="7" stroke-dasharray="174.17 263.89" stroke-linecap="round" transform="rotate(-90 50 50)" /></svg><strong>66<span>%</span></strong></div><div><span class="skill-level">BUILDING MOMENTUM</span><h3>A solid foundation</h3><p>Keep working on bet sizing<br />to round out your skills.</p></div></div>
    <div class="skill-list"><div v-for="skill in skills" :key="skill.label" class="skill-item"><div><span>{{ skill.label }}</span><strong>{{ skill.value }}<span>%</span></strong></div><div class="skill-track" role="meter" :aria-label="skill.label" :aria-valuenow="skill.value" :aria-valuemin="0" :aria-valuemax="100"><span :style="{ width: `${skill.value}%`, background: skill.color }" /></div></div></div>
  </Card>
</template>
