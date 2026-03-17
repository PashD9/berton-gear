<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import SideNav from '@/components/nav/SideNav.vue'
import Breadcrumb from '@/components/nav/Breadcrumb.vue'
import AddItem from './dashboard/components/AddItem.vue'
import ToastNotification from '@/components/common/ToastNotification.vue'
import { RouterView } from 'vue-router'

const authStore = useAuthStore()

// Use environment variables with defaults
const INACTIVITY_TIMEOUT = parseInt(
  import.meta.env.PHA_ADMIN_INACTIVITY_TIMEOUT_MS || '1800000',
) // 30 minutes
const WARNING_TIMEOUT = parseInt(
  import.meta.env.PHA_ADMIN_WARNING_TIMEOUT_MS || '1200000',
) // 20 minutes

let inactivityTimer = null
let warningTimer = null
let countdownInterval = null

const showWarningModal = ref(false)
const countdown = ref(0)

const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (countdown.value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
})

const logoutAdmin = () => {
  if (authStore.isAdmin) {
    authStore.logout()
  }
}
const startCountdown = () => {
  showWarningModal.value = true
  countdown.value = (INACTIVITY_TIMEOUT - WARNING_TIMEOUT) / 1000 // in seconds

  countdownInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownInterval)
      // The main inactivityTimer will handle the final logout.
    }
  }, 1000)
}

const resetInactivity = () => {
  // Clear all timers
  clearTimeout(inactivityTimer)
  clearTimeout(warningTimer)
  clearInterval(countdownInterval)

  // Hide modal
  showWarningModal.value = false

  // Reset timers only if the user is an admin
  if (authStore.isAdmin) {
    warningTimer = setTimeout(startCountdown, WARNING_TIMEOUT)
    inactivityTimer = setTimeout(logoutAdmin, INACTIVITY_TIMEOUT)
  }
}

const activityEvents = [
  'mousemove',
  'keydown',
  'mousedown',
  'touchstart',
  'scroll',
]

onMounted(async () => {
  await authStore.init() // Wait for auth state to be ready
  if (authStore.isAdmin) {
    activityEvents.forEach((event) =>
      window.addEventListener(event, resetInactivity),
    )
    resetInactivity() // Start the timers initially
  }
})

onUnmounted(() => {
  clearTimeout(inactivityTimer)
  clearTimeout(warningTimer)
  clearInterval(countdownInterval)
  activityEvents.forEach((event) =>
    window.removeEventListener(event, resetInactivity),
  )
})
</script>

<template>
  <section class="flex">
    <SideNav />
    <main class="flex-1 min-w-0">
      <Breadcrumb
        styles="top-0 border-b border-b-gray-100 py-2 bg-slate-50/90 backdrop-blur-md z-30"
      >
        <div></div>
      </Breadcrumb>
      <ToastNotification />
      <RouterView />
    </main>
  </section>
  <AddItem />
  <!-- Inactivity Warning Modal -->
  <div
    v-if="showWarningModal"
    class="fixed inset-0 bg-black/50 z-999 flex items-center justify-center p-4"
  >
    <div
      class="bg-white rounded-lg shadow-xl p-6 md:p-8 text-center max-w-sm w-full"
    >
      <h2 class="text-xl font-bold text-slate-800">Inactivity Warning</h2>
      <p class="text-slate-600 my-4">
        For security reasons, you will be logged out in:
      </p>
      <div class="text-5xl font-mono font-bold text-red-500 my-4">
        {{ formattedCountdown }}
      </div>
      <p class="text-sm text-slate-500">
        Move your mouse or press any key to stay logged in.
      </p>
    </div>
  </div>
</template>
