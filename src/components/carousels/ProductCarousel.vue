<script setup>
import { computed, onMounted } from 'vue'
import { Splide, SplideSlide } from '@splidejs/vue-splide'
import '@splidejs/splide/css/core'
import { useProductStore } from '@/stores/productStore'
import ProductCard from '@/components/cards/ProductCard.vue'

const props = defineProps({
  title: { type: String, default: 'Trending Now' },
  subtitle: { type: String, default: 'Our top picks for this week.' },
  categoryId: { type: String, default: '' },
  limit: { type: Number, default: 12 },
  showTitle: { type: Boolean, default: true },
  styling: { type: Object, default: () => ({}) },
})

const prodStore = useProductStore()

onMounted(() => {
  if (prodStore.products.length === 0) prodStore.fetchAllPublished()
})

const products = computed(() => prodStore.verifiedProducts)

const items = computed(() => {
  let list = products.value
  if (props.categoryId) {
    list = list.filter((p) => p.parentId === props.categoryId)
  }
  return list.slice(0, props.limit)
})

const options = {
  type: 'slide',
  rewind: false,
  perPage: 4,
  perMove: 1,
  gap: '1rem',
  pagination: false,
  arrows: true,
  drag: true,
  speed: 800,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  breakpoints: {
    1280: { perPage: 4, gap: '1rem' },
    1024: { perPage: 3, gap: '1rem' },
    767: {
      perPage: 2,
      gap: '.7rem',
    },
    640: {
      perPage: 2,
      gap: '.7rem',
      pagination: true,
    },
    480: {
      perPage: 1,
      gap: '.7rem',
      pagination: true,
    },
  },
}
</script>

<template>
  <section
    :class="[
      styling.backgroundColor || 'bg-white',
      styling.padding || 'py-10',
      styling.textColor || 'text-slate-900',
      'overflow-hidden',
    ]"
  >
    <div class="container relative">
      <div class="flex justify-between items-end mb-10 px-1">
        <div v-if="showTitle">
          <h3
            class="text-2xl font-medium tracking-normal mb-2"
            :class="styling.textColor ? 'text-current' : 'text-slate-900'"
          >
            {{ title }}
          </h3>
          <p
            v-if="subtitle"
            class="text-sm"
            :class="
              styling.textColor ? 'text-current opacity-70' : 'text-slate-500'
            "
          >
            {{ subtitle }}
          </p>
        </div>
        <router-link
          to="/products"
          class="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-blue-600 transition-colors group"
          :class="styling.textColor ? 'text-current' : 'text-slate-900'"
        >
          Shop All
          <svg
            class="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            ></path>
          </svg>
        </router-link>
      </div>

      <div
        v-if="prodStore.isLoading"
        class="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <div v-for="i in 4" :key="i" class="animate-pulse">
          <div class="bg-slate-100 aspect-3/4ounded-lg mb-4"></div>
          <div class="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
          <div class="h-4 bg-slate-100 rounded w-1/4"></div>
        </div>
      </div>

      <div v-else class="relative">
        <Splide :options="options" class="product-splide" :key="items.length">
          <SplideSlide v-for="product in items" :key="product.id">
            <div class="group relative h-full">
              <ProductCard :product="product" class="h-full" />
            </div>
          </SplideSlide>
        </Splide>
      </div>

      <div class="mt-8 text-center md:hidden">
        <router-link
          to="/products"
          class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest border-b pb-1"
          :class="
            styling.textColor
              ? 'text-current border-current'
              : 'text-slate-900 border-slate-900'
          "
        >
          Shop All Products
        </router-link>
      </div>
    </div>
  </section>
</template>
