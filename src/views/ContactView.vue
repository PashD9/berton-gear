<script setup>
    import { onMounted, computed } from 'vue'
    import { useSectionStore } from '@/stores/sectionStore'
    import SectionRenderer from '@/components/SectionRenderer.vue'

    const sectionStore = useSectionStore()

    onMounted(() => {
        sectionStore.fetchSections()
    })

    const sections = computed(() => sectionStore.organizedSections('Contact'))
</script>

<template>
    <div class="min-h-screen bg-slate-50">
        <SectionRenderer v-for="section in sections" :key="section.id" :section="section" />
    </div>
</template>