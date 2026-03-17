<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import LinkButton from '../buttons/LinkButton.vue'
import ProductCard from '../cards/ProductCard.vue'
import { Splide, SplideSlide } from '@splidejs/vue-splide'
import '@splidejs/vue-splide/css'

defineProps({
  styling: { type: Object, default: () => ({}) },
})

const prodStore = useProductStore()
const catStore = useCategoryStore()
const router = useRouter()

const featuredItem = ref(null)
const children = ref([])
const itemType = ref(null) // 'category' or 'product'

const init = () => {
  // Wait for data
  if (prodStore.products.length === 0 || catStore.categories.length === 0)
    return

  const candidates = []

  // 1. Find Categories with products
  const subcats = catStore.categories
  subcats.forEach((c) => {
    const kids = prodStore.products.filter((p) => p.parentId === c.id)
    if (kids.length > 0) {
      candidates.push({ item: c, kids, type: 'category' })
    }
  })

  // 2. Find Parent Products with children (models/variants)
  const parents = prodStore.products.filter((p) => p.type === 'product')
  parents.forEach((p) => {
    const kids = prodStore.products.filter((k) => k.parentId === p.id)
    if (kids.length > 0) {
      candidates.push({ item: p, kids, type: 'product' })
    }
  })

  if (candidates.length > 0) {
    // Pick random candidate
    const selected = candidates[Math.floor(Math.random() * candidates.length)]
    featuredItem.value = selected.item
    children.value = selected.kids
    itemType.value = selected.type
  }
}

watch(
  [() => prodStore.products.length, () => catStore.categories.length],
  () => {
    if (!featuredItem.value) init()
  },
)

onMounted(() => {
  catStore.fetchCategories()
  prodStore.fetchAllPublished()
  init()
})

const handleQuickView = (product) => {
  router.push(`/products/${product.slug}`)
}

const splideOptions = {
  type: 'slide',
  perPage: 4,
  perMove: 1,
  gap: '.6rem',
  pagination: false,
  arrows: true,
  breakpoints: {
    1024: { perPage: 3, gap: '.5rem' },
    767: {
      perPage: 2,
      gap: '.5rem',
    },
    640: {
      perPage: 2,
      gap: '.5rem',
      pagination: true,
    },
    480: {
      perPage: 1,
      gap: '.5rem',
      pagination: true,
    },
  },
}
</script>

<template>
  <section
    v-if="prodStore.isLoading || catStore.loading"
    :class="[styling.backgroundColor || '', styling.padding || 'py-10']"
  >
    <div class="container">
      <div
        class="flex flex-col gap-6 border border-slate-200 rounded-2xl bg-slate-100 p-4 md:p-6 animate-pulse"
      >
        <!-- Top Card Skeleton -->
        <div
          class="bg-slate-200 p-6 md:p-8 rounded-xl w-full flex flex-col md:flex-row gap-6 items-start md:items-center justify-between"
        >
          <div class="w-full max-w-3xl">
            <div class="flex flex-col gap-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-slate-300 rounded-full"></div>
                <div class="h-8 w-64 bg-slate-300 rounded"></div>
              </div>
              <div class="space-y-2">
                <div class="h-4 w-full max-w-xl bg-slate-300 rounded"></div>
                <div class="h-4 w-2/3 bg-slate-300 rounded"></div>
              </div>
            </div>
          </div>

          <div class="shrink-0">
            <div class="h-10 w-32 bg-slate-300 rounded"></div>
          </div>
        </div>

        <!-- Children List Skeleton -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="i in 4"
            :key="i"
            class="bg-white border border-slate-200 rounded-lg h-full p-4"
          >
            <div class="aspect-square bg-slate-200 rounded mb-4"></div>
            <div class="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section
    v-else-if="featuredItem"
    :class="[styling.backgroundColor || '', styling.padding || 'py-10']"
  >
    <div class="container">
      <div
        class="flex flex-col gap-6 border border-slate-200 rounded-2xl bg-slate-50 p-4 md:p-6"
      >
        <!-- Top Card -->
        <div
          class="bg-slate-900 p-6 md:p-8 rounded-xl w-full text-white flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative overflow-hidden group"
        >
          <!-- Decorative BG -->
          <div
            class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"
          ></div>

          <div class="relative z-10 max-w-3xl">
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-3">
                <svg
                  v-if="itemType === 'category'"
                  class="w-6 h-6 text-blue-400 group-hover:animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  ></path>
                </svg>
                <svg
                  v-else
                  class="w-6 h-6 text-amber-400 group-hover:animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  ></path>
                </svg>
                <h2 class="font-bold">{{ featuredItem.name }}</h2>
              </div>
              <p
                class="text-slate-300 text-sm leading-relaxed max-w-xl line-clamp-2"
              >
                {{
                  featuredItem.description ||
                  'Explore our selection of high-quality products designed for performance and durability.'
                }}
              </p>
            </div>
          </div>

          <div class="relative z-10 shrink-0">
            <LinkButton
              :link="
                itemType === 'category'
                  ? `/categories/${featuredItem.slug}`
                  : `/products/${featuredItem.slug}`
              "
              class="bg-transparent border-2 border-white/20 text-white hover:bg-white hover:text-slate-900 hover:border-white"
            >
              See More
            </LinkButton>
          </div>
        </div>

        <!-- Children List -->
        <div class="w-full relative product-splide">
          <Splide :options="splideOptions">
            <SplideSlide v-for="item in children" :key="item.id">
              <div class="group relative h-full p-1">
                <ProductCard
                  :product="item"
                  class="h-full bg-white shadow-sm hover:shadow-md transition-all"
                />
              </div>
            </SplideSlide>
          </Splide>
        </div>
      </div>
    </div>
  </section>
</template>
