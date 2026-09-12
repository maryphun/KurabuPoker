import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Reveal immediately on upward scroll; require sustained downward travel to hide. */
export function useScrollHeader() {
  const hidden = ref(false), elevated = ref(false)
  let previous = 0, downwardTravel = 0, frame = 0
  function reveal() { hidden.value = false; downwardTravel = 0 }
  function update() {
    frame = 0
    const y = Math.max(0, window.scrollY), delta = y - previous
    elevated.value = y > 8
    if (y < 90 || delta < 0) reveal()
    else if (delta > 0) {
      downwardTravel += delta
      if (downwardTravel > 48 && !document.querySelector('.topbar:focus-within')) hidden.value = true
    }
    previous = y
  }
  function onScroll() { if (!frame) frame = requestAnimationFrame(update) }
  onMounted(() => { previous = Math.max(0, window.scrollY); elevated.value = previous > 8; window.addEventListener('scroll', onScroll, { passive: true }) })
  onBeforeUnmount(() => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) })
  return { hidden, elevated, reveal }
}
