<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="flex items-center gap-2 text-2xl z-100">
    <RouterLink to="/">
      <div class="font-bold block md:hidden">
        <img
          src="@/assets/logos/0619c8aa-f6f1-4933-a52b-2a702c4281f5.png"
          alt="Logo"
          class="h-7 w-auto object-contain inline-block mr-2"
        />
      </div>
      <div class="font-bold hidden md:block">
        <img
          src="@/assets/logos/bcd17042-49ea-43bb-81c3-b4b67549bcf6.png"
          alt="Logo"
          class="h-7 w-auto object-contain inline-block mr-2"
        />
      </div>
    </RouterLink>
  </div>
</template>
