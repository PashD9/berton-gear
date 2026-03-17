<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProductStore } from '@/stores/productStore'

const props = defineProps({ isVisible: Boolean })
const emit = defineEmits(['close'])

const catStore = useCategoryStore()
const prodStore = useProductStore()
const searchQuery = ref('')
const isSearching = ref(false) // <--- THIS WAS MISSING

// This watch triggers the "isSearching" state for the UI feedback
watch(searchQuery, () => {
  if (searchQuery.value.length > 0) {
    isSearching.value = true
    setTimeout(() => {
      isSearching.value = false
    }, 300)
  }
})

onMounted(async () => {
  if (catStore.categories.length === 0) await catStore.fetchCategories()
  prodStore.fetchAllPublished()
})

const verifiedCategories = computed(() => catStore.verifiedCategories)

// --- 2. SEARCH FILTER ---
const filteredResults = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  const source = verifiedCategories.value

  if (!query) {
    // Default view: show all parent categories that have verified content.
    return source.filter((cat) => !cat.parentId)
  }

  // When searching, find all subcategories that match and collect their parent IDs.
  const parentIdsOfMatchingSubs = new Set()
  source.forEach((cat) => {
    if (cat.parentId) {
      const nameMatch = cat.name.toLowerCase().includes(query)
      const keywordMatch = cat.keywords?.some((k) =>
        k.toLowerCase().includes(query),
      )

      if (nameMatch || keywordMatch) {
        parentIdsOfMatchingSubs.add(cat.parentId)
      }
    }
  })

  // The final results should include parent categories that either match the query directly,
  // or are the parent of a subcategory that matches.
  return source.filter((cat) => {
    // Only Parents in the top-level results
    if (cat.parentId) return false

    const nameMatch = cat.name.toLowerCase().includes(query)
    const keywordMatch = cat.keywords?.some((k) =>
      k.toLowerCase().includes(query),
    )
    const hasMatchingSub = parentIdsOfMatchingSubs.has(cat.id)

    return nameMatch || keywordMatch || hasMatchingSub
  })
})

// --- 3. TEMPLATE HELPERS ---
const categoriesWithChildren = computed(() => {
  return filteredResults.value.filter((cat) =>
    verifiedCategories.value.some((s) => s.parentId === cat.id),
  )
})

const categoriesWithoutChildren = computed(() => {
  return filteredResults.value.filter(
    (cat) => !verifiedCategories.value.some((s) => s.parentId === cat.id),
  )
})

// This helper is for your template loop that renders <li> of subs
const getVerifiedSubs = (parentId) => {
  const query = searchQuery.value.toLowerCase().trim()
  const allSubs = verifiedCategories.value.filter(
    (s) => s.parentId === parentId,
  )

  // If we are not searching, return all verified subcategories.
  if (!query) {
    return allSubs
  }

  // If the parent category's name is a match, show all its children.
  const parent = filteredResults.value.find((p) => p.id === parentId)
  if (parent && parent.name.toLowerCase().includes(query)) {
    return allSubs
  }

  // Otherwise, only return the subcategories that match the search query.
  return allSubs.filter((s) => s.name.toLowerCase().includes(query))
}

const handleClose = () => emit('close')
</script>

<template>
  <div class="category-explorer">
    <div class="sticky -top-6 -mt-6 py-2 mb-6 bg-white z-20">
      <div class="relative">
        <span
          class="material-symbols-outlined absolute left-3 top-2.5 transition-colors"
          :class="isSearching ? 'text-blue-500 animate-spin' : 'text-gray-400'"
        >
          {{ isSearching ? 'progress_activity' : 'search' }}
        </span>
        <input
          v-model="searchQuery"
          type="text"
          id="cat-search"
          name="cat-search"
          placeholder="Search categories..."
          class="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>

    <div v-if="filteredResults.length > 0">
      <div
        v-if="categoriesWithChildren.length"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <div
          v-for="(category, index) in categoriesWithChildren"
          :key="category.id"
          class="fade-in-item"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <RouterLink
            :to="`/categories/${category.slug}`"
            @click="handleClose"
            class="font-bold text-gray-900 hover:text-gray-500 block mb-2"
          >
            {{ category.name }}
          </RouterLink>
          <ul class="flex flex-col gap-1">
            <li v-for="sub in getVerifiedSubs(category.id)" :key="sub.id">
              <RouterLink
                :to="`/categories/${sub.slug}`"
                @click="handleClose"
                class="text-sm text-gray-600 hover:bg-gray-200 rounded-sm p-1.5 duration-300 block"
              >
                {{ sub.name }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>

      <div
        v-if="categoriesWithoutChildren.length"
        class="mt-8 pt-6 border-t border-gray-100 fade-in-item"
      >
        <h4 class="text-xs uppercase text-gray-400 font-bold mb-4">
          Other Categories
        </h4>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="category in categoriesWithoutChildren"
            :key="category.id"
            :to="`/categories/${category.slug}`"
            @click="handleClose"
            class="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            {{ category.name }}
          </RouterLink>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-start pt-10 pb-20 text-center fade-in-item"
    >
      <div class="bg-gray-50 p-4 rounded-full mb-4">
        <span class="material-symbols-outlined text-[40px] text-gray-300"
          >search_off</span
        >
      </div>
      <h3 class="text-lg font-bold text-gray-900">No categories found</h3>
      <p class="text-gray-500 text-sm mt-1">
        No matches for "{{ searchQuery }}".
      </p>
      <button
        @click="searchQuery = ''"
        class="mt-4 text-blue-600 font-medium hover:underline"
      >
        Clear Search
      </button>
    </div>
  </div>
</template>
