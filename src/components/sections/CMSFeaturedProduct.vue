<script setup>
    import FeaturedProduct from '@/components/banners/FeaturedProduct.vue'

    defineProps({
        data: {
            type: Object,
            default: () => ({ rotationPeriod: 'daily' })
        },
        styling: {
            type: Object,
            default: () => ({})
        }
    })
</script>

<template>
    <FeaturedProduct :rotationPeriod="data.rotationPeriod" :styling="styling" />
</template>