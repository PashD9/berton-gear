<script setup>
import LinkButton from '@/components/buttons/LinkButton.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProductStore } from '@/stores/productStore'
import { useUtilityStore } from '@/stores/utilityStore'
import { onMounted, ref, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

defineProps({
  styling: { type: Object, default: () => ({}) },
})

const catStore = useCategoryStore()
const prodStore = useProductStore()
const utils = useUtilityStore()

const router = useRouter()

// Image Rotation Logic
const currentCategory = ref(null)
const currentImage = ref('')
const images = ref([])
let intervalId = null
let categoryIntervalId = null

const collectImages = (category) => {
  if (!category) return

  const pool = []
  const catId = category.id

  // 1. Get Products in this category
  // Note: prodStore.products contains all items (products, models, variants)
  const items = prodStore.products.filter((p) => p.parentId === catId)
  items.forEach((p) => {
    if (p.imageURL) pool.push(p.imageURL)
  })

  // 2. Get Products in immediate subcategories
  const subCats = catStore.categories.filter((c) => c.parentId === catId)
  subCats.forEach((sub) => {
    const subProds = prodStore.products.filter((p) => p.parentId === sub.id)
    subProds.forEach((p) => {
      if (p.imageURL) pool.push(p.imageURL)
    })
  })

  // 3. If we found images, update the list
  if (pool.length > 0) {
    images.value = pool
    // Set initial random image
    if (images.value.length > 0 && !currentImage.value) {
      currentImage.value =
        images.value[Math.floor(Math.random() * images.value.length)]
    }
  } else if (category.imageURL) {
    images.value = [category.imageURL]
    currentImage.value = category.imageURL
  }
}

const initRotation = () => {
  if (categoryIntervalId) clearInterval(categoryIntervalId)

  const bannerCategories = catStore.categories.filter(
    (c) => c.isBanner && !c.parentId,
  )

  if (bannerCategories.length > 0) {
    let index = 0
    const rotate = () => {
      currentCategory.value = bannerCategories[index]
      collectImages(currentCategory.value)
      index = (index + 1) % bannerCategories.length
    }

    rotate() // Initial set

    if (bannerCategories.length > 1) {
      categoryIntervalId = setInterval(rotate, 8000) // Rotate category every 8s
    }
  }
}

watch(
  () => [catStore.categories.length, prodStore.products.length],
  initRotation,
  { immediate: true },
)

onMounted(async () => {
  if (catStore.categories.length === 0) await catStore.fetchCategories()

  if (prodStore.products.length === 0) await prodStore.fetchAllPublished()

  intervalId = setInterval(() => {
    if (images.value.length > 1) {
      const idx = Math.floor(Math.random() * images.value.length)
      currentImage.value = images.value[idx]
    }
  }, 9000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  if (categoryIntervalId) clearInterval(categoryIntervalId)
})
</script>

<template>
  <!-- This Component can feature anything from a category, service etc -->
  <section
    v-if="currentCategory"
    :class="[styling.backgroundColor || '', styling.padding || 'py-10']"
  >
    <div class="container">
      <div
        class="relative w-full overflow-hidden bg-linear-to-br from-pump-navy to-pump-blue rounded-2xl shadow-lg"
      >
        <!-- Background Aesthetics -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <!-- Texture Overlay -->
          <div
            class="absolute inset-0 opacity-10 mix-blend-overlay"
            style="
              background-image: url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.65%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27/%3E%3C/svg%3E');
            "
          ></div>

          <!-- SVG Waves Top Left -->
          <svg
            class="absolute -top-24 -left-24 w-96 h-96 text-white/10 opacity-50"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.4,82.2,23.1,71.2,35.1C60.2,47.1,49.5,57.4,37.1,64.5C24.7,71.6,10.6,75.5,-2.6,80C-15.8,84.5,-30.3,89.6,-43.3,84.8C-56.3,80,-67.8,65.3,-76.3,49.7C-84.8,34.1,-90.3,17.6,-88.4,1.9C-86.5,-13.8,-77.2,-28.7,-66.6,-41.2C-56,-53.7,-44.1,-63.8,-31.2,-71.8C-18.3,-79.8,-4.4,-85.7,8.3,-99.1L44.7,-76.4Z"
              transform="translate(100 100)"
            />
          </svg>

          <!-- SVG Circles Bottom Right -->
          <svg
            class="absolute bottom-0 right-0 text-white/5 w-64 h-64"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="currentColor"
              stroke-width="20"
            />
            <circle
              cx="100"
              cy="100"
              r="50"
              fill="none"
              stroke="currentColor"
              stroke-width="10"
            />
          </svg>

          <!-- Bottom Glow -->
          <div
            class="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-white/10 blur-[80px] rounded-full"
          ></div>
        </div>

        <div class="relative z-10">
          <div
            class="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-10 items-center py-4 px-8"
          >
            <!-- Image Content -->
            <div
              class="lg:col-span-5 w-full flex justify-center lg:justify-start"
            >
              <div
                class="relative group w-full max-w-sm aspect-video rounded-lg overflow-hidden border-5 border-white/10 bg-black/20"
              >
                <img
                  v-if="currentImage"
                  :src="currentImage"
                  :alt="currentCategory.name"
                  class="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center group-hover:bg-white/5 transition-colors"
                >
                  <svg
                    class="w-32 h-32 text-white/20 group-hover:text-white/40 transition-colors duration-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    ></path>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Text Content -->
            <div class="lg:col-span-7 flex flex-col items-start gap-3">
              <div>
                <h2 class="font-bold text-white">
                  {{ currentCategory.name }}
                </h2>
              </div>

              <p
                class="text-blue-50 text-sm lg:text-base leading-relaxed max-w-xl line-clamp-2"
              >
                {{ utils.truncate(currentCategory.description, 150) }}
              </p>

              <div class="flex flex-wrap items-center gap-4 pt-1">
                <LinkButton
                  :link="`/categories/${currentCategory.slug}`"
                  class="bg-transparent border-2 border-white/20 text-white hover:bg-white hover:text-slate-900 hover:border-white transition-all duration-300 px-6 py-2 font-bold uppercase tracking-widest text-[10px] shadow-lg hover:shadow-white/20"
                >
                  Explore Collection
                </LinkButton>

                <div
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
                >
                  <span class="relative flex h-1.5 w-1.5">
                    <span
                      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"
                    ></span>
                    <span
                      class="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"
                    ></span>
                  </span>
                  <span
                    class="text-[9px] font-bold uppercase tracking-widest text-white"
                    >Featured</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section v-else-if="catStore.loading" class="py-6">
    <div class="container">
      <div
        class="relative w-full overflow-hidden bg-slate-200 rounded-2xl animate-pulse"
      >
        <div
          class="flex flex-col md:grid md:grid-cols-12 gap-6 md:gap-10 items-center p-6 md:p-10"
        >
          <!-- Image Content Skeleton -->
          <div
            class="md:col-span-5 w-full flex justify-center md:justify-start"
          >
            <div
              class="w-full max-w-sm aspect-video bg-slate-300 rounded-lg"
            ></div>
          </div>

          <!-- Text Content Skeleton -->
          <div class="md:col-span-7 flex flex-col items-start space-y-4 w-full">
            <!-- Title & Category -->
            <div class="h-8 w-3/4 bg-slate-300 rounded"></div>

            <!-- Description -->
            <div class="space-y-2 w-full max-w-lg">
              <div class="h-4 w-full bg-slate-300 rounded"></div>
              <div class="h-4 w-5/6 bg-slate-300 rounded"></div>
            </div>

            <!-- Buttons -->
            <div class="flex items-center gap-4 pt-2">
              <div class="h-10 w-32 bg-slate-300 rounded"></div>
              <div class="h-6 w-24 bg-slate-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
