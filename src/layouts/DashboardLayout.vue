<script setup>
import GlobalLoader from '@/components/common/GlobalLoader.vue'
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-100">
    <GlobalLoader />
    <main class="grow">
      <RouterView />
    </main>
  </div>
</template>
