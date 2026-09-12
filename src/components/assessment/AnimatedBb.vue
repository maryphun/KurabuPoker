<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { formatBb } from '@/lib/assessment'
const props = defineProps<{ value: number }>()
const displayed = ref(props.value)
let frame = 0
watch(() => props.value, value => {
  cancelAnimationFrame(frame)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { displayed.value = value; return }
  const from = displayed.value, start = performance.now()
  function tick(now: number) {
    const progress = Math.min(1, (now - start) / 320)
    displayed.value = from + (value - from) * (1 - (1 - progress) ** 3)
    if (progress < 1) frame = requestAnimationFrame(tick)
    else displayed.value = value
  }
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>
<template><span :aria-label="formatBb(value)"><span aria-hidden="true">{{ formatBb(displayed) }}</span></span></template>
