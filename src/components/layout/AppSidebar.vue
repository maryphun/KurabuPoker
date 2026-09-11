<script setup lang="ts">
import { ChevronDown, PanelLeftClose } from 'lucide-vue-next'
import { navigation, accountNavigation } from '@/data/dashboard'
</script>

<template>
  <aside class="sidebar" aria-label="Main navigation">
    <a href="#main-content" class="brand" aria-label="KurabuPoker dashboard">
      <img src="/kurabu-poker-logo.svg" alt="" width="43" height="43" />
      <span>Kurabu<span class="brand-light">Poker</span><small>THE STUDY CLUB</small></span>
    </a>
    <div class="workspace-label"><span>Your workspace</span><PanelLeftClose :size="16" aria-hidden="true" /></div>
    <nav class="main-navigation">
      <div v-for="group in navigation" :key="group.label" class="nav-group">
        <p class="eyebrow">{{ group.label }}</p>
        <button v-for="item in group.items" :key="item.label" type="button" :class="['nav-item', { active: item.active }]" :aria-label="item.label" :aria-current="item.active ? 'page' : undefined" :disabled="!item.active">
          <component :is="item.icon" :size="18" :stroke-width="1.65" /><span>{{ item.label }}</span><span v-if="item.active" class="nav-active-dot" />
        </button>
      </div>
    </nav>
    <div class="sidebar-bottom">
      <div class="club-note"><img src="/kurabu-poker-logo.svg" width="29" height="29" alt="" /><p>A little study.<br /><strong>A stronger game.</strong></p><span class="club-note-line" /></div>
      <button v-for="item in accountNavigation" :key="item.label" class="nav-item" disabled><component :is="item.icon" :size="18" :stroke-width="1.65" />{{ item.label }}</button>
      <div class="profile"><div class="avatar">JL</div><div><strong>Jamie Lee</strong><span>Learning member</span></div><ChevronDown :size="15" /></div>
    </div>
  </aside>
</template>
