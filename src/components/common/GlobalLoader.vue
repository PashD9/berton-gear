<script setup>
import { useUtilityStore } from '@/stores/utilityStore'
const utilityStore = useUtilityStore()
</script>

<template>
  <!-- Full-screen overlay to dim the page -->
  <div v-if="utilityStore.loading" class="fixed inset-0 bg-black/10 z-9998" />

  <!-- Progress Bar -->
  <div
    :class="[
      'fixed top-0 left-0 right-0 h-1 z-9999 transition-opacity duration-300',
      utilityStore.loading ? 'opacity-100' : 'opacity-0 pointer-events-none',
    ]"
  >
    <div class="relative h-full w-full bg-sky-600/20 overflow-hidden">
      <div class="absolute top-0 h-full bg-sky-600 animate-loader-progress" />
    </div>
  </div>
</template>
