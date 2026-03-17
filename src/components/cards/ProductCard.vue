<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useProductStore } from '@/stores/productStore'
import { useUtilityStore } from '@/stores/utilityStore'

const cartStore = useCartStore()
const prodStore = useProductStore()
const utils = useUtilityStore()

const props = defineProps({
  product: {
    type: Object,
    default: () => ({ name: '', imageURL: '', description: '', price: 0 }),
  },
  models: { type: Array, default: () => [] },
  variants: { type: Array, default: () => [] },
})

// reactive clock so computed value will re-evaluate over time
const currentTime = ref(Date.now())
let _newTimer = null
onMounted(() => {
  _newTimer = setInterval(
    () => {
      currentTime.value = Date.now()
    },
    1000 * 60 * 60,
  )
})

onUnmounted(() => {
  if (_newTimer) clearInterval(_newTimer)
})

const isNew = computed(() => {
  if (!props.product.createdAt) return false

  // Handle Firestore Timestamps or standard Date strings/objects
  const productDate = props.product.createdAt.toDate
    ? props.product.createdAt.toDate()
    : new Date(props.product.createdAt)

  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000
  const ageInMs = currentTime.value - productDate.getTime()

  return ageInMs > 0 && ageInMs < thirtyDaysInMs
})

const typeBadge = computed(() => {
  if (!props.product.type) return null
  switch (props.product.type) {
    case 'product':
      return { text: 'Series', class: 'bg-slate-700 text-white' }
    case 'model':
      return { text: 'Model', class: 'bg-sky-600 text-white' }
    case 'variant':
      return { text: 'Variant', class: 'bg-teal-600 text-white' }
    default:
      return null
  }
})

// Logic to find the "Display Price"
// first check own price; if missing, scan store for child items
const displayPrice = computed(() => {
  if (props.product.price > 0) return props.product.price

  const gatherChildren = () => {
    const prices = []
    // use props arrays if provided for backwards compatibility
    if (props.models.length) prices.push(...props.models.map((m) => m.price))
    if (props.variants.length)
      prices.push(...props.variants.map((v) => v.price))

    // generic fallback: search all products for children
    if (prices.length === 0 && prodStore.products.length) {
      prodStore.products
        .filter((p) => p.parentId === props.product.id)
        .forEach((p) => prices.push(p.price))
    }

    return prices.filter((p) => p > 0)
  }

  const childPrices = gatherChildren()
  return childPrices.length > 0 ? Math.min(...childPrices) : null
})

const isStartingPrice = computed(() => {
  return !props.product.price && displayPrice.value !== null
})

// determine if this item has any child items (product/model/variant)
const hasDescendants = computed(() => {
  if (!props.product || !props.product.id) return false

  // 1. if callers pass in explicit child arrays (older codepaths)
  if (props.models.length || props.variants.length) {
    return props.models.length > 0 || props.variants.length > 0
  }

  // 2. otherwise look across all of the store arrays. when using
  // fetchAllItems (used by CategoriesView) the products array only
  // contains top–level products, so models/variants must be checked
  // separately. this ensures the logic behaves consistently no matter
  // how the store was populated.
  return (
    prodStore.products.some((p) => p.parentId === props.product.id) ||
    prodStore.models.some((m) => m.parentId === props.product.id) ||
    prodStore.variants.some((v) => v.parentId === props.product.id)
  )
})

// quick-add allowed when the product itself has a price or when it has no children
// (note: price takes precedence so you can still add a priced item even if it has
// children – this mirrors the previous behaviour.)
const canQuickAdd = computed(() => {
  if (props.product.price > 0) return true
  if (!hasDescendants.value) return true
  return false
})

const parentItem = computed(() => {
  if (!props.product.parentId) return null

  if (props.product.type === 'model') {
    return prodStore.products.find((p) => p.id === props.product.parentId)
  }

  if (props.product.type === 'variant') {
    // Check models array first, then products array (depends on which fetch method was used in store)
    return (
      prodStore.models.find((m) => m.id === props.product.parentId) ||
      prodStore.products.find((p) => p.id === props.product.parentId)
    )
  }
  return null
})

const handleQuickAdd = (product) => {
  if (!canQuickAdd.value) return
  cartStore.addItem(product)
}
</script>

<template>
  <div
    class="group bg-white border border-slate-300 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col relative"
  >
    <template v-if="canQuickAdd">
      <button
        @click.prevent="handleQuickAdd(product)"
        class="btn btn-overlay whitespace-nowrap"
      >
        Add to Cart
      </button>
    </template>
    <template v-else>
      <router-link
        :to="`/products/${product.slug}`"
        class="btn btn-overlay whitespace-nowrap"
      >
        View
      </router-link>
    </template>

    <div class="relative aspect-square bg-white overflow-hidden">
      <router-link :to="`/products/${product.slug}`">
        <img
          :src="product.imageURL || '/placeholder-pump.jpg'"
          :alt="product.name"
          class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
      </router-link>

      <div
        v-if="isNew"
        class="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm z-10"
      >
        New
      </div>

      <div
        v-if="typeBadge"
        :class="[
          'absolute top-2 right-2 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm z-10',
          typeBadge.class,
        ]"
      >
        {{ typeBadge.text }}
      </div>

      <!-- <div v-if="product.stock <= 0" class="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
        Out of Stock
      </div> -->
    </div>

    <div class="p-4 flex flex-col grow bg-slate-100">
      <span
        class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1"
      >
        {{ product.product_code || 'Industrial Series' }}
      </span>

      <h4 class="text-slate-900 font-bold leading-tight mb-2">
        {{ product.name }}
      </h4>

      <div
        v-if="parentItem"
        class="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2"
      >
        Part of {{ parentItem.name }}
      </div>

      <p class="text-slate-500 text-xs line-clamp-2 mb-4">
        {{ product.description }}
      </p>

      <div
        class="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between"
      >
        <div class="flex flex-col">
          <span
            v-if="isStartingPrice"
            class="text-[10px] text-slate-400 font-bold uppercase"
            >Starting from</span
          >
          <span v-if="displayPrice" class="text-xl font-medium text-slate-900">
            {{ utils.formatCurrency(displayPrice) }}
          </span>
          <span
            v-else-if="!canQuickAdd && hasDescendants"
            class="text-sm font-bold text-blue-600"
          >
            See models
          </span>
          <span v-else class="text-sm font-bold text-blue-600"
            >Request Quote</span
          >
        </div>

        <router-link
          :to="`/products/${product.slug}`"
          class="bg-slate-900 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M17 8l4 4m0 0l-4 4m4-4H3"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </router-link>
      </div>
    </div>
  </div>
</template>
