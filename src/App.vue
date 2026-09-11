<script setup lang="ts">
import { Bell, ChevronRight, Flame, CalendarDays, ArrowUpRight } from 'lucide-vue-next'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import StudyProgress from '@/components/dashboard/StudyProgress.vue'
import SkillBreakdown from '@/components/dashboard/SkillBreakdown.vue'
import ContinueLearning from '@/components/dashboard/ContinueLearning.vue'
import RecentLessons from '@/components/dashboard/RecentLessons.vue'
import { stats } from '@/data/dashboard'
</script>

<template>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="app-shell"><AppSidebar /><div class="main-shell">
    <header class="topbar"><div class="breadcrumb"><span>Workspace</span><ChevronRight :size="13" /><strong>Overview</strong></div><div class="topbar-right"><span class="preview-label">Preview · Sample data</span><span class="header-streak"><Flame :size="15" />7-day streak</span><span class="header-divider" /><button class="notification-button" disabled aria-label="Notifications unavailable in preview"><Bell :size="18" :stroke-width="1.5" /></button><div class="avatar small">JL</div></div></header>
    <main id="main-content" tabindex="-1">
      <div class="page-heading"><div><div class="eyebrow page-eyebrow">YOUR NEXT EDGE STARTS HERE</div><h1>Let’s build a better game.</h1><p>Welcome back, Jamie. A little more knowledge, a little more confidence.</p></div><div class="date-label"><CalendarDays :size="15" />September 12, 2026</div></div>
      <section aria-label="Learning statistics" class="stats-grid"><StatCard v-for="stat in stats" :key="stat.label" :stat="stat" /></section>
      <div class="dashboard-grid"><StudyProgress /><SkillBreakdown /><ContinueLearning /><RecentLessons /></div>
      <div class="daily-note"><span class="daily-note-icon">♣</span><span><strong>A thought for the table</strong>Focus on the quality of your decisions. The results will follow.</span><span class="note-label">THE KURABU MINDSET <ArrowUpRight :size="14" /></span></div>
      <footer class="page-footer"><span>Study with purpose. Play with perspective.</span><span>KurabuPoker <span class="footer-dot">·</span> Your edge is earned.</span></footer>
    </main>
  </div></div>
</template>
