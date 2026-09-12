<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ open?: boolean }>()
const expanded = ref(props.open ?? false), closing = ref(false)
watch(() => props.open, value => {
  if (value === undefined || value === expanded.value) return
  closing.value = expanded.value
  expanded.value = value
})
function toggle() {
  closing.value = expanded.value
  expanded.value = !expanded.value
}
</script>
<template>
  <details :open="expanded || closing">
    <summary :aria-expanded="expanded" @click.prevent="toggle"><slot name="summary" /></summary>
    <Transition name="expand" @after-leave="closing = false"><div v-if="expanded" class="disclosure-reveal"><div class="disclosure-clip"><slot /></div></div></Transition>
  </details>
</template>
