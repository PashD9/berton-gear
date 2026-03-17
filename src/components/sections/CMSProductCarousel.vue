<script setup>
    import ProductCarousel from '@/components/carousels/ProductCarousel.vue'

    defineProps({
        data: {
            type: Object,
            default: () => ({
                title: '',
                subtitle: '',
                showTitle: true,
                collectionId: '',
                limit: 4
            })
        },
        styling: {
            type: Object,
            default: () => ({})
        }
    })
</script>

<template>
    <ProductCarousel 
        :title="data.title"
        :subtitle="data.subtitle"
        :showTitle="data.showTitle"
        :categoryId="data.collectionId"
        :limit="Number(data.limit)"
        :styling="styling"
    />
</template>