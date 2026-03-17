<script setup>
import { useHead } from '@unhead/vue'
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import maintenanceSvg from '@/assets/svg/Maintenance_craute_recolored_v2.svg'
import ProductCard from '@/components/cards/ProductCard.vue'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProductStore } from '@/stores/productStore'
import { useUtilityStore } from '@/stores/utilityStore'
import { useRoute } from 'vue-router'

const breadcrumb = useBreadcrumbStore()
const catStore = useCategoryStore()
const prodStore = useProductStore()
const utils = useUtilityStore()
const route = useRoute()

const syncStore = () => {
  if (category.value) {
    const crumbs = [{ label: 'Products', to: '/products' }]
    if (category.value.parentId) {
      const parent = catStore.categories.find(
        (c) => c.id === category.value.parentId,
      )
      if (parent)
        crumbs.push({ label: parent.name, to: `/categories/${parent.slug}` })
    }
    crumbs.push({ label: category.value.name })
    breadcrumb.set(crumbs)
  }
}

onMounted(async () => {
  syncStore()
  // Start the real-time streams (store handles its own loader internally)
  prodStore.fetchAllPublished()

  if (catStore.categories.length === 0) {
    await utils.withLoading(catStore.fetchCategories())
  }
})

onUnmounted(() => {
  breadcrumb.clear()
  // We stop listeners to save bandwidth when user leaves the category area
  prodStore.stopAllListeners()
  prodStore.$reset() // Reset store state to prevent stale data on other pages
})

const category = computed(() => {
  return route.params.slug
    ? catStore.getCategoryBySlug(route.params.slug)
    : null
})

// Check if the current category is actually valid to show (Published + Has Content + Parent Published)
const isCategoryVisible = computed(() => {
  return (
    category.value &&
    catStore.verifiedCategories.some((c) => c.id === category.value.id)
  )
})

const parentCategory = computed(() => {
  if (category.value?.parentId) {
    return catStore.getCategoryById(category.value.parentId)
  }
  return null
})

useHead({
  title: computed(() => category.value?.name),
  meta: [
    {
      name: 'description',
      content: computed(() => category.value?.description),
    },
    {
      property: 'og:title',
      content: computed(() =>
        category.value?.name ? `${category.value.name} | PumpHaus` : 'PumpHaus',
      ),
    },
    {
      property: 'og:description',
      content: computed(() => category.value?.description),
    },
    {
      property: 'og:image',
      content: computed(() => category.value?.imageURL || '/logo.png'),
    },
  ],
})

const subcategories = computed(() => {
  if (!category.value) return []

  // Determine parent ID: if current is sub, use its parent (to get siblings). If root, use its ID (to get children).
  const targetParentId = category.value.parentId || category.value.id

  // Use verifiedCategories to ensures we only show subcats that are published AND have content
  return catStore.verifiedCategories.filter(
    (sub) => sub.parentId === targetParentId,
  )
})

const allProducts = computed(() => {
  if (!category.value) return []

  // 1. Get IDs for this category and all its published subcategories (Recursive)
  const getDescendantIds = (parentId) => {
    const children = catStore.categories.filter(
      (c) => c.parentId === parentId && c.isPublished,
    )
    let ids = [parentId]
    children.forEach((child) => {
      ids = [...ids, ...getDescendantIds(child.id)]
    })
    return ids
  }
  const allValidCategoryIds = getDescendantIds(category.value.id)

  // 2. Helper to trace ancestry back to a Category ID
  const getItemCategoryId = (item) => {
    if (item.type === 'product') return item.parentId
    if (item.type === 'model') {
      const parent = prodStore.products.find((p) => p.id === item.parentId)
      return parent ? parent.parentId : null
    }
    if (item.type === 'variant') {
      const model = prodStore.models.find((m) => m.id === item.parentId)
      if (model) {
        const product = prodStore.products.find((p) => p.id === model.parentId)
        return product ? product.parentId : null
      }
    }
    return null
  }

  // 3. Combine all items and filter
  const rawItems = [
    ...prodStore.products,
    ...prodStore.models,
    ...prodStore.variants,
  ]
  const uniqueItems = Array.from(
    new Map(rawItems.map((item) => [item.id, item])).values(),
  )

  return uniqueItems.filter((item) => {
    // A. Must be fully published
    if (!catStore.isTreePublished(item)) return false

    // B. Must belong to the current category tree
    const itemCatId = getItemCategoryId(item)
    return itemCatId && allValidCategoryIds.includes(itemCatId)
  })
})

watch(
  () => category.value?.name,
  () => {
    syncStore()
  },
  { immediate: true },
)

// Header Carousel Logic
const currentSlide = ref(0)
const headerImages = computed(() => {
  const images = new Set()
  for (const item of allProducts.value) {
    if (item.imageURL) images.add(item.imageURL)
  }
  if (images.size === 0 && category.value?.imageURL)
    images.add(category.value.imageURL)
  return images.size > 0 ? Array.from(images) : ['/placeholder-pump.jpg']
})

watch(
  () => category.value?.id,
  () => {
    currentSlide.value = 0
  },
)

const slideDirection = ref('slide-next')
let slideInterval

const startSlideTimer = () => {
  if (slideInterval) clearInterval(slideInterval)
  slideInterval = setInterval(() => {
    if (headerImages.value.length > 1) {
      slideDirection.value = 'slide-next'
      currentSlide.value = (currentSlide.value + 1) % headerImages.value.length
    }
  }, 6000)
}

onMounted(() => {
  startSlideTimer()
})

const setSlide = (index) => {
  slideDirection.value =
    index > currentSlide.value ? 'slide-next' : 'slide-prev'
  currentSlide.value = index
  startSlideTimer()
}

// Swipe Logic
const touchStartX = ref(0)
const handleTouchStart = (e) => {
  touchStartX.value = e.changedTouches[0].screenX
}
const handleTouchEnd = (e) => {
  const touchEndX = e.changedTouches[0].screenX
  if (touchStartX.value - touchEndX > 50) {
    // Swipe Left -> Next
    slideDirection.value = 'slide-next'
    currentSlide.value = (currentSlide.value + 1) % headerImages.value.length
    startSlideTimer()
  } else if (touchEndX - touchStartX.value > 50) {
    // Swipe Right -> Prev
    slideDirection.value = 'slide-prev'
    currentSlide.value =
      (currentSlide.value - 1 + headerImages.value.length) %
      headerImages.value.length
    startSlideTimer()
  }
}
</script>

<template>
  <div v-if="catStore.loading || prodStore.isLoading" class="container py-20">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
  </div>

  <div
    v-else-if="category && !isCategoryVisible"
    class="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 relative overflow-hidden"
  >
    <div class="relative max-w-lg w-full text-center">
      <img
        :src="maintenanceSvg"
        alt="Work in Progress"
        class="w-full max-w-md mb-8 z-10 mx-auto"
      />

      <h1 class="font-bold text-slate-900 uppercase mb-4">Work in Progress</h1>
      <p class="text-slate-500 mb-5 leading-relaxed">
        We're currently upgrading the
        <strong>{{ category.name }}</strong> section to serve you better.
        <br class="hidden md:block" />
        Check back soon for new products and features.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button @click="$router.go(-1)" class="btn btn-dark">
          <span class="material-symbols-outlined text-lg">arrow_back</span>
          Go Back
        </button>
        <router-link to="/" class="btn btn-secondary">
          Return Home
        </router-link>
      </div>
    </div>
    <div class="py-5 w-full text-center text-sm text-slate-400">
      <a href="https://storyset.com/online" target="_" class="hover:underline"
        >Team illustrations by Storyset</a
      >
    </div>
  </div>

  <section v-else-if="category" class="bg-slate-50 min-h-screen">
    <header
      class="relative w-full overflow-hidden bg-linear-to-r from-pump-black to-pump-blue py-6"
    >
      <!-- Background Aesthetics -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          class="absolute -top-24 -right-24 text-white/10 w-96 h-96"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          style="filter: drop-shadow(0 0 50px rgba(255, 255, 255, 0.4))"
        >
          <path
            fill="currentColor"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="1.5"
            d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.4,82.2,23.1,71.2,35.1C60.2,47.1,49.5,57.4,37.1,64.5C24.7,71.6,10.6,75.5,-2.6,80C-15.8,84.5,-30.3,89.6,-43.3,84.8C-56.3,80,-67.8,65.3,-76.3,49.7C-84.8,34.1,-90.3,17.6,-88.4,1.9C-86.5,-13.8,-77.2,-28.7,-66.6,-41.2C-56,-53.7,-44.1,-63.8,-31.2,-71.8C-18.3,-79.8,-4.4,-85.7,8.3,-99.1L44.7,-76.4Z"
            transform="translate(100 100)"
          />
        </svg>
        <svg
          class="absolute bottom-0 left-0 text-white/5 w-64 h-64 transform rotate-180"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="currentColor"
            d="M41.3,-72.8C53.5,-64.4,63.4,-53.3,71.3,-41.3C79.2,-29.3,85.1,-16.4,83.8,-4.1C82.5,8.2,74,19.9,64.8,30.3C55.6,40.7,45.7,49.8,34.6,56.3C23.5,62.8,11.2,66.7,-1.8,69.8C-14.8,72.9,-30.3,75.2,-43.3,69.8C-56.3,64.4,-66.8,51.3,-73.6,37.1C-80.4,22.9,-83.5,7.6,-80.9,-6.4C-78.3,-20.4,-70,-33.1,-59.6,-42.8C-49.2,-52.5,-36.7,-59.2,-24.1,-67.3C-11.5,-75.4,1.2,-84.9,13.5,-84.5C25.8,-84.1,37.7,-73.8,41.3,-72.8Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      <div class="container relative">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div class="flex flex-col">
            <h1
              class="text-3xl lg:text-5xl font-medium text-white tracking-tight leading-tight"
            >
              {{ category.name }}
            </h1>
            <p
              v-if="category.description"
              class="mt-4 text-blue-50 text-base lg:text-lg font-normal leading-relaxed max-w-xl"
            >
              {{ category.description }}
            </p>
          </div>

          <div
            class="flex justify-center lg:justify-end h-75 lg:h-100 relative"
          >
            <div
              class="relative w-full max-w-md flex items-center justify-center overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm touch-pan-y"
              @touchstart="handleTouchStart"
              @touchend="handleTouchEnd"
            >
              <TransitionGroup :name="slideDirection">
                <img
                  v-for="(img, index) in headerImages"
                  v-show="index === currentSlide"
                  :key="img"
                  :src="img"
                  class="absolute inset-0 w-full h-full object-contain drop-shadow-2xl p-6 rounded-lg"
                />
              </TransitionGroup>

              <!-- Bar Pagination -->
              <div
                v-if="headerImages.length > 1"
                class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20"
              >
                <button
                  v-for="(_, index) in headerImages"
                  :key="index"
                  @click="setSlide(index)"
                  class="h-1.5 rounded-full transition-all duration-300 shadow-sm"
                  :class="
                    currentSlide === index
                      ? 'w-8 bg-white'
                      : 'w-4 bg-white/30 hover:bg-white/50'
                  "
                ></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <Transition name="fade" mode="out-in">
      <div :key="category.id" class="container py-10">
        <div class="space-y-10">
          <!-- Subcategory Tags -->
          <div
            v-if="subcategories.length > 0"
            class="w-full flex items-center gap-3"
          >
            <router-link
              v-if="parentCategory"
              :to="`/categories/${parentCategory.slug}`"
              class="tag-base bg-slate-100 border-slate-200 text-slate-700 font-bold hover:bg-slate-200 shrink-0"
            >
              <span class="material-symbols-outlined text-[18px]!"
                >arrow_back</span
              >
              <span>Back to {{ parentCategory.name }}</span>
            </router-link>

            <div
              v-if="parentCategory"
              class="h-8 w-px bg-slate-200 shrink-0"
            ></div>

            <div class="relative fade-mask flex-1 min-w-0">
              <div
                class="flex items-center gap-3 overflow-x-auto no-scrollbar whitespace-nowrap py-1"
              >
                <router-link
                  v-for="sub in subcategories"
                  :key="sub.id"
                  :to="`/categories/${sub.slug}`"
                  class="tag-base shrink-0"
                  :class="
                    sub.id === category.id ? 'tag-active' : 'tag-inactive'
                  "
                >
                  {{ sub.name }}
                </router-link>
              </div>
            </div>
          </div>

          <TransitionGroup
            v-if="allProducts.length > 0"
            tag="div"
            name="product-list"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <ProductCard
              v-for="product in allProducts"
              :key="product.id"
              :product="product"
            />
          </TransitionGroup>

          <div
            v-else
            class="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"
          >
            <p class="text-slate-400">
              No products found in {{ category.name }}.
            </p>
          </div>
        </div>
      </div>
    </Transition>
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

<style scoped>
/* Fade Transition for Category Content */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Next: Enter from Right, Leave to Left */
.slide-next-enter-active,
.slide-next-leave-active {
  transition: all 0.8s ease-in-out;
}
.slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-next-leave-active {
  position: absolute;
}

/* Prev: Enter from Left, Leave to Right */
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: all 0.8s ease-in-out;
}
.slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
.slide-prev-leave-active {
  position: absolute;
}
</style>
