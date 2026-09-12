<script setup lang="ts">
import { ArrowRight, Clock3, Play } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
</script>

<template>
  <Card class="continue-panel">
    <div class="panel-heading"><h2>前回の続きから</h2><span class="text-action">学習一覧 <ArrowRight :size="15" /></span></div>
    <div class="current-course"><div class="course-monogram" aria-hidden="true"><span>♠</span><small>ポーカーの基礎</small><b>01 — プリフロップ</b></div><div class="course-detail"><span class="course-category">プリフロップの基礎</span><h3>3ベット戦略を組み立てる</h3><p>自信を持ってレイズするための考え方を学ぶ。</p><div class="lesson-meta"><span>レッスン5 / 8</span><i /><span><Clock3 :size="13" /> 22分</span><span class="level-badge">中級</span></div></div></div>
    <div class="course-bottom"><div class="course-progress"><div><span>コースの進捗</span><strong>50%</strong></div><div class="skill-track" role="progressbar" aria-label="プリフロップの基礎コースの進捗" :aria-valuenow="50" :aria-valuemin="0" :aria-valuemax="100"><span style="width: 50%; background: #a3e8c1" /></div></div><Button disabled class="resume-button"><Play :size="14" fill="currentColor" />学習を続ける<ArrowRight :size="16" /></Button></div>
  </Card>
</template>
