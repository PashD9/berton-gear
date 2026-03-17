<script setup>
import { computed, onMounted } from 'vue'
import LinkButton from '../buttons/LinkButton.vue'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'

const props = defineProps({
  rotationPeriod: {
    type: String,
    default: 'daily', // 'hourly', 'daily', 'weekly'
    validator: (value) => ['hourly', 'daily', 'weekly'].includes(value),
  },
  styling: { type: Object, default: () => ({}) },
})

const prodStore = useProductStore()
const catStore = useCategoryStore()

const featuredProduct = computed(() => {
  // Filter for Models and Variants only
  const featured = prodStore.products.filter(
    (p) => p.isFeatured && (p.type === 'model' || p.type === 'variant'),
  )

  if (featured.length === 0) return null

  const now = Date.now()
  let periodMs

  switch (props.rotationPeriod) {
    case 'hourly':
      periodMs = 1000 * 60 * 60
      break
    case 'weekly':
      periodMs = 1000 * 60 * 60 * 24 * 7
      break
    case 'daily':
    default:
      periodMs = 1000 * 60 * 60 * 24
      break
  }

  // Calculate index based on time to rotate through the list
  const index = Math.floor(now / periodMs) % featured.length
  return featured[index]
})

const categoryName = computed(() => {
  if (!featuredProduct.value?.parentId) return null
  const cat = catStore.categories.find(
    (c) => c.id === featuredProduct.value.parentId,
  )
  return cat ? cat.name : null
})

onMounted(() => {
  prodStore.fetchAllPublished()
  catStore.fetchCategories()
})
</script>

<template>
  <section
    v-if="prodStore.isLoading"
    :class="[
      styling.backgroundColor || 'bg-slate-900',
      styling.padding || 'py-10',
      'relative w-full overflow-hidden',
    ]"
  >
    <div class="container relative z-10">
      <div
        class="flex flex-col-reverse md:grid md:grid-cols-12 gap-8 md:gap-12 items-center animate-pulse"
      >
        <!-- Text Content Skeleton -->
        <div class="md:col-span-7 flex flex-col items-start space-y-6 w-full">
          <!-- Badge -->
          <div class="h-6 w-32 bg-slate-800 rounded-full"></div>

          <!-- Title & Category -->
          <div class="space-y-4 w-full">
            <div class="h-10 w-3/4 bg-slate-800 rounded"></div>
            <div class="h-4 w-1/4 bg-slate-800 rounded"></div>
          </div>

          <!-- Description -->
          <div class="space-y-2 w-full max-w-xl">
            <div class="h-4 w-full bg-slate-800 rounded"></div>
            <div class="h-4 w-5/6 bg-slate-800 rounded"></div>
            <div class="h-4 w-4/6 bg-slate-800 rounded"></div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-6 pt-2">
            <div class="h-12 w-40 bg-slate-800 rounded"></div>
            <div class="h-12 w-24 bg-slate-800 rounded"></div>
          </div>
        </div>

        <!-- Image Content Skeleton -->
        <div class="md:col-span-5 w-full flex justify-center md:justify-end">
          <div
            class="w-full max-w-sm aspect-video bg-slate-800 rounded-2xl border border-slate-700"
          ></div>
        </div>
      </div>
    </div>
  </section>
  <section
    v-else-if="featuredProduct"
    :class="[
      styling.backgroundColor || 'bg-slate-900',
      styling.padding || 'py-10',
      'relative w-full overflow-hidden',
    ]"
  >
    <!-- Background Aesthetics -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Dark Gradient Overlay -->
      <div
        class="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 opacity-90"
      ></div>

      <!-- SVG Scribble Top Left -->
      <svg
        class="absolute -top-20 -left-20 w-96 h-96 text-slate-700/20 opacity-50"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M41.3,-72.8C53.5,-64.4,63.4,-53.3,71.3,-41.3C79.2,-29.3,85.1,-16.4,83.8,-4.1C82.5,8.2,74,19.9,64.8,30.3C55.6,40.7,45.7,49.8,34.6,56.3C23.5,62.8,11.2,66.7,-1.8,69.8C-14.8,72.9,-30.3,75.2,-43.3,69.8C-56.3,64.4,-66.8,51.3,-73.6,37.1C-80.4,22.9,-83.5,7.6,-80.9,-6.4C-78.3,-20.4,-70,-33.1,-59.6,-42.8C-49.2,-52.5,-36.7,-59.2,-24.1,-67.3C-11.5,-75.4,1.2,-84.9,13.5,-84.5C25.8,-84.1,37.7,-73.8,41.3,-72.8Z"
          transform="translate(100 100)"
        />
      </svg>

      <!-- SVG Dots Bottom Right -->
      <svg
        class="absolute bottom-0 right-0 text-sky-500/5 w-64 h-64"
        width="100"
        height="100"
        viewBox="0 0 100 100"
      >
        <pattern
          id="dots"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="2" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      <!-- Abstract Curve -->
      <svg
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full text-white/5 pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0 100 C 20 0 50 0 100 100"
          stroke="currentColor"
          stroke-width="0.5"
          fill="none"
        />
      </svg>
    </div>

    <div class="container relative z-10">
      <div
        class="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center"
      >
        <!-- Text Content -->
        <div class="lg:col-span-7 flex flex-col items-start space-y-6">
          <div
            class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 backdrop-blur-sm"
          >
            <span class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex rounded-full h-2 w-2 bg-sky-500"
              ></span>
            </span>
            <span
              class="text-xs font-bold uppercase tracking-widest text-sky-400"
              >Featured Product</span
            >
          </div>

          <div class="space-y-2">
            <h2 class="font-bold text-white">
              {{ featuredProduct.name }}
            </h2>
            <div
              v-if="categoryName"
              class="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2"
            >
              <span class="w-8 h-px bg-slate-600"></span>
              {{ categoryName }}
            </div>
          </div>

          <p class="text-slate-300 text-base leading-relaxed max-w-xl">
            {{
              featuredProduct.description ||
              'Experience superior performance and reliability with our featured industrial solution.'
            }}
          </p>

          <div class="flex flex-wrap items-center gap-6 pt-2">
            <LinkButton
              :link="`/products/${featuredProduct.slug}`"
              class="bg-transparent border-2 border-white/20 text-white hover:bg-white hover:text-slate-900 hover:border-white shadow-lg hover:shadow-white/20"
            >
              View Product
            </LinkButton>

            <div
              v-if="featuredProduct.price > 0"
              class="flex flex-col border-l border-slate-700 pl-6"
            >
              <span
                class="text-[10px] text-slate-500 uppercase font-bold tracking-wider"
                >Price</span
              >
              <span class="text-xl font-bold text-white"
                >${{ featuredProduct.price.toLocaleString() }}</span
              >
            </div>
          </div>
        </div>

        <!-- Image Content -->
        <div class="lg:col-span-5 w-full flex justify-center lg:justify-end">
          <div class="relative group w-full max-w-sm">
            <!-- Glow Effect -->
            <div
              class="absolute -inset-1 bg-linear-to-r from-sky-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"
            ></div>

            <div
              class="relative bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-lg shadow-2xl flex items-center justify-center"
            >
              <img
                v-if="featuredProduct.imageURL"
                :src="featuredProduct.imageURL"
                :alt="featuredProduct.name"
                class="w-full h-full object-contain drop-shadow-md transform transition-transform duration-500 rounded-lg"
              />
              <div v-else class="text-slate-500">No Image</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
