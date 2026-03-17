<script setup>
import { useHead } from '@unhead/vue'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import ProductCard from '@/components/cards/ProductCard.vue'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import { onMounted, onUnmounted, ref, computed, watch, watchEffect } from 'vue'

const breadcrumb = useBreadcrumbStore()
const prodStore = useProductStore()
const catStore = useCategoryStore()

const loadTrigger = ref(null)
let observer = null

useHead({
  title: 'Our Products',
  meta: [{ property: 'og:title', content: 'Our Products | PumpHaus' }],
})

onMounted(async () => {
  breadcrumb.set([{ label: 'Products' }])

  // Ensure categories are loaded so verifiedProducts can correctly filter by parent status
  if (catStore.categories.length === 0) await catStore.fetchCategories()

  // Setup Intersection Observer for Infinite Scroll
  observer = new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        prodStore.hasMore &&
        !prodStore.isLoading
      ) {
        prodStore.fetchPagedProducts()
      }
    },
    { rootMargin: '200px' },
  )

  if (loadTrigger.value) observer.observe(loadTrigger.value)

  // Fetch first chunk of data
  await prodStore.fetchPagedProducts({ reset: true })
})

const products = computed(() => prodStore.verifiedProducts)

watch(loadTrigger, (el) => {
  if (el && observer) observer.observe(el)
})

onUnmounted(() => {
  breadcrumb.clear()
  if (observer) observer.disconnect()
  // Stop any active listeners when the component is unmounted
  if (prodStore.stopAllListeners) prodStore.stopAllListeners() // Stop firebase listeners
  prodStore.$reset() // Reset store state to prevent stale data on other pages
})
</script>

<template>
  <section class="py-10">
    <div class="container">
      <header class="mb-10">
        <h3
          class="text-3xl font-black text-slate-900 tracking-tighter capitalize"
        >
          Our Products
        </h3>
        <p class="text-slate-500 text-sm mt-2">
          Industrial solutions for high-performance demands.
        </p>
      </header>

      <div
        v-if="prodStore.isLoading && !prodStore.isAppending"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="i in 8"
          :key="i"
          class="bg-white border border-slate-100 rounded-lg overflow-hidden animate-pulse"
        >
          <div class="aspect-square bg-slate-100"></div>
          <div class="p-4 space-y-3">
            <div class="h-4 bg-slate-100 rounded w-3/4"></div>
            <div class="h-3 bg-slate-50 rounded w-full"></div>
            <div class="h-3 bg-slate-50 rounded w-5/6"></div>
            <div class="pt-4 flex justify-between">
              <div class="h-6 bg-sky-50 rounded w-1/3"></div>
              <div class="h-8 w-8 bg-sky-100 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="products.length > 0" class="space-y-8">
        <TransitionGroup
          tag="div"
          name="product-list"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <div
            v-for="product in products"
            :key="product.id"
            class="group relative"
          >
            <ProductCard :product="product" class="h-full" />
          </div>
        </TransitionGroup>

        <!-- Infinite Scroll Trigger -->
        <div
          v-if="prodStore.hasMore"
          ref="loadTrigger"
          class="h-10 flex justify-center items-center w-full"
        >
          <div
            v-if="prodStore.isLoading"
            class="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col items-center justify-center py-24 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-2xl"
      >
        <div
          class="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mb-4"
        >
          <svg
            class="w-10 h-10 text-sky-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-slate-600">No Published Products</h3>
        <p class="text-slate-400 text-sm max-w-xs text-center mt-1">
          We're currently updating our catalog. Please check back shortly for
          new industrial inventory.
        </p>
      </div>
    </div>
  </section>
</template>

<style>
/* Product List Transition */
.product-list-move, /* apply transition to moving elements */
.product-list-enter-active,
.product-list-leave-active {
  transition: all 0.5s ease;
}
.product-list-enter-from,
.product-list-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
.product-list-leave-active {
  position: absolute;
}
</style>
