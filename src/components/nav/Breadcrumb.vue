<script setup>
  import { useBreadcrumbStore } from '@/stores/breadcrumb'
  import BackButton from '../buttons/BackButton.vue'

  const breadcrumb = useBreadcrumbStore()

  defineProps({
    styles: { type: String, default: '' }
  })

</script>

<template>
  <section :class="`${styles} sticky z-10 w-full`">
    <div class="container flex items-center px-4">
      <BackButton class="shrink-0 mr-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path></svg>
      </BackButton>

      <div class="h-4 w-px bg-gray-300 shrink-0 mr-3"></div>

      <div v-if="!breadcrumb.breadcrumbs.length" class="flex items-center gap-2 overflow-hidden animate-pulse">
        <div class="h-4 w-16 bg-gray-200 rounded"></div>
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        <div class="h-4 w-24 bg-gray-200 rounded"></div>
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        <div class="h-4 w-32 bg-gray-200 rounded"></div>
      </div>

      <nav v-else class="flex-1 min-width-0 overflow-hidden relative fade-mask">
        <ul class="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          <li v-for="(crumb, i) in breadcrumb.breadcrumbs" :key="i" class="flex items-center gap-2">
            <RouterLink 
              v-if="crumb.to" 
              :to="crumb.to" 
              class="text-gray-500 hover:text-blue-600 transition-colors"
            >
              {{ crumb.label }}
            </RouterLink>
            <span v-else class="font-semibold text-gray-900">{{ crumb.label }}</span>
            
            <span 
              v-if="i < breadcrumb.breadcrumbs.length - 1" 
              class="text-gray-400 select-none flex items-center"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </li>
        </ul>
      </nav>

      <div class="shrink-0 ml-auto pl-2">
        <slot></slot>
      </div>
    </div>
  </section>
</template>

<style scoped>

.fade-mask {
  mask-image: linear-gradient(to right, black 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
}

</style>