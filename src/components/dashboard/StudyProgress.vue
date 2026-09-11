<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
</script>

<template>
  <Card class="study-panel">
    <div class="panel-heading"><div><h2>Study activity</h2><p>Small steps. Measurable progress.</p></div><div class="period-selector" aria-label="Displayed period"><span>7 days</span><span class="selected">30 days</span><span>90 days</span></div></div>
    <div class="chart-summary"><strong>12.5 <span>hours</span></strong><span class="chart-change"><ArrowUpRight :size="14" /> 24% <span>vs. last month</span></span><span class="chart-legend"><i />Study time</span></div>
    <div class="activity-chart" role="img" aria-label="Sample study activity for August 14 to September 12, trending upward over the month, with 12.5 total study hours.">
      <div class="y-labels"><span>3h</span><span>2h</span><span>1h</span><span>0h</span></div>
      <svg viewBox="0 0 720 174" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="study-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a3e8c1" stop-opacity="0.2" /><stop offset="100%" stop-color="#a3e8c1" stop-opacity="0" /></linearGradient></defs>
        <g stroke="#ffffff" stroke-opacity="0.055" stroke-dasharray="3 5"><line x1="0" y1="8" x2="720" y2="8" /><line x1="0" y1="61" x2="720" y2="61" /><line x1="0" y1="114" x2="720" y2="114" /><line x1="0" y1="167" x2="720" y2="167" /></g>
        <path d="M0 141 C18 141 22 153 40 148 S61 112 82 118 S101 138 121 120 S146 129 164 105 S187 109 204 94 S227 113 247 93 S270 99 288 75 S309 79 329 90 S347 113 369 98 S391 76 410 80 S432 52 450 62 S476 80 494 60 S516 68 535 49 S560 65 579 40 S603 48 622 32 S643 41 661 20 S685 38 701 27 L720 15 L720 174 L0 174Z" fill="url(#study-fill)" />
        <path d="M0 141 C18 141 22 153 40 148 S61 112 82 118 S101 138 121 120 S146 129 164 105 S187 109 204 94 S227 113 247 93 S270 99 288 75 S309 79 329 90 S347 113 369 98 S391 76 410 80 S432 52 450 62 S476 80 494 60 S516 68 535 49 S560 65 579 40 S603 48 622 32 S643 41 661 20 S685 38 701 27 L720 15" fill="none" stroke="#a3e8c1" stroke-width="2.4" vector-effect="non-scaling-stroke" />
      </svg>
      <div class="x-labels"><span>Aug 14</span><span>Aug 19</span><span>Aug 24</span><span>Aug 29</span><span>Sep 03</span><span>Sep 08</span><span>Sep 12</span></div>
    </div>
    <div class="chart-footer"><span><i class="small-dot" /> Showing up is half the game.</span><span>18 study days this month</span></div>
  </Card>
</template>
