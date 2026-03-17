<script setup>
    import { RouterLink } from 'vue-router'

    defineProps({
        link:{
            type: String,
            default: '',
        }
    })

</script>
<template>
    <RouterLink :to="link" class="btn">
        <slot></slot>
    </RouterLink>
</template>