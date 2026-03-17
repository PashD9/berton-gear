<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoryStore } from '@/stores/categoryStore'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import { useUtilityStore } from '@/stores/utilityStore'
import { useRoute } from 'vue-router'

const catStore = useCategoryStore()
const breadcrumb = useBreadcrumbStore()
const utils = useUtilityStore()
const route = useRoute()
const isManualSlug = ref(false)

const { saveStatus, activeCategory } = storeToRefs(catStore)

onMounted(async () => {
  await catStore.setCategoryForEdit(route.params.id)
  if (activeCategory.value) {
    breadcrumb.set([{ label: 'Edit' }, { label: activeCategory.value.name }])

    updateBreadcrumbs()
  }
})

watch(
  activeCategory.value,
  (newActive) => {
    breadcrumb.set([{ label: 'Edit' }, { label: newActive.name }])
  },
  { immediate: true },
)

const updateBreadcrumbs = () => {
  if (activeCategory.value) {
    breadcrumb.set([{ label: 'Edit' }, { label: activeCategory.value.name }])
  }
}

const handleNameInput = async () => {
  if (activeCategory.value.isPublished || isManualSlug.value) return

  // Standard auto-gen logic
  let baseSlug = utils.generateSlug(activeCategory.value.name)

  const unique = await utils.isSlugUnique(
    'categories',
    baseSlug,
    activeCategory.value.id,
  )
  activeCategory.value.slug = unique
    ? baseSlug
    : `${baseSlug}-${Math.floor(Math.random() * 1000)}`

  catStore.updateCategory(activeCategory.value.id, {
    name: activeCategory.value.name,
    slug: activeCategory.value.slug,
  })
}

const handleManualSlugChange = async () => {
  // Clean the manual input to ensure no spaces/weird chars
  activeCategory.value.slug = utils.generateSlug(activeCategory.value.slug)

  catStore.updateCategory(activeCategory.value.id, {
    slug: activeCategory.value.slug,
  })
}

const unpublishForEdit = () => {
  if (
    confirm(
      'This category will be hidden from the frontend (503 status). Unpublish now?',
    )
  ) {
    activeCategory.value.isPublished = false
    catStore.updateCategory(activeCategory.value.id, { isPublished: false })
  }
}

const publishCategory = () => {
  activeCategory.value.isPublished = true
  catStore.updateCategory(activeCategory.value.id, { isPublished: true })
}

const keywordsString = computed({
  get() {
    return activeCategory.value.keywords
      ? activeCategory.value.keywords.join(', ')
      : ''
  },
  set(val) {
    activeCategory.value.keywords = val
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k)
  },
})
</script>

<template>
  <section class="py-10 min-h-screen bg-slate-50">
    <div class="container">
      <div v-if="activeCategory.id" class="max-w-3xl mx-auto">
        <div
          v-if="activeCategory.isPublished"
          class="bg-slate-900 rounded-xl p-12 text-center shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-300"
        >
          <div
            class="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <svg
              class="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <h2
            class="text-2xl font-bold text-white mb-2 uppercase tracking-tighter"
          >
            Category is Live
          </h2>
          <p class="text-slate-400 text-sm max-w-sm mx-auto mb-8">
            This category is currently published on the frontend. To prevent SEO
            breaks, editing is restricted.
          </p>
          <button
            type="button"
            @click="unpublishForEdit"
            class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-sm font-bold text-[11px] uppercase tracking-widest transition-all"
          >
            Unpublish to Edit
          </button>
        </div>

        <div
          v-else
          class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8"
        >
          <div
            class="flex justify-between items-center border-b border-slate-100 pb-6"
          >
            <div>
              <h3 class="text-xl font-bold text-slate-800">Edit Mode</h3>
              <p
                class="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest"
              >
                Unpublished Draft
              </p>
            </div>

            <div class="flex items-center gap-4">
              <span
                aria-live="polite"
                :class="
                  saveStatus === 'Synced'
                    ? 'text-green-600 bg-green-50'
                    : 'text-blue-600 bg-blue-50'
                "
                class="text-[10px] font-bold px-3 py-1 rounded-full uppercase"
              >
                {{ saveStatus }}
              </span>
              <button
                type="button"
                @click="publishCategory"
                class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Go Live
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-10">
            <div class="space-y-6">
              <div>
                <label
                  for="category-name"
                  class="block text-[10px] font-bold text-slate-500 uppercase mb-2"
                  >Category Name</label
                >
                <input
                  id="category-name"
                  name="category_name"
                  v-model="activeCategory.name"
                  @input="handleNameInput"
                  type="text"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:bg-white transition-all outline-none"
                />
                <p class="text-[10px] text-slate-400 mt-2 font-mono">
                  /categories/{{ activeCategory.slug }}
                </p>
              </div>
              <div>
                <div class="flex justify-between items-center mb-2">
                  <label
                    for="category-slug"
                    class="block text-[10px] font-bold text-slate-500 uppercase"
                    >Slug / URL Path</label
                  >
                  <button
                    type="button"
                    @click="isManualSlug = !isManualSlug"
                    class="text-[9px] font-bold text-blue-600 uppercase hover:underline"
                  >
                    {{ isManualSlug ? 'Auto-Generate' : 'Edit Manually' }}
                  </button>
                </div>

                <input
                  id="category-slug"
                  name="category_slug"
                  v-model="activeCategory.slug"
                  :disabled="activeCategory.isPublished || !isManualSlug"
                  @input="handleManualSlugChange"
                  type="text"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-sm font-mono text-xs outline-none focus:bg-white disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  for="category-description"
                  class="block text-[10px] font-bold text-slate-500 uppercase mb-2"
                  >Description</label
                >
                <textarea
                  id="category-description"
                  name="category_description"
                  v-model="activeCategory.description"
                  rows="4"
                  @input="utils.autoResize"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none resize-none focus:bg-white"
                ></textarea>
              </div>

              <div>
                <label
                  for="category-keywords"
                  class="block text-[10px] font-bold text-slate-500 uppercase mb-2"
                  >Keywords (Comma Separated)</label
                >
                <input
                  id="category-keywords"
                  name="category_keywords"
                  v-model="keywordsString"
                  type="text"
                  placeholder="e.g. pump, water, industrial"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:bg-white transition-all outline-none"
                />
              </div>

              <div class="grid grid-cols-1 gap-3">
                <label
                  for="category-featured"
                  class="flex items-center justify-between p-4 border border-slate-100 rounded-lg cursor-pointer hover:border-blue-200 transition-all group"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="p-2 bg-amber-50 text-amber-500 rounded-sm group-hover:scale-110 transition-transform"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                        />
                      </svg>
                    </div>
                    <span class="text-xs font-bold text-slate-700 uppercase"
                      >Featured Category</span
                    >
                  </div>
                  <input
                    id="category-featured"
                    name="category_featured"
                    type="checkbox"
                    v-model="activeCategory.isFeatured"
                    @change="
                      catStore.updateCategory(activeCategory.id, {
                        isFeatured: activeCategory.isFeatured,
                      })
                    "
                    class="w-5 h-5 accent-blue-600"
                  />
                </label>

                <label
                  for="category-banner"
                  class="flex items-center justify-between p-4 border border-slate-100 rounded-lg cursor-pointer hover:border-blue-200 transition-all group"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="p-2 bg-blue-50 text-blue-500 rounded-sm group-hover:scale-110 transition-transform"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1-0 01-1-1v-6z"
                          stroke-width="2"
                          stroke-linecap="round"
                        />
                      </svg>
                    </div>
                    <span class="text-xs font-bold text-slate-700 uppercase"
                      >Promote to Banner</span
                    >
                  </div>
                  <input
                    id="category-banner"
                    name="category_banner"
                    type="checkbox"
                    v-model="activeCategory.isBanner"
                    @change="
                      catStore.updateCategory(activeCategory.id, {
                        isBanner: activeCategory.isBanner,
                      })
                    "
                    class="w-5 h-5 accent-blue-600"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-20">
        <div
          class="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"
        ></div>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Fetching category data...
        </p>
      </div>
    </div>
  </section>
</template>
