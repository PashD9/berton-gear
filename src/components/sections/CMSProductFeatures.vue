<script setup>
    import ProductFeatures from '@/components/ProductFeatures.vue'

    defineProps({
        data: {
            type: Object,
            default: () => ({
                title: '',
                showTitle: true
            })
        },
        styling: {
            type: Object,
            default: () => ({})
        }
    })
</script>

<template>
    <section :class="[styling.backgroundColor || 'bg-white', styling.padding || 'py-10', styling.textColor || 'text-slate-900']">
        <div class="container mx-auto px-4">
            <h3 v-if="data.showTitle && data.title" class="text-2xl font-medium tracking-normal mb-12 text-center" :class="styling.textColor ? 'text-current' : 'text-slate-900'">{{ data.title }}</h3>
            <ProductFeatures />
        </div>
    </section>
</template>