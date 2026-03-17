<script setup>
    import Featured from '@/components/banners/Featured.vue'

    defineProps({
        data: Object,
        styling: Object
    })
</script>

<template>
    <!-- Featured has its own internal section/padding logic -->
    <Featured :styling="styling" />
</template>