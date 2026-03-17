<script setup>
import { Splide, SplideSlide } from '@splidejs/vue-splide'
import maintenanceSvg from '@/assets/svg/Maintenance_craute_recolored_v2.svg'
import '@splidejs/vue-splide/css'
import { useHead } from '@unhead/vue'
import { ref, computed, onUnmounted, watch } from 'vue'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import { useRoute } from 'vue-router'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProductStore } from '@/stores/productStore'
import { useCartStore } from '@/stores/cartStore'
import { useUtilityStore } from '@/stores/utilityStore'
import { useSettingsStore } from '@/stores/settingsStore'

const breadcrumb = useBreadcrumbStore()
const route = useRoute()
const prodStore = useProductStore()
const catStore = useCategoryStore()
const cartStore = useCartStore()
const utils = useUtilityStore()
const settingsStore = useSettingsStore()

// Selection State
const product = ref(null)
const isProcessing = ref(false)
const isLoadingDetails = ref(false)
const isProductLoading = ref(false)

let unsubscribe = null

useHead({
  title: computed(() => product.value?.name),
  meta: [
    {
      name: 'description',
      content: computed(() => product.value?.description),
    },
    {
      property: 'og:title',
      content: computed(() =>
        product.value?.name ? `${product.value.name} | PumpHaus` : 'PumpHaus',
      ),
    },
    {
      property: 'og:description',
      content: computed(() => product.value?.description),
    },
    {
      property: 'og:image',
      content: computed(() => product.value?.imageURL || '/logo.png'),
    },
  ],
})

const loadProduct = async (slug) => {
  isLoadingDetails.value = true
  product.value = null

  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  try {
    // Reset selection when route changes

    // Fetch data in parallel to avoid race conditions where product loads before categories
    await utils.withLoading(
      Promise.all([
        catStore.fetchCategories(),
        prodStore.fetchAllItems({ reset: true }),
      ]),
    )

    // listen for the specific product; spin loader until first payload arrives
    utils.beginLoading()
    isProductLoading.value = true

    unsubscribe = prodStore.subscribeToProduct(slug, (fetchedProduct) => {
      if (isProductLoading.value) {
        utils.endLoading()
        isProductLoading.value = false
      }
      product.value = fetchedProduct
      isLoadingDetails.value = false

      if (product.value) {
        const crumbs = [{ label: 'Products', to: '/products' }]

        // Helper to build category path recursively
        const buildCategoryCrumbs = (catId) => {
          const category = catStore.getCategoryById(catId)
          if (!category) return []
          const parentCrumbs = category.parentId
            ? buildCategoryCrumbs(category.parentId)
            : []
          return [
            ...parentCrumbs,
            { label: category.name, to: `/categories/${category.slug}` },
          ]
        }

        // 1. Get root product and its category
        const rootProduct = getRootProduct(product.value)
        if (rootProduct && rootProduct.parentId) {
          crumbs.push(...buildCategoryCrumbs(rootProduct.parentId))
        }

        // 2. Add product path for models/variants
        if (
          product.value.type !== 'product' &&
          rootProduct &&
          rootProduct.id !== product.value.id
        ) {
          crumbs.push({
            label: rootProduct.name,
            to: `/products/${rootProduct.slug}`,
          })
        }
        if (product.value.type === 'variant') {
          const model = prodStore.models.find(
            (m) => m.id === product.value.parentId,
          )
          if (model)
            crumbs.push({ label: model.name, to: `/products/${model.slug}` })
        }

        // 3. Add current page title
        crumbs.push({ label: product.value.name })
        breadcrumb.set(crumbs)
      } else {
        breadcrumb.set([{ label: 'Products', to: '/products' }])
      }
    })
  } catch (e) {
    isLoadingDetails.value = false
    if (isProductLoading.value) {
      utils.endLoading()
      isProductLoading.value = false
    }
  }
}

watch(
  () => route.params.slug,
  (newSlug) => {
    if (newSlug) loadProduct(newSlug)
  },
  { immediate: true },
)

// --- REFACTORED HELPERS ---
const getRootProduct = (item) => {
  if (!item) return null
  if (item.type === 'product') return item

  // Combine all potential parents. This is safe because `fetchAllItems` populates them all.
  const allPotentialParents = [...prodStore.products, ...prodStore.models]

  let current = item
  while (current && current.type !== 'product') {
    current = allPotentialParents.find((p) => p.id === current.parentId)
  }
  return current
}

const getProductAncestor = (item) => {
  const root = getRootProduct(item)
  if (root && root.parentId) {
    return catStore.getCategoryById(root.parentId)
  }
  return null
}

// --- RELATED ITEMS LOGIC ---

// 1. Children (Product -> Models, Model -> Variants)
const childrenItems = computed(() => {
  if (!product.value) return []
  if (product.value.type === 'product') {
    return prodStore.models.filter(
      (m) => m.parentId === product.value.id && catStore.isTreePublished(m),
    )
  }
  if (product.value.type === 'model') {
    return prodStore.variants.filter(
      (v) => v.parentId === product.value.id && catStore.isTreePublished(v),
    )
  }
  return []
})

// 2. Siblings (Model -> Sibling Models, Variant -> Sibling Variants)
const siblingItems = computed(() => {
  if (!product.value) return []
  if (product.value.type === 'model') {
    return prodStore.models.filter(
      (m) =>
        m.parentId === product.value.parentId &&
        m.id !== product.value.id &&
        catStore.isTreePublished(m),
    )
  }
  if (product.value.type === 'variant') {
    return prodStore.variants.filter(
      (v) =>
        v.parentId === product.value.parentId &&
        v.id !== product.value.id &&
        catStore.isTreePublished(v),
    )
  }
  return []
})

// 3. Category Neighbors (Parent Product -> Sibling Products in Category)
const categoryItems = computed(() => {
  if (!product.value) return []
  const category = getProductAncestor(product.value)
  if (!category) return []

  const mainProductId = getRootProduct(product.value)?.id

  return prodStore.products.filter(
    (p) =>
      p.parentId === category.id &&
      p.id !== mainProductId &&
      p.type === 'product' &&
      catStore.isTreePublished(p),
  )
})

const hasDescendants = computed(() => {
  if (!product.value) return false
  return (
    prodStore.models.some((m) => m.parentId === product.value.id) ||
    prodStore.variants.some((v) => v.parentId === product.value.id)
  )
})

const canAddToCart = computed(() => {
  if (!product.value) return false
  if (product.value.price > 0) return true
  if (!hasDescendants.value) return true
  return false
})

const handlePrimaryAction = async () => {
  if (isProcessing.value) return
  if (!canAddToCart.value) return
  isProcessing.value = true

  try {
    if (product.value) {
      cartStore.addItem(product.value)
    }
  } finally {
    isProcessing.value = false
  }
}

onUnmounted(() => {
  breadcrumb.clear()
  if (unsubscribe) unsubscribe()
  prodStore.stopAllListeners()
  if (isProductLoading.value) {
    utils.endLoading()
    isProductLoading.value = false
  }
})
</script>

<template>
  <div
    v-if="prodStore.isLoading || isLoadingDetails"
    class="container animate-pulse py-10"
  >
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <!-- Image Skeleton -->
      <div class="lg:col-span-7">
        <div
          class="bg-slate-100 rounded-lg aspect-square w-full border border-slate-200"
        ></div>
      </div>

      <!-- Details Skeleton -->
      <div class="lg:col-span-5 flex flex-col">
        <!-- Header -->
        <div
          class="flex justify-between items-start gap-4 border-b border-slate-100 pb-6"
        >
          <div class="h-10 bg-slate-200 rounded w-3/4"></div>
          <div class="h-8 bg-slate-200 rounded w-20"></div>
        </div>

        <!-- Meta -->
        <div class="mt-4 flex flex-col items-start gap-3">
          <div class="h-6 bg-slate-100 rounded w-24"></div>
          <div class="h-4 bg-slate-100 rounded w-32"></div>
        </div>

        <!-- Description -->
        <div class="mt-8 space-y-3">
          <div class="h-4 bg-slate-100 rounded w-full"></div>
          <div class="h-4 bg-slate-100 rounded w-full"></div>
          <div class="h-4 bg-slate-100 rounded w-5/6"></div>
          <div class="h-4 bg-slate-100 rounded w-4/6"></div>
        </div>

        <!-- Info Sections -->
        <div class="mt-8 pt-5 border-t border-slate-100 space-y-4">
          <div class="h-4 bg-slate-200 rounded w-1/3"></div>
          <div class="space-y-2">
            <div class="h-3 bg-slate-100 rounded w-full"></div>
            <div class="h-3 bg-slate-100 rounded w-5/6"></div>
            <div class="h-3 bg-slate-100 rounded w-4/5"></div>
          </div>
        </div>

        <!-- Selects & Button -->
        <div class="mt-8 space-y-6">
          <div class="h-12 bg-slate-100 rounded w-full"></div>
          <div class="h-12 bg-slate-100 rounded w-full"></div>
          <div class="mt-10 h-14 bg-slate-200 rounded w-full"></div>
        </div>
      </div>
    </div>

    <!-- Carousel Skeleton -->
    <div class="mt-24 space-y-16">
      <div class="pt-12 border-t border-slate-100">
        <div class="h-6 bg-slate-200 rounded w-48 mb-6"></div>
        <div class="flex gap-4 overflow-hidden">
          <div
            v-for="i in 4"
            :key="i"
            class="min-w-35 w-35 md:min-w-40 md:w-40 shrink-0"
          >
            <div
              class="aspect-square bg-slate-100 rounded mb-3 border border-slate-200"
            ></div>
            <div class="h-3 bg-slate-100 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-slate-100 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else-if="product && !catStore.isTreePublished(product)"
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
        We're currently updating <strong>{{ product.name }}</strong> to serve
        you better. <br class="hidden md:block" />
        Check back soon for updated specifications.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button @click="$router.go(-1)" class="btn btn-dark">
          <span class="material-symbols-outlined text-lg">arrow_back</span>
          Go Back
        </button>
        <router-link to="/products" class="btn btn-secondary">
          View All Products
        </router-link>
      </div>
      <div
        class="absolute bottom-4 left-0 w-full text-center text-sm text-slate-400"
      ></div>
    </div>
    <div class="py-5 w-full text-center text-sm text-slate-400">
      <a href="https://storyset.com/online" target="_" class="hover:underline"
        >Team illustrations by Storyset</a
      >
    </div>
  </div>
  <div v-else-if="product" class="container py-10">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div class="lg:col-span-7">
        <div
          class="bg-slate-50 rounded-lg overflow-hidden border border-slate-100"
        >
          <img
            :src="product.imageURL"
            :alt="product.name"
            class="w-full h-auto object-contain"
          />
        </div>
      </div>

      <div class="lg:col-span-5 flex flex-col">
        <div
          class="flex justify-between items-start gap-4 border-b border-slate-100 pb-6"
        >
          <h3
            class="text-3xl font-medium text-slate-900 tracking-tighter uppercase leading-tight"
          >
            {{ product.name }}
          </h3>
          <div class="text-xl font-bold text-slate-900 shrink-0">
            {{ product.price > 0 ? utils.formatCurrency(product.price) : ' ' }}
          </div>
        </div>

        <div class="mt-4 flex flex-col items-start gap-3">
          <div v-if="product.parentId && getProductAncestor(product)">
            <RouterLink
              :to="`/categories/${getProductAncestor(product)?.slug}`"
            >
              <span
                class="inline-block bg-slate-100 text-slate-500 text-[12px] font-medium tracking-[0.2em] px-2 py-1 rounded-sm border border-slate-200"
              >
                {{ getProductAncestor(product)?.name }}
              </span>
            </RouterLink>
          </div>
          <span
            v-if="product.product_code"
            class="text-slate-400 text-[14px] uppercase tracking-widest"
          >
            N0. {{ product.product_code }}
          </span>
        </div>

        <div class="mt-8 text-slate-600 leading-relaxed text-sm">
          {{ product.description }}
        </div>

        <div
          v-if="product.info_sections?.length"
          class="mt-5 space-y-2 border-t border-slate-100 pt-5"
        >
          <div v-for="(section, index) in product.info_sections" :key="index">
            <h4 class="text-xs font-medium text-slate-900 mb-5">
              {{ section.title }}
            </h4>

            <ul class="grid grid-cols-1 gap-3">
              <li
                v-for="(item, idx) in section.items"
                :key="idx"
                class="flex items-start gap-3 text-sm text-slate-600 group"
              >
                <span
                  class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 group-hover:scale-125 transition-transform"
                ></span>
                <span class="leading-relaxed">{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          v-if="product.externalLinks?.length"
          class="mt-5 space-y-2 border-t border-slate-100 pt-5"
        >
          <h4 class="text-xs font-medium text-slate-900 mb-3">
            Additional Resources
          </h4>
          <ul class="space-y-2">
            <li v-for="(link, index) in product.externalLinks" :key="index">
              <a
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                <span class="material-symbols-outlined text-lg"
                  >open_in_new</span
                >
                {{ link.title }}
              </a>
            </li>
          </ul>
        </div>

        <template v-if="canAddToCart">
          <button
            @click="handlePrimaryAction"
            :disabled="isProcessing"
            class="mt-10 w-full bg-slate-900 text-white font-black py-5 rounded uppercase tracking-widest text-xs hover:bg-sky-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            <span
              v-if="isProcessing"
              class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"
            ></span>
            {{
              isProcessing
                ? 'Processing...'
                : product.price > 0
                  ? 'Add to Cart'
                  : 'Add to Quote Request'
            }}
          </button>
        </template>
        <p
          v-if="!canAddToCart && hasDescendants"
          class="mt-4 text-sm text-slate-500"
        >
          To purchase or request quote, please choose your preferred model or
          variant from the list below.
        </p>

        <div
          v-if="product.hasWarranty"
          class="mt-8 flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100"
        >
          <svg
            class="w-5 h-5 text-sky-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              stroke-width="2"
            />
          </svg>
          <div class="text-xs text-slate-500 leading-snug">
            <span class="font-bold text-slate-900 block mb-1 uppercase"
              >Limited Manufacturer Warranty</span
            >
            {{ settingsStore.settings.warranty_notes_default }}
          </div>
        </div>
      </div>
    </div>

    <!-- RELATED SECTIONS -->
    <div class="mt-12 space-y-10">
      <!-- 1. Children (Models or Variants) -->
      <section
        v-if="childrenItems.length > 0"
        class="pt-8 border-t border-slate-200"
      >
        <h3 class="font-medium text-slate-900 mb-6">
          {{
            product.type === 'product'
              ? 'Available Models'
              : 'Available Configurations'
          }}
        </h3>
        <Splide
          class="product-splide"
          :options="{
            autoWidth: true,
            gap: '1rem',
            pagination: false,
            arrows: true,
          }"
        >
          <SplideSlide
            v-for="item in childrenItems"
            :key="item.id"
            class="min-w-35 w-35 md:min-w-40 md:w-40 group cursor-pointer relative"
          >
            <div
              class="aspect-square bg-slate-50 rounded mb-3 overflow-hidden border border-slate-100"
            >
              <img
                :src="
                  item.imageURL || product.imageURL || '/placeholder-pump.jpg'
                "
                class="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <h4 class="text-[10px] font-bold uppercase text-slate-900 truncate">
              {{ item.name }}
            </h4>
            <p class="text-[10px] text-slate-400 font-bold">
              {{
                item.price > 0
                  ? utils.formatCurrency(item.price)
                  : 'Request Quote'
              }}
            </p>
            <RouterLink :to="`/products/${item.slug}`"
              ><span class="absolute inset-0"></span
            ></RouterLink>
          </SplideSlide>
        </Splide>
      </section>

      <!-- 2. Siblings (Other Models or Variants) -->
      <section
        v-if="siblingItems.length > 0"
        class="pt-8 border-t border-slate-200"
      >
        <h3 class="font-medium text-slate-900 mb-6">
          {{
            product.type === 'model'
              ? 'Other Models in Series'
              : 'Other Options'
          }}
        </h3>
        <Splide
          class="product-splide"
          :options="{
            autoWidth: true,
            gap: '1rem',
            pagination: false,
            arrows: true,
          }"
        >
          <SplideSlide
            v-for="item in siblingItems"
            :key="item.id"
            class="min-w-35 w-35 md:min-w-40 md:w-40 group cursor-pointer relative"
          >
            <div
              class="aspect-square bg-slate-50 rounded mb-3 overflow-hidden border border-slate-100"
            >
              <img
                :src="
                  item.imageURL || product.imageURL || '/placeholder-pump.jpg'
                "
                class="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <h4 class="text-[10px] font-bold uppercase text-slate-900 truncate">
              {{ item.name }}
            </h4>
            <p class="text-[10px] text-slate-400 font-bold">
              {{
                item.price > 0
                  ? utils.formatCurrency(item.price)
                  : 'Request Quote'
              }}
            </p>
            <RouterLink :to="`/products/${item.slug}`"
              ><span class="absolute inset-0"></span
            ></RouterLink>
          </SplideSlide>
        </Splide>
      </section>

      <!-- 3. Category Neighbors -->
      <section
        v-if="categoryItems.length > 0"
        class="pt-8 border-t border-slate-200"
      >
        <h3 class="font-medium text-slate-900 mb-6">Similar Products</h3>
        <Splide
          class="product-splide"
          :options="{
            autoWidth: true,
            gap: '1rem',
            pagination: false,
            arrows: true,
          }"
        >
          <SplideSlide
            v-for="item in categoryItems"
            :key="item.id"
            class="min-w-35 w-35 md:min-w-40 md:w-40 group cursor-pointer relative"
          >
            <div
              class="aspect-square bg-slate-50 rounded mb-3 overflow-hidden border border-slate-100"
            >
              <img
                :src="item.imageURL || '/placeholder-pump.jpg'"
                class="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <h4 class="text-[10px] font-bold uppercase text-slate-900 truncate">
              {{ item.name }}
            </h4>
            <p class="text-[10px] text-slate-400 font-bold">
              {{
                item.price > 0
                  ? utils.formatCurrency(item.price)
                  : 'Request Quote'
              }}
            </p>
            <RouterLink :to="`/products/${item.slug}`"
              ><span class="absolute inset-0"></span
            ></RouterLink>
          </SplideSlide>
        </Splide>
      </section>
    </div>
  </div>
  <div v-else class="max-w-7xl mx-auto px-4 py-20 text-center">
    <h2 class="text-2xl font-black text-slate-900">Product Not Found</h2>
    <p class="text-slate-500 mt-2">
      The product you are looking for might have been moved or unpublished.
    </p>
    <router-link
      to="/products"
      class="mt-6 inline-block text-blue-600 font-bold uppercase text-xs underline"
    >
      Back to Catalog
    </router-link>
  </div>
</template>

<style></style>
