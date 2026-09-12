<script setup lang="ts">
import { ChevronDown, ListChecks } from 'lucide-vue-next'
import { navigation, accountNavigation } from '@/data/dashboard'
defineProps<{ current: string; showManager: boolean }>()
defineEmits<{ navigate: [target: 'dashboard' | 'assessment' | 'manager'] }>()
</script>

<template>
  <aside class="sidebar" aria-label="メインナビゲーション">
    <a href="#main-content" class="brand" aria-label="クラブポーカー ダッシュボード">
      <img src="/kurabu-poker-logo.svg" alt="" width="43" height="43" />
      <span>Kurabu<span class="brand-light">Poker</span><small>ポーカー学習クラブ</small></span>
    </a>
    <nav class="main-navigation">
      <div v-for="group in navigation" :key="group.label" class="nav-group">
        <p class="eyebrow">{{ group.label }}</p>
        <button v-for="item in group.items" :key="item.label" type="button" :class="['nav-item', { active: item.target === current || (item.target === 'assessment' && ['quiz', 'results'].includes(current)) }]" :aria-label="item.label" :aria-current="item.target === current ? 'page' : undefined" :disabled="!item.target" @click="item.target && $emit('navigate', item.target)">
          <component :is="item.icon" :size="18" :stroke-width="1.65" /><span>{{ item.label }}</span><span v-if="item.target === current" class="nav-active-dot" />
        </button>
      </div>
    </nav>
    <div class="sidebar-bottom">
      <button v-if="showManager" :class="['nav-item', { active: current === 'manager' }]" aria-label="問題管理" @click="$emit('navigate', 'manager')"><ListChecks :size="18" /><span>問題管理</span></button>
      <button v-for="item in accountNavigation" :key="item.label" class="nav-item" disabled><component :is="item.icon" :size="18" :stroke-width="1.65" />{{ item.label }}</button>
      <div class="profile"><div class="avatar">G</div><div><strong>ゲスト</strong><span>学びは、ここから。</span></div><ChevronDown :size="15" /></div>
    </div>
  </aside>
</template>
