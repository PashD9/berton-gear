<script setup>
import { useRouter } from 'vue-router'
import notFoundSvg from '@/assets/svg/404_storyset_recolored_v2.svg'

const router = useRouter()
</script>

<template>
  <section
    class="relative text-center flex flex-col items-center justify-center h-screen bg-slate-50 p-4"
  >
    <img
      :src="notFoundSvg"
      alt="404 Not Found"
      class="w-full max-w-md mb-8 z-10"
    />
    <h1 class="font-bold z-10 mb-2 text-slate-900">404 Not Found</h1>
    <p class="text-xl mb-8 z-10 text-slate-600">This page does not exist</p>
    <button @click="router.back" class="btn btn-dark z-10">
      <span class="material-symbols-outlined text-lg">arrow_back</span> Go Back
    </button>
    <div class="absolute bottom-4 w-full text-center text-sm text-slate-400">
      <a href="https://storyset.com/online" target="_" class="hover:underline"
        >Online illustrations by Storyset</a
      >
    </div>
  </section>
</template>
