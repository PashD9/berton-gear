<script setup>
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '@/components/nav/Navbar.vue'
import GlobalLoader from '@/components/common/GlobalLoader.vue'
import { useSectionStore } from '@/stores/sectionStore'
import SectionRenderer from '@/components/SectionRenderer.vue'
import CartDrawer from '@/components/cart/CartDrawer.vue'
import { useFontLoader } from '@/composables/useFontLoader'

const sectionStore = useSectionStore()
const route = useRoute()

const footerRef = ref(null)
const isFooterVisible = ref(false)
const isButtonReady = ref(false)
const isPulsing = ref(false)
const isDismissed = ref(false)
const { areIconsLoaded } = useFontLoader()
let footerObserver = null
let pulseTimer = null

onMounted(() => {
  sectionStore.fetchSections()

  // Delay to allow slide-in animation after load
  setTimeout(() => {
    isButtonReady.value = true
  }, 500)

  // Start pulsing after 8 seconds of inactivity on the button
  pulseTimer = setTimeout(() => {
    isPulsing.value = true
  }, 8000)

  footerObserver = new IntersectionObserver(
    ([entry]) => {
      isFooterVisible.value = entry.isIntersecting
    },
    { threshold: 0.1 },
  )

  if (footerRef.value) footerObserver.observe(footerRef.value)
})

onUnmounted(() => {
  if (footerObserver) footerObserver.disconnect()
  if (pulseTimer) clearTimeout(pulseTimer)
})

const footerSection = computed(() =>
  sectionStore.globalSections.find(
    (s) => s.component === 'FooterBlock' || s.component === 'FooterSection',
  ),
)

const showFloatingContact = computed(() => {
  return (
    isButtonReady.value &&
    route.path !== '/contact' &&
    !isFooterVisible.value &&
    !isDismissed.value
  )
})
</script>

<template>
  <div
    class="flex flex-col min-h-screen bg-gray-50"
    :class="{ 'icons-loading': !areIconsLoaded }"
  >
    <GlobalLoader />
    <Navbar />
    <main class="grow">
      <RouterView />
    </main>
    <div ref="footerRef">
      <SectionRenderer v-if="footerSection" :section="footerSection" />
    </div>
    <CartDrawer />
    <div
      class="fixed bottom-6 right-6 z-40 flex flex-col items-end group transition-all duration-500 ease-in-out"
      :class="
        showFloatingContact
          ? 'translate-y-0 opacity-100'
          : 'translate-y-24 opacity-0 pointer-events-none'
      "
    >
      <button
        @click="isDismissed = true"
        class="absolute -top-3 -right-2 bg-white text-slate-500 hover:text-red-500 shadow-md rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
        title="Dismiss"
        type="button"
      >
        <span class="material-symbols-outlined text-xs font-bold block"
          >close</span
        >
      </button>
      <RouterLink
        to="/contact"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg transition-colors duration-300 hover:bg-blue-700 hover:shadow-xl relative z-10"
        :class="isPulsing ? 'animate-ripple' : ''"
      >
        <span class="material-symbols-outlined text-lg">mail</span>
        <span class="font-semibold text-sm">Contact Us</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
@keyframes ripple {
  0%,
  10% {
    transform: scale(1);
    opacity: 0.5;
  }
  60% {
    transform: scale(1.6);
    opacity: 0;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.animate-ripple::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background-color: inherit;
  z-index: -1;
  animation: ripple 3s infinite cubic-bezier(0.4, 0, 0.6, 1);
}

.animate-ripple:hover::after {
  animation: none;
}
</style>
