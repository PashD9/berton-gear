<script setup>
import { onMounted, reactive, computed } from 'vue'
import { Splide, SplideSlide } from '@splidejs/vue-splide'
import '@splidejs/splide/css/core'
import CategoryCard from '@/components/cards/CategoryCard.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProductStore } from '@/stores/productStore'

const props = defineProps({
  limit: { type: Number, default: 0 },
})

const catStore = useCategoryStore()
const prodStore = useProductStore()

onMounted(async () => {
  if (catStore.categories.length === 0) await catStore.fetchCategories()
  await prodStore.fetchAllPublished()
})

const verifiedCategories = computed(() => catStore.verifiedCategories)

// Simple logic: Just parent categories, optionally limited.
const displayItems = computed(() => {
  const items = verifiedCategories.value.filter((item) => !item.parentId) || []
  return props.limit > 0 ? items.slice(0, props.limit) : items
})

const options = reactive({
  type: 'loop',
  gap: '1rem',
  perPage: 4,
  perMove: 1,
  arrows: true, // correct Splide option name
  pagination: false,
  breakpoints: {
    1280: {
      perPage: 4,
      gap: '.7rem',
    },
    1024: {
      perPage: 3,
      gap: '.7rem',
    },
    767: {
      // Arrows are visible, pagination is not.
      perPage: 2,
      gap: '.7rem',
    },
    640: {
      // Arrows disappear, pagination appears.
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
})
</script>

<template>
  <div
    v-if="catStore.loading"
    class="container flex flex-col gap-4 animate-pulse"
  >
    <div class="h-8 w-48 bg-gray-200 rounded"></div>
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="aspect-4/3 bg-gray-200 rounded-xl"
      ></div>
    </div>
  </div>

  <div v-else-if="displayItems.length" class="w-full pb-8 md:pb-0">
    <Splide :options="options" class="product-splide">
      <SplideSlide v-for="category in displayItems" :key="category.id">
        <RouterLink :to="`/categories/${category.slug}`">
          <CategoryCard :category="category" :isAdmin="false" />
        </RouterLink>
      </SplideSlide>
    </Splide>
  </div>
</template>
