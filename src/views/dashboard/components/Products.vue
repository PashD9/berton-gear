<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useUtilityStore } from '@/stores/utilityStore'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { useBreadcrumbStore } from '@/stores/breadcrumb'

const breadcrumb = useBreadcrumbStore()
const prodStore = useProductStore()
const catStore = useCategoryStore()
const utils = useUtilityStore()

// --- STATE ---
const activeTab = ref('all')
const searchQuery = ref('')
const selectedItems = ref([])
const bulkPrice = ref(null)
const viewMode = ref('grid')
const filterStatus = ref('All')
const filterOptions = ['All', 'Published', 'Draft', 'Featured', 'Banner']

// --- LIFECYCLE ---
onMounted(async () => {
  breadcrumb.set([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Products' },
  ])
  await prodStore.fetchAllItems()
  if (catStore.categories.length === 0) await catStore.fetchCategories()
})

onUnmounted(() => breadcrumb.clear())

// --- COMPUTED: FILTERING & SELECTION ---
const filteredItems = computed(() => {
  let items = []
  if (activeTab.value === 'all') {
    items = [...prodStore.products, ...prodStore.models, ...prodStore.variants]
  } else {
    items = prodStore[activeTab.value + 's'] || []
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.product_code?.toLowerCase().includes(query),
    )
  }

  switch (filterStatus.value) {
    case 'Published':
      items = items.filter((i) => i.isPublished)
      break
    case 'Draft':
      items = items.filter((i) => !i.isPublished)
      break
    case 'Featured':
      items = items.filter((i) => i.isFeatured)
      break
    case 'Banner':
      items = items.filter((i) => i.isBanner)
      break
  }

  return items.sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
  )
})

const isAllSelected = computed(() => {
  return (
    filteredItems.value.length > 0 &&
    selectedItems.value.length === filteredItems.value.length
  )
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value = []
  } else {
    selectedItems.value = filteredItems.value.map((item) => item.id)
  }
}

// --- HELPERS ---
const getParentName = (item) => {
  if (!item.parentId) return 'N/A'
  if (item.type === 'product') {
    const cat = catStore.categories.find((c) => c.id === item.parentId)
    return cat ? cat.name : 'Unknown Category'
  }
  const parent = [...prodStore.products, ...prodStore.models].find(
    (p) => p.id === item.parentId,
  )
  return parent ? parent.name : 'Unknown Parent'
}

// --- ACTIONS ---
const handleAddChild = (parentItem) => {
  const type = parentItem.type === 'product' ? 'model' : 'variant'
  utils.openCreate(type, { parentId: parentItem.id })
}

const handleEdit = (item) => utils.openEdit(item.type, item)

const confirmBulkUpdate = async () => {
  if (!bulkPrice.value && bulkPrice.value !== 0) return
  if (confirm(`Update price for ${selectedItems.value.length} items?`)) {
    const result = await prodStore.bulkUpdate(selectedItems.value, {
      price: bulkPrice.value,
    })
    if (result.success) {
      selectedItems.value = []
      bulkPrice.value = null
    }
  }
}

const handleBulkAction = async (field, value) => {
  if (
    confirm(`Apply ${field} change to ${selectedItems.value.length} items?`)
  ) {
    const result = await prodStore.bulkUpdate(selectedItems.value, {
      [field]: value,
    })
    if (result.success) selectedItems.value = []
  }
}

const handleTogglePublish = async (item, currentState) => {
  try {
    await prodStore.togglePublish(item, currentState, 'products')
  } catch (err) {
    console.error(err)
  }
}

const handleToggleAttribute = async (item, field) => {
  try {
    await prodStore.updateItem(item.id, { [field]: !item[field] })
  } catch (err) {
    console.error(err)
  }
}

const handleDelete = (item) => {
  const status = utils.getDeletionStatus(item)
  if (!status.canDelete) {
    const msg =
      status.reason === 'active'
        ? 'Cannot delete a published, banner or featured item. Please unpublish it first to protect SEO.'
        : `For safety, items must remain unpublished for 24 hours. Safe to delete in ${status.remaining} hours.`
    utils.triggerToast(msg, 'warning')
    return
  }

  const message = `Are you sure you want to delete "${item.name}"? Any child items (models, variants) will also be permanently deleted. This action cannot be undone.`
  utils.openConfirm(
    'Delete Item',
    message,
    async () => {
      await prodStore.deleteItem(item)
    },
    'Delete',
    'bg-red-600',
  )
}
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="selectedItems.length > 0"
      class="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-2xl flex flex-wrap items-center justify-center gap-4 z-100 border border-slate-700 w-[95vw] md:w-auto"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm font-bold whitespace-nowrap"
          >{{ selectedItems.length }} Selected</span
        >
        <button
          @click="selectedItems = []"
          class="text-slate-400 hover:text-white text-xs font-bold uppercase"
        >
          Cancel
        </button>
      </div>

      <div class="h-6 w-px bg-slate-700 hidden sm:block"></div>

      <div class="flex items-center gap-2">
        <label
          for="bulk-price-input"
          class="text-[10px] uppercase text-slate-400 font-black"
          >Price</label
        >
        <input
          id="bulk-price-input"
          name="bulk_price_field"
          type="number"
          v-model="bulkPrice"
          class="bg-slate-800 border border-slate-700 rounded-md p-2 text-sm outline-none w-24"
        />
        <button
          @click="confirmBulkUpdate"
          class="bg-blue-600 px-3 py-1.5 rounded-sm text-xs font-bold"
        >
          Set
        </button>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-4">
        <div class="flex flex-col gap-1">
          <span
            class="text-[9px] uppercase text-slate-400 font-black text-center"
            >Publish</span
          >
          <div
            class="flex bg-slate-800 rounded-md p-0.5 border border-slate-700"
          >
            <button
              @click="handleBulkAction('isPublished', true)"
              class="px-2 py-1 text-[10px] font-bold rounded-sm hover:bg-slate-700"
            >
              ON
            </button>
            <button
              @click="handleBulkAction('isPublished', false)"
              class="px-2 py-1 text-[10px] font-bold rounded-sm hover:bg-slate-700"
            >
              OFF
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span
            class="text-[9px] uppercase text-slate-400 font-black text-center"
            >Featured</span
          >
          <div
            class="flex bg-slate-800 rounded-md p-0.5 border border-slate-700"
          >
            <button
              @click="handleBulkAction('isFeatured', true)"
              class="px-2 py-1 text-[10px] font-bold rounded-sm hover:text-amber-400"
            >
              YES
            </button>
            <button
              @click="handleBulkAction('isFeatured', false)"
              class="px-2 py-1 text-[10px] font-bold rounded-sm hover:bg-slate-700"
            >
              NO
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span
            class="text-[9px] uppercase text-slate-400 font-black text-center"
            >Banner</span
          >
          <div
            class="flex bg-slate-800 rounded-md p-0.5 border border-slate-700"
          >
            <button
              @click="handleBulkAction('isBanner', true)"
              class="px-2 py-1 text-[10px] font-bold rounded-sm hover:text-purple-400"
            >
              YES
            </button>
            <button
              @click="handleBulkAction('isBanner', false)"
              class="px-2 py-1 text-[10px] font-bold rounded-sm hover:bg-slate-700"
            >
              NO
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <section class="py-5 bg-slate-50 min-h-screen">
    <div class="container h-full flex flex-col">
      <div class="sticky top-10 z-30 bg-slate-50/95 backdrop-blur-sm pt-2 pb-4">
        <div
          class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5"
        >
          <div>
            <h2 class="font-bold text-slate-800">Inventory</h2>
          </div>
          <div class="relative w-full lg:w-96">
            <input
              id="inventory-search-main"
              name="search_query"
              v-model="searchQuery"
              type="text"
              aria-label="Search products"
              placeholder="Search..."
              class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <svg
              class="w-4 h-4 text-slate-400 absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke-width="2"
              />
            </svg>
          </div>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-200"
        >
          <div class="flex items-center gap-3">
            <input
              id="select-all-main"
              name="select_all_checkbox"
              type="checkbox"
              :checked="isAllSelected"
              aria-label="Select all products"
              @change="toggleSelectAll"
              class="w-4 h-4 ml-2 rounded border-slate-300 text-blue-600"
            />
            <div class="flex gap-1">
              <button
                v-for="tab in ['all', 'product', 'model', 'variant']"
                :key="tab"
                @click="activeTab = tab"
                class="px-4 py-1.5 text-xs font-bold capitalize rounded-sm transition-all"
                :class="
                  activeTab === tab
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                "
              >
                {{ tab }}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <select
              id="filter-status-select"
              name="status_filter"
              v-model="filterStatus"
              aria-label="Filter by status"
              class="bg-slate-50 border border-slate-200 py-1.5 pl-3 pr-8 rounded-md text-xs font-bold"
            >
              <option v-for="opt in filterOptions" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
            <div class="flex bg-slate-100 p-1 rounded-md">
              <button
                @click="viewMode = 'grid'"
                aria-label="Grid view"
                :class="
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600'
                    : 'text-slate-400'
                "
                class="p-1.5 rounded-sm shadow-sm"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    stroke-width="2"
                  />
                </svg>
              </button>
              <button
                @click="viewMode = 'list'"
                aria-label="List view"
                :class="
                  viewMode === 'list'
                    ? 'bg-white text-blue-600'
                    : 'text-slate-400'
                "
                class="p-1.5 rounded-sm shadow-sm"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" stroke-width="2" />
                </svg>
              </button>
            </div>
            <button
              @click="utils.openCreate('product')"
              class="bg-blue-600 text-white px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest"
            >
              + Product
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="prodStore.isLoading"
        class="grow flex items-center justify-center min-h-100"
      >
        <div
          class="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"
        ></div>
      </div>

      <div
        v-else
        :class="
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-3 pb-24'
        "
      >
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="group bg-white border border-slate-200 rounded-lg transition-all"
          :class="[
            viewMode === 'grid'
              ? 'hover:shadow-sm flex flex-col relative'
              : 'flex flex-row items-center shadow-sm relative',
            utils.getDeletionStatus(item).reason === 'cooling'
              ? 'border-amber-400!'
              : '',
          ]"
        >
          <div
            class="bg-slate-100 flex items-center justify-center shrink-0 relative"
            :class="
              viewMode === 'grid'
                ? 'h-48 w-full rounded-t-lg overflow-hidden'
                : 'h-24 w-24 border-r border-slate-100 rounded-l-lg overflow-hidden'
            "
          >
            <img
              v-if="item.imageURL"
              :src="item.imageURL"
              class="h-full w-full object-cover transition-all"
              :class="{ grayscale: !item.isPublished }"
            />
            <div v-else class="text-slate-300">
              <svg
                class="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke-width="1.5"
                />
              </svg>
            </div>

            <div
              class="absolute top-2.5 left-2.5 z-10 transition-opacity duration-200"
              :class="
                selectedItems.includes(item.id)
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              "
            >
              <input
                :id="'check-' + item.id"
                :name="'select_item_' + item.id"
                type="checkbox"
                v-model="selectedItems"
                :value="item.id"
                aria-label="Select product"
                class="w-4 h-4 rounded border-slate-300 text-blue-600 bg-white/80"
              />
            </div>

            <div
              v-if="utils.getDeletionStatus(item).reason === 'cooling'"
              class="absolute top-2.5 left-8 z-10 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase shadow-sm flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[10px]"
                >schedule</span
              >
              {{ utils.getDeletionStatus(item).remaining }}h
            </div>

            <!-- Grid View Actions -->
            <div
              v-if="viewMode === 'grid'"
              class="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
            >
              <button
                @click.stop="handleToggleAttribute(item, 'isFeatured')"
                aria-label="Toggle featured status"
                :class="
                  item.isFeatured
                    ? 'text-amber-400 bg-slate-900/90'
                    : 'text-slate-400 bg-white/90'
                "
                class="p-1.5 rounded-full shadow-sm hover:scale-110 transition-all backdrop-blur-sm"
              >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              </button>
              <button
                @click.stop="handleToggleAttribute(item, 'isBanner')"
                aria-label="Toggle banner status"
                :class="
                  item.isBanner
                    ? 'text-purple-400 bg-slate-900/90'
                    : 'text-slate-400 bg-white/90'
                "
                class="p-1.5 rounded-full shadow-sm hover:scale-110 transition-all backdrop-blur-sm"
              >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.923 2.423a1 1 0 01-1.874.694L10.537 15H9.463l-1.352 3.117a1 1 0 01-1.874-.694L7.22 15H5a2 2 0 01-2-2V5zm2 0h10v8H5V5z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <button
                @click.stop="handleTogglePublish(item, item.isPublished)"
                aria-label="Toggle publish status"
                :class="
                  item.isPublished
                    ? 'text-sky-400 bg-slate-900/90'
                    : 'text-slate-400 bg-white/90'
                "
                class="p-1.5 rounded-full shadow-sm hover:scale-110 transition-all backdrop-blur-sm"
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>

            <div
              v-if="!item.isPublished"
              class="absolute bottom-0 left-0 right-0 bg-slate-900/50 text-white text-[9px] font-bold text-center py-0.5 backdrop-blur-sm"
            >
              DRAFT
            </div>
          </div>

          <div
            class="flex flex-col grow min-w-0"
            :class="
              viewMode === 'grid'
                ? 'p-4'
                : 'py-2 px-6 bg-slate-50/40 h-24 justify-center border-r border-slate-100'
            "
          >
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-[8px] font-black uppercase px-2 py-0.5 rounded-sm border"
                :class="
                  item.type === 'product'
                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                    : item.type === 'model'
                      ? 'bg-purple-50 text-purple-600 border-purple-100'
                      : 'bg-green-50 text-green-600 border-green-100'
                "
                >{{ item.type }}</span
              >
              <span class="text-[10px] font-bold text-slate-400 truncate"
                >IN: {{ getParentName(item) }}</span
              >
            </div>
            <h4 class="font-bold text-slate-800 text-sm truncate leading-tight">
              {{ item.name }}
            </h4>
            <div class="text-[10px] text-slate-400 font-mono mt-1">
              {{ item.product_code || 'NO SKU' }}
            </div>
          </div>

          <div
            class="hidden lg:flex items-center gap-6 px-8 shrink-0"
            v-if="viewMode === 'list'"
          >
            <button
              @click="handleToggleAttribute(item, 'isFeatured')"
              aria-label="Toggle featured status"
              :class="item.isFeatured ? 'text-amber-500' : 'text-slate-300'"
              class="hover:scale-110 transition-all"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            </button>
            <button
              @click="handleToggleAttribute(item, 'isBanner')"
              aria-label="Toggle banner status"
              :class="item.isBanner ? 'text-purple-500' : 'text-slate-300'"
              class="hover:scale-110 transition-all"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.923 2.423a1 1 0 01-1.874.694L10.537 15H9.463l-1.352 3.117a1 1 0 01-1.874-.694L7.22 15H5a2 2 0 01-2-2V5zm2 0h10v8H5V5z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <button
              @click="handleTogglePublish(item, item.isPublished)"
              aria-label="Toggle publish status"
              class="h-4 w-8 rounded-full relative transition-colors"
              :class="item.isPublished ? 'bg-sky-500' : 'bg-slate-300'"
            >
              <div
                class="absolute top-0.5 left-0.5 h-3 w-3 bg-white rounded-full transition-transform"
                :class="item.isPublished ? 'translate-x-4' : 'translate-x-0'"
              ></div>
            </button>
          </div>

          <div
            class="flex items-center gap-4 pr-5 ml-auto"
            :class="viewMode === 'grid' ? 'px-4 pb-5 pt-1' : ''"
          >
            <div class="text-right">
              <div
                v-if="item.isCallForPrice"
                class="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100 uppercase"
              >
                Quote
              </div>
              <div v-else class="text-base font-black text-slate-700">
                {{ utils.formatCurrency(item.price) }}
              </div>
            </div>

            <Menu as="div" class="relative">
              <MenuButton
                class="p-2 rounded-md hover:bg-slate-100 text-slate-400"
                ><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
                  /></svg
              ></MenuButton>
              <transition
                enter-active-class="transition duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition duration-75"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <MenuItems
                  class="absolute right-0 bottom-full mb-2 w-48 origin-bottom-right rounded-lg bg-white shadow-xl ring-1 ring-black/5 z-60 border border-slate-100 p-1"
                >
                  <MenuItem
                    v-if="['product', 'model'].includes(item.type)"
                    v-slot="{ active }"
                    ><button
                      @click="handleAddChild(item)"
                      :class="[
                        active
                          ? 'bg-green-50 text-green-700'
                          : 'text-slate-700',
                        'flex w-full px-4 py-2 text-[10px] font-black uppercase rounded-sm',
                      ]"
                    >
                      {{ item.type === 'product' ? '+ MODEL' : '+ VARIANT' }}
                    </button></MenuItem
                  >
                  <MenuItem v-slot="{ active }"
                    ><button
                      @click="handleEdit(item)"
                      :class="[
                        active ? 'bg-blue-50 text-blue-700' : 'text-slate-700',
                        'flex w-full px-4 py-2 text-[12px] font-black uppercase rounded-sm',
                      ]"
                    >
                      Edit
                    </button></MenuItem
                  >
                  <div class="h-px bg-slate-100 my-1"></div>
                  <MenuItem v-slot="{ active }">
                    <button
                      @click="handleDelete(item)"
                      :disabled="!utils.getDeletionStatus(item).canDelete"
                      :class="[
                        active ? 'bg-red-50 text-red-700' : 'text-red-600',
                        'flex w-full px-4 py-2 text-[12px] font-black uppercase rounded-sm items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed',
                      ]"
                    >
                      <span>Delete</span>
                      <span
                        v-if="!utils.getDeletionStatus(item).canDelete"
                        class="material-symbols-outlined text-sm"
                        >{{
                          utils.getDeletionStatus(item).reason === 'active'
                            ? 'lock'
                            : 'schedule'
                        }}</span
                      >
                    </button>
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 150%);
  opacity: 0;
}
</style>
