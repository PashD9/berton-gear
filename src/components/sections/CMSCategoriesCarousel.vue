<script setup>
    import CategoryCarousel from '@/components/carousels/CategoryCarousel.vue'

    defineProps({
        data: {
            type: Object,
            default: () => ({})
        },
        styling: {
            type: Object,
            default: () => ({})
        }
    })
</script>

<template>
    <section :class="[styling.backgroundColor || 'bg-[#EBF2F4]', styling.padding || 'py-10', styling.textColor || 'text-slate-900']">
        <div class="container mx-auto px-4">
            <h3 v-if="data.showTitle && data.title" class="text-2xl font-medium tracking-normal mb-8" :class="styling.textColor ? 'text-current' : 'text-slate-900'">{{ data.title }}</h3>
            <CategoryCarousel v-bind="data" />
        </div>
    </section>
</template>