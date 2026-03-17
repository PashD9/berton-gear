<script setup>
import CategoryCard from '@/components/cards/CategoryCard.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useUtilityStore } from '@/stores/utilityStore'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const breadcrumb = useBreadcrumbStore()
const catStore = useCategoryStore()
const utils = useUtilityStore()
const router = useRouter()

const searchQuery = ref('')
const selectedItems = ref(new Set())
const filterStatus = ref('All')
const filterOptions = ['All', 'Published', 'Draft', 'Featured', 'Banner']
const sortBy = ref('Name (A-Z)')
const sortOptions = ['Name (A-Z)', 'Name (Z-A)', 'Newest', 'Oldest']
const parentPage = ref(1)
const subPage = ref(1)
const itemsPerPage = 8
const searchPage = ref(1)
const viewMode = ref('grid')
const activeParentFilter = ref(null)

const showParentCategories = ref(true)
const showSubCategories = ref(true)

onMounted(() => {
  breadcrumb.set([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Categories' },
  ])
  catStore.fetchCategories()
})

onUnmounted(() => {
  breadcrumb.clear()
  if (catStore.stopListener) catStore.stopListener()
})

const applyFilters = (items) => {
  let result = items
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((c) => c.name.toLowerCase().includes(query))
  }
  switch (filterStatus.value) {
    case 'Published':
      return result.filter((c) => c.isPublished)
    case 'Draft':
      return result.filter((c) => !c.isPublished)
    case 'Featured':
      return result.filter((c) => c.isFeatured)
    case 'Banner':
      return result.filter((c) => c.isBanner)
    default:
      return result
  }
}

const processItems = (items) => {
  let result = [...applyFilters(items)]

  // Sorting
  return result.sort((a, b) => {
    if (sortBy.value === 'Name (A-Z)') return a.name.localeCompare(b.name)
    if (sortBy.value === 'Name (Z-A)') return b.name.localeCompare(a.name)

    const getDate = (d) => {
      if (!d) return 0
      if (typeof d.seconds === 'number') return d.seconds * 1000
      const date = new Date(d)
      return !isNaN(date.getTime()) ? date.getTime() : 0
    }

    const dateA = getDate(a.createdAt)
    const dateB = getDate(b.createdAt)

    if (sortBy.value === 'Newest') return dateB - dateA
    if (sortBy.value === 'Oldest') return dateA - dateB
    return 0
  })
}

const isSearching = computed(() => searchQuery.value.trim().length > 0)

const unifiedResults = computed(() => {
  if (!isSearching.value) return []
  return processItems(catStore.categories)
})

const processedParentCategories = computed(() =>
  processItems(catStore.parentCategories),
)
const processedSubCategories = computed(() => {
  let items = catStore.subCategories
  if (activeParentFilter.value) {
    items = items.filter((s) => s.parentId === activeParentFilter.value)
  }
  return processItems(items)
})

const parentTotalPages = computed(
  () => Math.ceil(processedParentCategories.value.length / itemsPerPage) || 1,
)
const subTotalPages = computed(
  () => Math.ceil(processedSubCategories.value.length / itemsPerPage) || 1,
)

const paginatedParentCategories = computed(() => {
  const start = (parentPage.value - 1) * itemsPerPage
  return processedParentCategories.value.slice(start, start + itemsPerPage)
})

const paginatedSubCategories = computed(() => {
  const start = (subPage.value - 1) * itemsPerPage
  return processedSubCategories.value.slice(start, start + itemsPerPage)
})

const paginatedUnifiedResults = computed(() => {
  const start = (searchPage.value - 1) * itemsPerPage
  return unifiedResults.value.slice(start, start + itemsPerPage)
})

const searchTotalPages = computed(
  () => Math.ceil(unifiedResults.value.length / itemsPerPage) || 1,
)

const allFilteredIds = computed(() => {
  if (isSearching.value) return unifiedResults.value.map((c) => c.id)
  return [
    ...processedParentCategories.value.map((c) => c.id),
    ...processedSubCategories.value.map((c) => c.id),
  ]
})

const isAllSelected = computed({
  get: () =>
    allFilteredIds.value.length > 0 &&
    allFilteredIds.value.every((id) => selectedItems.value.has(id)),
  set: (val) => {
    if (val) allFilteredIds.value.forEach((id) => selectedItems.value.add(id))
    else selectedItems.value.clear()
  },
})

const handleEdit = (category) => {
  router.push(`/dashboard/categories/edit/${category.id}`)
}

// NEW: Trigger Product Creation Modal with pre-selected Category
const handleAddItem = (data) => {
  // We call your create utility for 'product' and pass the category.id
  // This ensures the product is born inside this category/subcategory
  utils.openCreate('product', data)
}

const handleDelete = (category) => {
  const status = utils.getDeletionStatus(category)
  if (!status.canDelete) {
    const msg =
      status.reason === 'active'
        ? 'Cannot delete a published, banner or featured item. Please unpublish it first to protect SEO.'
        : `For safety, items must remain unpublished for 24 hours. Safe to delete in ${status.remaining} hours.`
    utils.triggerToast(msg, 'warning')
    return
  }

  const msg = `Are you sure you want to delete "${category.name}"? This will permanently delete this category, all its sub-categories, and every product linked to them.`

  utils.openConfirm(
    'Delete Category?',
    msg,
    async () => {
      await catStore.deleteCategoryWithChildren(category.id)
    },
    'Delete',
    'bg-red-600',
  )
}

const toggleSelection = (id) => {
  if (selectedItems.value.has(id)) selectedItems.value.delete(id)
  else selectedItems.value.add(id)
}

const clearSelection = () => selectedItems.value.clear()

const handleBulkDelete = () => {
  utils.openConfirm(
    'Delete Selected Items?',
    `This will permanently delete ${selectedItems.value.size} categories.`,
    async () => {
      const ids = Array.from(selectedItems.value)
      let skippedCount = 0

      for (const id of ids) {
        const cat = catStore.categories.find((c) => c.id === id)
        if (!cat) continue

        const status = utils.getDeletionStatus(cat)
        if (!status.canDelete) {
          skippedCount++
          continue
        }

        await catStore.deleteCategoryWithChildren(id)
      }
      selectedItems.value.clear()
      if (skippedCount > 0) {
        utils.triggerToast(
          `${skippedCount} items were skipped because they are active or were modified less than 24h ago.`,
          'warning',
        )
      }
    },
  )
}

const handleBulkToggle = async (field) => {
  const ids = Array.from(selectedItems.value)
  const updates = ids.map((id) => {
    const cat = catStore.categories.find((c) => c.id === id)
    if (cat) {
      return catStore.updateCategory(id, { [field]: !cat[field] })
    }
    return Promise.resolve()
  })

  await Promise.all(updates)
  selectedItems.value.clear()
}

const toggleField = async (category, field) => {
  const newValue = !category[field]

  if (
    (field === 'isBanner' || field === 'isFeatured') &&
    newValue &&
    !category.isPublished
  ) {
    utils.triggerToast(
      `Category must be published to be set as ${field === 'isBanner' ? 'Banner' : 'Featured'}.`,
      'error',
    )
    return
  }

  if (field === 'isBanner') {
    if (newValue) {
      const currentBanner = catStore.categories.find(
        (c) => c.isBanner && c.id !== category.id,
      )
      if (currentBanner) {
        utils.openConfirm(
          'Replace Current Banner?',
          'Only one category can be the Banner. Replace current banner?',
          async () => {
            await catStore.setAsBanner(category.id)
          },
          'Replace',
          'bg-blue-600',
        )
      } else {
        await catStore.setAsBanner(category.id)
      }
    } else {
      await catStore.updateCategory(category.id, { isBanner: false })
    }
    return
  }

  // This handles turning 'isBanner' OFF, setting the first banner, and toggling 'isFeatured'.
  try {
    await catStore.updateCategory(category.id, { [field]: newValue })
  } catch (error) {
    console.error(`Failed to update ${field}`, error)
  }
}

watch([searchQuery, filterStatus, sortBy], () => {
  parentPage.value = 1
  subPage.value = 1
  searchPage.value = 1
})

watch(activeParentFilter, () => {
  subPage.value = 1
  if (activeParentFilter.value) {
    showSubCategories.value = true
  }
})
</script>

<template>
  <section class="py-5 bg-slate-50 min-h-screen">
    <div
      v-if="catStore.loading"
      class="container flex flex-col items-center justify-center py-20 gap-4"
    >
      <div
        class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Loading Categories...
      </p>
    </div>

    <div
      v-else
      class="container space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <!-- Toolbar -->
      <div class="sticky top-10 z-30 w-full min-w-0">
        <div
          class="bg-white p-3 border border-slate-200 rounded-lg flex flex-col gap-3 transition-all duration-200 relative z-20"
        >
          <div class="flex items-center gap-3 w-full">
            <div
              class="flex items-center gap-2 border-r border-slate-200 pr-3 shrink-0"
            >
              <input
                type="checkbox"
                id="select-all-items"
                name="select_all_items"
                v-model="isAllSelected"
                class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                aria-label="Select all categories"
              />
              <label
                for="select-all-items"
                class="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline-block"
                >All</label
              >
            </div>

            <div class="relative grow min-w-0">
              <input
                id="toolbar-search"
                name="search_query"
                v-model="searchQuery"
                type="text"
                aria-label="Search categories"
                placeholder="Search categories..."
                class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <svg
                class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap gap-2 grow md:grow-0">
              <div class="relative grow md:grow-0">
                <select
                  id="filter-status"
                  name="filter_status"
                  v-model="filterStatus"
                  aria-label="Filter by status"
                  class="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-md text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option v-for="opt in filterOptions" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
                <div
                  class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500"
                >
                  <svg
                    class="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <div class="relative grow md:grow-0">
                <select
                  id="sort-by"
                  name="sort_by"
                  v-model="sortBy"
                  aria-label="Sort categories"
                  class="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-md text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option v-for="opt in sortOptions" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
                <div
                  class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500"
                >
                  <svg
                    class="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 ml-auto">
              <div
                class="flex bg-slate-100 p-0.5 rounded border border-slate-200 shrink-0"
              >
                <button
                  @click="viewMode = 'grid'"
                  aria-label="Grid view"
                  :class="
                    viewMode === 'grid'
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-slate-400 hover:text-slate-600'
                  "
                  class="p-1 rounded transition-all"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    ></path>
                  </svg>
                </button>
                <button
                  @click="viewMode = 'list'"
                  aria-label="List view"
                  :class="
                    viewMode === 'list'
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-slate-400 hover:text-slate-600'
                  "
                  class="p-1 rounded transition-all"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    ></path>
                  </svg>
                </button>
              </div>

              <div class="flex gap-2" v-if="selectedItems.size === 0">
                <button
                  @click="utils.openCreate('category', null)"
                  class="bg-blue-600 text-white px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 shadow-sm transition-all"
                >
                  + Parent
                </button>
                <button
                  @click="utils.openCreate('subcategory')"
                  class="bg-slate-800 text-white px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 shadow-sm transition-all whitespace-nowrap hidden sm:block"
                >
                  + Sub
                </button>
                <button
                  @click="utils.openCreate('subcategory')"
                  class="bg-slate-800 text-white px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 shadow-sm transition-all sm:hidden"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="transform -translate-y-4 opacity-0 pointer-events-none"
          enter-to-class="transform translate-y-0 opacity-100 pointer-events-auto"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="transform translate-y-0 opacity-100 pointer-events-auto"
          leave-to-class="transform -translate-y-4 opacity-0 pointer-events-none"
        >
          <div
            v-if="selectedItems.size > 0"
            class="absolute top-full left-0 w-full bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-lg flex flex-wrap items-center gap-2 p-3 z-10"
          >
            <div class="flex items-center gap-2 mr-auto">
              <span
                class="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full"
                >{{ selectedItems.size }}</span
              >
              <span
                class="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline"
                >Selected</span
              >
            </div>

            <button
              @click="handleBulkToggle('isBanner')"
              class="bg-white border border-slate-200 text-blue-600 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-50 transition-colors"
            >
              Banner
            </button>
            <button
              @click="handleBulkToggle('isFeatured')"
              class="bg-white border border-slate-200 text-amber-600 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-amber-50 transition-colors"
            >
              Featured
            </button>
            <button
              @click="handleBulkDelete"
              class="bg-white border border-slate-200 text-red-600 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-colors"
            >
              Delete
            </button>

            <button
              @click="clearSelection"
              aria-label="Clear selection"
              class="text-slate-400 hover:text-slate-600 px-2 py-1.5"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </Transition>
      </div>

      <!-- Unified Search Results -->
      <section v-if="isSearching">
        <div v-if="unifiedResults.length > 0">
          <h3 class="text-xl font-bold text-slate-800 mb-6">
            Search Results for "{{ searchQuery }}"
          </h3>

          <div
            :class="
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-4 list-view'
            "
          >
            <div
              v-for="item in paginatedUnifiedResults"
              :key="item.id"
              class="relative group"
            >
              <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
                <input
                  type="checkbox"
                  :id="'select-search-' + item.id"
                  :name="'select_search_' + item.id"
                  :checked="selectedItems.has(item.id)"
                  @change="toggleSelection(item.id)"
                  aria-label="Select category"
                  :class="
                    selectedItems.has(item.id)
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  "
                  class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm bg-white/80 backdrop-blur-sm transition-opacity"
                />
                <div
                  class="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    @click.stop.prevent="toggleField(item, 'isBanner')"
                    aria-label="Toggle banner status"
                    :class="
                      item.isBanner
                        ? 'text-blue-600 bg-blue-50 shadow-[0_0_8px_rgba(37,99,235,0.4)] border-blue-200'
                        : 'text-slate-300 border-transparent hover:text-slate-500 hover:bg-slate-50'
                    "
                    class="p-2 rounded-full border transition-all duration-200"
                    title="Toggle Banner"
                  >
                    <span class="material-symbols-outlined text-xl!"
                      >landscape</span
                    >
                  </button>
                  <button
                    @click.stop.prevent="toggleField(item, 'isFeatured')"
                    aria-label="Toggle featured status"
                    :class="
                      item.isFeatured
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-400 border-slate-200'
                    "
                    class="px-3 py-1.5 rounded-full shadow-md border text-[10px] font-bold uppercase tracking-wider w-28 text-center transition-colors hover:scale-105"
                  >
                    {{ item.isFeatured ? 'Featured' : 'Not Featured' }}
                  </button>
                </div>
              </div>
              <CategoryCard
                :category="item"
                :isAdmin="true"
                :view-mode="viewMode"
                @edit="handleEdit"
                @delete="handleDelete"
                @add-item="handleAddItem"
                @create-sub="(data) => utils.openCreate('subcategory', data)"
              />
            </div>
          </div>

          <!-- Search Pagination -->
          <div
            v-if="unifiedResults.length > itemsPerPage"
            class="flex justify-center items-center gap-4 pt-6"
          >
            <button
              @click="searchPage--"
              :disabled="searchPage === 1"
              class="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span class="text-sm text-slate-500 font-medium"
              >Page {{ searchPage }} of {{ searchTotalPages }}</span
            >
            <button
              @click="searchPage++"
              :disabled="searchPage === searchTotalPages"
              class="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center py-20 text-center opacity-60"
        >
          <div class="bg-slate-100 p-4 rounded-full mb-4">
            <svg
              class="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-700 mb-1">
            No categories found
          </h3>
          <p class="text-sm text-slate-500">
            We couldn't find any matches for "{{ searchQuery }}"
          </p>
          <button
            @click="searchQuery = ''"
            class="mt-4 text-blue-600 font-bold text-xs uppercase hover:underline"
          >
            Clear Search
          </button>
        </div>
      </section>

      <div v-else class="space-y-12">
        <section>
          <div
            class="flex items-center gap-4 mb-6 cursor-pointer group select-none"
            @click="showParentCategories = !showParentCategories"
          >
            <button
              class="p-1 rounded-full bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-all duration-300"
              :class="{ '-rotate-90': !showParentCategories }"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-slate-800 tracking-tighter">
                Main Categories
              </h3>
              <p
                class="text-xs text-slate-500 font-medium uppercase tracking-wider"
              >
                Top-level navigation
              </p>
            </div>
          </div>

          <div v-show="showParentCategories">
            <div
              :class="
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2  xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-4 list-view'
              "
            >
              <div
                v-for="cat in paginatedParentCategories"
                :key="cat.id"
                class="relative group"
              >
                <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
                  <input
                    type="checkbox"
                    :id="'select-cat-' + cat.id"
                    :name="'select_cat_' + cat.id"
                    :checked="selectedItems.has(cat.id)"
                    @change="toggleSelection(cat.id)"
                    aria-label="Select category"
                    :class="
                      selectedItems.has(cat.id)
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    "
                    class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm bg-white/80 backdrop-blur-sm transition-opacity"
                  />
                  <div
                    class="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      @click.stop.prevent="toggleField(cat, 'isBanner')"
                      aria-label="Toggle banner status"
                      :class="
                        cat.isBanner
                          ? 'text-blue-600 bg-blue-50 shadow-[0_0_8px_rgba(37,99,235,0.4)] border-blue-200'
                          : 'text-slate-300 border-transparent hover:text-slate-500 hover:bg-slate-50'
                      "
                      class="p-2 rounded-full border transition-all duration-200"
                      title="Toggle Banner"
                    >
                      <span class="material-symbols-outlined text-xl!"
                        >landscape</span
                      >
                    </button>
                    <button
                      @click.stop.prevent="toggleField(cat, 'isFeatured')"
                      aria-label="Toggle featured status"
                      :class="
                        cat.isFeatured
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-400 border-slate-200'
                      "
                      class="px-3 py-1.5 rounded-full shadow-md border text-[10px] font-bold uppercase tracking-wider w-28 text-center transition-colors hover:scale-105"
                    >
                      {{ cat.isFeatured ? 'Featured' : 'Not Featured' }}
                    </button>
                    <button
                      @click.stop.prevent="activeParentFilter = cat.id"
                      aria-label="View subcategories"
                      class="bg-white text-slate-600 border-slate-200 px-3 py-1.5 rounded-full shadow-md border text-[10px] font-bold uppercase tracking-wider w-28 text-center transition-colors hover:scale-105 hover:bg-slate-50 hover:text-blue-600"
                    >
                      View Subs
                    </button>
                  </div>
                </div>
                <CategoryCard
                  :category="cat"
                  :isAdmin="true"
                  :view-mode="viewMode"
                  @edit="handleEdit"
                  @delete="handleDelete"
                  @add-item="handleAddItem"
                  @create-sub="(data) => utils.openCreate('subcategory', data)"
                />
              </div>
            </div>

            <!-- Parent Pagination -->
            <div
              v-if="processedParentCategories.length > 0"
              class="flex justify-center items-center gap-4 pt-6"
            >
              <button
                @click="parentPage--"
                :disabled="parentPage === 1"
                class="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span class="text-sm text-slate-500 font-medium"
                >Page {{ parentPage }} of {{ parentTotalPages }}</span
              >
              <button
                @click="parentPage++"
                :disabled="parentPage === parentTotalPages"
                class="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <div class="h-px bg-slate-200"></div>

        <section>
          <div
            class="flex items-center gap-4 mb-6 cursor-pointer group select-none"
            @click="showSubCategories = !showSubCategories"
          >
            <button
              class="p-1 rounded-full bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-all duration-300"
              :class="{ '-rotate-90': !showSubCategories }"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="text-2xl font-bold text-slate-800 tracking-tighter">
                  Subcategories
                </h3>
                <div
                  v-if="activeParentFilter"
                  class="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold animate-in fade-in zoom-in duration-200"
                >
                  <span>Filtered by Parent</span>
                  <button
                    @click.stop="activeParentFilter = null"
                    aria-label="Clear parent filter"
                    class="hover:text-blue-900 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                  >
                    <svg
                      class="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <p
                class="text-xs text-slate-500 font-medium uppercase tracking-wider"
              >
                {{
                  activeParentFilter
                    ? 'Showing children of selected parent'
                    : 'Nested navigation items'
                }}
              </p>
            </div>
          </div>

          <div v-show="showSubCategories">
            <div
              :class="
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2  xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-4 list-view'
              "
            >
              <div
                v-for="sub in paginatedSubCategories"
                :key="sub.id"
                class="relative group"
              >
                <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
                  <input
                    type="checkbox"
                    :id="'select-sub-' + sub.id"
                    :name="'select_sub_' + sub.id"
                    :checked="selectedItems.has(sub.id)"
                    @change="toggleSelection(sub.id)"
                    aria-label="Select subcategory"
                    :class="
                      selectedItems.has(sub.id)
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    "
                    class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm bg-white/80 backdrop-blur-sm transition-opacity"
                  />
                  <div
                    class="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      @click.stop.prevent="toggleField(sub, 'isBanner')"
                      aria-label="Toggle banner status"
                      :class="
                        sub.isBanner
                          ? 'text-blue-600 bg-blue-50 shadow-[0_0_8px_rgba(37,99,235,0.4)] border-blue-200'
                          : 'text-slate-300 border-transparent hover:text-slate-500 hover:bg-slate-50'
                      "
                      class="p-2 rounded-full border transition-all duration-200"
                      title="Toggle Banner"
                    >
                      <span class="material-symbols-outlined text-xl!"
                        >landscape</span
                      >
                    </button>
                    <button
                      @click.stop.prevent="toggleField(sub, 'isFeatured')"
                      aria-label="Toggle featured status"
                      :class="
                        sub.isFeatured
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-400 border-slate-200'
                      "
                      class="px-3 py-1.5 rounded-full shadow-md border text-[10px] font-bold uppercase tracking-wider w-28 text-center transition-colors hover:scale-105"
                    >
                      {{ sub.isFeatured ? 'Featured' : 'Not Featured' }}
                    </button>
                  </div>
                </div>
                <CategoryCard
                  :category="sub"
                  :isAdmin="true"
                  :view-mode="viewMode"
                  @edit="handleEdit"
                  @delete="handleDelete"
                  @add-item="handleAddItem"
                  @create-sub="(data) => utils.openCreate('subcategory', data)"
                />
              </div>
            </div>
          </div>

          <!-- Sub Pagination -->
          <div
            v-if="processedSubCategories.length > 0"
            class="flex justify-center items-center gap-4 pt-6"
          >
            <button
              @click="subPage--"
              :disabled="subPage === 1"
              class="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span class="text-sm text-slate-500 font-medium"
              >Page {{ subPage }} of {{ subTotalPages }}</span
            >
            <button
              @click="subPage++"
              :disabled="subPage === subTotalPages"
              class="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style>
.list-view .group > *:not(.absolute) {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  width: 100%;
  gap: 1.5rem;
}
</style>
