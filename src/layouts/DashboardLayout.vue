<script setup>
import GlobalLoader from '@/components/common/GlobalLoader.vue'
import { useFontLoader } from '@/composables/useFontLoader'

const { areIconsLoaded } = useFontLoader()
</script>

<template>
  <div
    class="flex flex-col min-h-screen bg-gray-100"
    :class="{ 'icons-loading': !areIconsLoaded }"
  >
    <GlobalLoader />
    <main class="grow">
      <RouterView />
    </main>
  </div>
</template>
