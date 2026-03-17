<script setup>
import maintenanceSvg from '@/assets/svg/Maintenance_craute_recolored_v2.svg'

defineOptions({
  inheritAttrs: false,
})

defineProps({
  title: { type: String, default: '' },
  showTitle: { type: Boolean, default: true },
  subtext: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  styling: {
    type: Object,
    default: () => ({}),
  },
})
</script>

<template>
  <section
    id="services"
    :class="[
      styling.backgroundColor || 'bg-slate-100',
      styling.padding || 'py-16',
    ]"
    class="relative overflow-hidden"
  >
    <!-- Subtle Background Illustration -->
    <div
      class="absolute inset-0 z-0 opacity-10 pointer-events-none"
      :style="{
        backgroundImage: `url(${maintenanceSvg})`,
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
      }"
    ></div>
    <div class="container mx-auto px-4 relative z-10">
      <!-- Header -->
      <div
        v-if="title"
        class="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700"
      >
        <h2 v-if="showTitle && title" class="text-2xl font-bold text-slate-800">
          {{ title }}
        </h2>
        <p v-if="subtext" class="text-slate-500 mt-2 max-w-2xl mx-auto">
          {{ subtext }}
        </p>
      </div>

      <!-- Grid -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="relative group flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 bg-white/40 backdrop-blur-md border border-white/50 p-8 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-blue-400/50"
          :style="{ animationDelay: `${index * 100}ms` }"
        >
          <!-- Icon -->
          <div
            class="bg-blue-100 rounded-2xl p-5 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300"
          >
            <span
              v-if="item.icon"
              style="font-size: 1.875rem"
              class="material-symbols-outlined"
              >{{ item.icon }}</span
            >
            <svg
              v-else
              class="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              ></path>
            </svg>
          </div>

          <h4 class="text-base font-bold uppercase text-slate-900">
            {{ item.title }}
          </h4>
          <p class="text-sm md:text-[15px] text-slate-500 mt-3">
            {{ item.description }}
          </p>
        </div>
      </div>

      <!-- Attribution Link -->
      <div class="mt-12 text-center">
        <a
          href="https://storyset.com/work"
          target="_blank"
          class="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >Work illustrations by Storyset</a
        >
      </div>
    </div>
  </section>
</template>
