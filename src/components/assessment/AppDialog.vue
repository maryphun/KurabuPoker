<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
import { X } from 'lucide-vue-next'
defineProps<{ open: boolean; title: string; description?: string }>()
defineEmits<{ 'update:open': [value: boolean] }>()
</script>
<template>
  <DialogRoot :open="open" @update:open="$emit('update:open', $event)">
    <DialogPortal><DialogOverlay class="dialog-overlay" /><DialogContent class="dialog-content">
      <DialogClose class="dialog-close" aria-label="閉じる"><X :size="20" /></DialogClose>
      <slot name="icon" />
      <DialogTitle class="dialog-title">{{ title }}</DialogTitle>
      <DialogDescription v-if="description" class="dialog-description">{{ description }}</DialogDescription>
      <slot />
    </DialogContent></DialogPortal>
  </DialogRoot>
</template>
