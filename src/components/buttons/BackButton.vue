<script setup>
    import { useRouter } from 'vue-router'

    const router =  useRouter()
</script>

<template>
    <button @click="router.back" class="duration-300">  
        <slot></slot>
      </button>
</template>