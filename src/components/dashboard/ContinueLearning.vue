<script setup lang="ts">
import { ArrowRight, Clock3, Play } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
</script>

<template>
  <Card class="continue-panel">
    <div class="panel-heading"><h2>Pick up where you left off</h2><span class="text-action">My learning <ArrowRight :size="15" /></span></div>
    <div class="current-course"><div class="course-monogram" aria-hidden="true"><span>♠</span><small>THE FUNDAMENTALS</small><b>01 — PREFLOP</b></div><div class="course-detail"><span class="course-category">PREFLOP FUNDAMENTALS</span><h3>Building your 3-bet strategy</h3><p>Learn when to raise the stakes with confidence.</p><div class="lesson-meta"><span>Lesson 5 of 8</span><i /><span><Clock3 :size="13" /> 22 min</span><span class="level-badge">Intermediate</span></div></div></div>
    <div class="course-bottom"><div class="course-progress"><div><span>Course progress</span><strong>50%</strong></div><div class="skill-track" role="progressbar" aria-label="Preflop fundamentals course progress" :aria-valuenow="50" :aria-valuemin="0" :aria-valuemax="100"><span style="width: 50%; background: #a3e8c1" /></div></div><Button disabled class="resume-button"><Play :size="14" fill="currentColor" />Continue lesson<ArrowRight :size="16" /></Button></div>
  </Card>
</template>
