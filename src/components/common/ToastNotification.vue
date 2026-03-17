<script setup>
import { useUtilityStore } from '@/stores/utilityStore'
const utils = useUtilityStore()
</script>

<template>
  <div 
    v-if="utils.toast.show"
    class="fixed bottom-5 right-5 z-50 px-6 py-3 rounded shadow-lg text-white text-sm font-bold uppercase tracking-wide transition-all duration-300 transform translate-y-0 opacity-100"
    :class="utils.toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'"
  >
    {{ utils.toast.message }}
  </div>
</template>