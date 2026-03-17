<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import { useSectionStore } from '@/stores/sectionStore'
import SectionRenderer from '@/components/SectionRenderer.vue'

const sectionStore = useSectionStore()

onMounted(() => {
  sectionStore.subscribe()
})

onUnmounted(() => {
  sectionStore.stopListener()
})

const sections = computed(() => sectionStore.organizedSections('Home'))
</script>

<template>
  <div class="min-h-screen bg-white">
    <SectionRenderer
      v-for="section in sections"
      :key="section.id"
      :section="section"
    />
  </div>
</template>
