<script setup>
    import FeaturedProducts from '@/components/banners/FeaturedProducts.vue'

    defineProps({
        data: Object,
        styling: Object
    })
</script>

<template>
    <!-- FeaturedProducts has its own internal section/padding logic -->
    <FeaturedProducts :styling="styling" />
</template>