<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUtilityStore } from '@/stores/utilityStore'
import { useSectionStore } from '@/stores/sectionStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useMediaStore } from '@/stores/mediaStore'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import BaseModal from '@/components/modal/BaseModal.vue'
import MediaUpload from './components/MediaUpload.vue'
import SectionRenderer from '@/components/SectionRenderer.vue'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import draggable from 'vuedraggable'
import 'trix/dist/trix.css'
import Trix from 'trix'

const breadcrumb = useBreadcrumbStore()

const utils = useUtilityStore()
const sectionStore = useSectionStore()
const catStore = useCategoryStore()
const mediaStore = useMediaStore()

// --- TOOLBAR STATE ---
const searchQuery = ref('')
const filterStatus = ref('All')
const filterPage = ref('All')
const sortBy = ref('Newest')
const viewMode = ref('list')
const selectedItems = ref(new Set())

onMounted(() => {
  breadcrumb.set([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Sections' },
  ])
})

onUnmounted(() => {
  breadcrumb.clear()
  sectionStore.stopListener()
})

const filterOptions = ['All', 'Marketing', 'Sales', 'Information', 'Navigation']
const pageOptions = ['All', 'Home', 'About', 'Services', 'Global']
const sortOptions = ['Newest', 'Oldest', 'Order (Asc)', 'Order (Desc)']

// --- MODAL STATE ---
const isModalOpen = ref(false)
const modalTab = ref('editor')
const isDeleteModalOpen = ref(false)
const sectionToDelete = ref(null)
const imageFile = ref(null) // Store the file for upload
const editingSection = ref({
  name: '',
  handle: '',
  component: 'HeroBanner',
  type: 'Marketing',
  sortOrder: 0,
  page: 'Home',
  isActive: true,
  content: {},
})

// --- ACTIONS ---
const openEdit = (section) => {
  editingSection.value = JSON.parse(JSON.stringify(section)) // Deep clone
  modalTab.value = 'editor'
  imageFile.value = null // Reset file
  if (editingSection.value.component === 'AboutUs') {
    if (!editingSection.value.content.styling) {
      editingSection.value.content.styling = { backgroundColor: 'bg-white' }
    }
    if (!editingSection.value.content.aspectRatio) {
      editingSection.value.content.aspectRatio = 'aspect-video'
    }
    if (editingSection.value.content.borderRadius === undefined) {
      editingSection.value.content.borderRadius = 'rounded-lg'
    }
    if (editingSection.value.content.hasShadow === undefined) {
      editingSection.value.content.hasShadow = true
    }
  }

  if (!editingSection.value.content) editingSection.value.content = {}
  if (editingSection.value.content.showTitle === undefined)
    editingSection.value.content.showTitle = true

  if (editingSection.value.component === 'HeroBanner') {
    if (!editingSection.value.content.slides) {
      const oldContent = editingSection.value.content
      editingSection.value.content = {
        slides: [
          {
            title: oldContent.title || '',
            subtitle: oldContent.subtitle || '',
            imageURL: oldContent.imageURL || '',
            buttonText: oldContent.buttonText || '',
            buttonLink: '',
            textColor: oldContent.textColor || 'text-white',
            overlayOpacity: oldContent.overlayOpacity || 'bg-slate-900/60',
            textAlignment: oldContent.textAlignment || 'center',
          },
        ],
      }
    }

    if (editingSection.value.component === 'FooterSection') {
      if (!editingSection.value.content.columns) {
        editingSection.value.content.columns = [
          { type: 'brand', title: '' },
          { type: 'nav', title: 'Navigation', group: '' },
          { type: 'contact', title: 'Get in Touch' },
        ]
      }
    }

    // Ensure each slide has a unique ID for drag-and-drop
    if (editingSection.value.content.slides) {
      editingSection.value.content.slides.forEach((slide) => {
        if (!slide._id) slide._id = Math.random().toString(36).substr(2, 9)
      })
    }
  }

  if (!editingSection.value.page) editingSection.value.page = 'Home'
  isModalOpen.value = true
}

const openCreate = () => {
  imageFile.value = null // Reset file
  editingSection.value = {
    name: '',
    handle: '',
    component: 'HeroBanner',
    type: 'Marketing',
    sortOrder: sectionStore.sections.length, // Use sortOrder to match store logic
    page: 'Home',
    isActive: true,
    content: {
      slides: [
        {
          _id: Math.random().toString(36).substr(2, 9),
          title: '',
          subtitle: '',
          imageURL: '',
          buttonText: '',
          buttonLink: '',
          textColor: 'text-white',
          overlayOpacity: 'bg-slate-900/60',
          textAlignment: 'center',
        },
      ],
    },
  }
  modalTab.value = 'editor'
  isModalOpen.value = true
}

const heroExistsOnPage = computed(() => {
  if (editingSection.value.component !== 'HeroBanner') return false
  return sectionStore.sections.some(
    (s) =>
      s.page === editingSection.value.page &&
      s.component === 'HeroBanner' &&
      s.id !== editingSection.value.id,
  )
})

const handleSubmit = async () => {
  // Handle Image Upload for HeroBanner Slides
  if (
    editingSection.value.component === 'HeroBanner' &&
    editingSection.value.content.slides
  ) {
    for (const slide of editingSection.value.content.slides) {
      if (slide.file) {
        try {
          const uploadedUrls = await mediaStore.uploadImages([slide.file])
          slide.imageURL = uploadedUrls[0]
          delete slide.file
        } catch (error) {
          console.error('Slide image upload failed:', error)
          return
        }
      }
    }
  }
  // Handle Image Upload if a file was selected (for other components)
  else if (imageFile.value) {
    try {
      const uploadedUrls = await mediaStore.uploadImages([imageFile.value])
      editingSection.value.content.imageURL = uploadedUrls[0]
    } catch (error) {
      console.error('Image upload failed:', error)
      return // Stop save if upload fails
    }
  }

  if (heroExistsOnPage.value) {
    utils.showToast(
      `A Hero Banner already exists for the ${editingSection.value.page} page. Only one is allowed.`,
      'error',
    )
    return
  }

  await sectionStore.saveSection(editingSection.value)
  isModalOpen.value = false
}

const handleComponentChange = () => {
  const comp = editingSection.value.component
  if (comp === 'HeroBanner') {
    editingSection.value.content = {
      slides: [
        {
          _id: Math.random().toString(36).substr(2, 9),
          title: '',
          subtitle: '',
          imageURL: '',
          buttonText: '',
          buttonLink: '',
          textColor: 'text-white',
          overlayOpacity: 'bg-slate-900/60',
          textAlignment: 'center',
        },
      ],
    }
  } else if (comp === 'ProductGrid') {
    editingSection.value.content = {
      title: '',
      showTitle: true,
      collectionId: null,
      limit: 4,
    }
  } else if (comp === 'ServicesSection') {
    editingSection.value.content = { title: '', showTitle: true, items: [] }
  } else if (comp === 'CMSProductCarousel') {
    editingSection.value.content = {
      title: 'Trending Products',
      subtitle: 'Our top picks for this week.',
      collectionId: '',
      limit: 8,
      showTitle: true,
    }
  } else if (comp === 'CMSCategoriesCarousel') {
    editingSection.value.content = {
      title: 'Browse Categories',
      collectionId: '',
      limit: 8,
      showTitle: true,
    }
  } else if (comp === 'CMSProductFeatures') {
    editingSection.value.content = { title: 'Our Features', showTitle: true }
  } else if (comp === 'CMSFeaturedProducts') {
    editingSection.value.content = {} // Self-contained logic
  } else if (comp === 'CMSFeaturedCategory') {
    editingSection.value.content = {} // Self-contained logic
  } else if (comp === 'CMSFeaturedProduct') {
    editingSection.value.content = { rotationPeriod: 'daily' }
  } else if (comp === 'ContactFormSection') {
    editingSection.value.content = {
      title: 'Contact Us',
      subtitle: 'Have questions? We are here to help.',
      buttonText: 'Send Message',
      showTitle: true,
    }
  } else if (comp === 'AboutUs') {
    editingSection.value.content = {
      title: '',
      showTitle: true,
      body: '',
      imageURL: '',
      alignment: 'right',
      aspectRatio: 'aspect-video',
      borderRadius: 'rounded-lg',
      hasShadow: true,
      styling: { backgroundColor: 'bg-white' },
    }
  } else if (comp === 'FooterSection') {
    editingSection.value.content = {
      brandName: '',
      description: '',
      columns: [
        { type: 'brand', title: '' },
        { type: 'nav', title: 'Navigation', group: '' },
        { type: 'contact', title: 'Get in Touch' },
      ],
    }
  } else {
    editingSection.value.content = {}
  }
}

const promptDelete = (section) => {
  sectionToDelete.value = section
  isDeleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!sectionToDelete.value) return
  await sectionStore.deleteSection(sectionToDelete.value.id)
  isDeleteModalOpen.value = false
  sectionToDelete.value = null
}

const filteredSections = computed(() => {
  let result = sectionStore.sections || []

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.handle.toLowerCase().includes(q),
    )
  }

  if (filterStatus.value !== 'All') {
    result = result.filter((s) => s.type === filterStatus.value)
  }

  if (filterPage.value !== 'All') {
    result = result.filter((s) => s.page === filterPage.value)
  }

  return result
})

// Helper to determine if we are in "Reorder Mode" (No filters active)
const isReorderMode = computed(() => {
  return (
    !searchQuery.value &&
    filterStatus.value === 'All' &&
    filterPage.value === 'All'
  )
})

const draggableSections = computed({
  get: () => sectionStore.sections,
  set: (val) => sectionStore.reorderSections(val),
})

const handleDragEnd = () => {
  // The setter handles the store update, this can be used for analytics or additional logic
}

const categories = computed(() => catStore.categories)

onMounted(() => {
  sectionStore.subscribe()
  catStore.fetchCategories()
})

const isAllSelected = computed({
  get: () =>
    sectionStore.sections.length > 0 &&
    selectedItems.value.size === sectionStore.sections.length,
  set: (val) => {
    if (val)
      selectedItems.value = new Set(sectionStore.sections.map((s) => s.id))
    else selectedItems.value.clear()
  },
})
</script>
<template>
  <div class="p-6 bg-slate-50 min-h-screen">
    <div class="sticky top-10 z-30 w-full min-w-0 mb-6">
      <div
        class="bg-white p-3 border border-slate-200 rounded-lg flex flex-col gap-3 transition-all duration-200 relative z-20 shadow-none"
      >
        <div class="flex items-center gap-3 w-full">
          <div
            class="flex items-center gap-2 border-r border-slate-200 pr-3 shrink-0"
          >
            <input
              type="checkbox"
              id="select-all-sections"
              name="select_all_sections"
              v-model="isAllSelected"
              class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label
              for="select-all-sections"
              class="sr-only text-xs font-bold text-slate-500 uppercase"
              >All</label
            >
          </div>

          <div class="relative grow min-w-0">
            <label for="toolbar-search" class="sr-only">Search sections</label>
            <input
              id="toolbar-search"
              name="search_query"
              aria-label="Search sections by name or handle"
              v-model="searchQuery"
              type="text"
              placeholder="Search sections by name or handle..."
              class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
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
                id="filter-page"
                name="filter_page"
                v-model="filterPage"
                class="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-md text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option v-for="opt in pageOptions" :key="opt" :value="opt">
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
                    d="M19 9l-7 7-7-7"
                    stroke-width="2"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div class="relative grow md:grow-0">
              <select
                id="filter-status"
                name="filter_status"
                v-model="filterStatus"
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
                    d="M19 9l-7 7-7-7"
                    stroke-width="2"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 ml-auto">
            <button @click="openCreate" class="btn btn-primary">
              + New Section
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-xl font-bold text-slate-800 tracking-normal uppercase">
          Sections
        </h3>
        <p class="text-[10px] text-slate-400 font-bold uppercase">
          Layout Management
        </p>
      </div>
    </div>

    <!-- Reorderable List (Visible only when no filters are active) -->
    <draggable
      v-if="isReorderMode"
      v-model="draggableSections"
      item-key="id"
      handle=".drag-handle"
      ghost-class="ghost-card"
      @end="handleDragEnd"
      class="space-y-3"
    >
      <template #item="{ element: section }">
        <div
          class="group bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:border-blue-300 transition-all"
        >
          <div class="flex items-center gap-4">
            <svg
              class="w-5 h-5 text-slate-300 hover:text-slate-600 cursor-grab mr-2 drag-handle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              ></path>
            </svg>
            <div
              class="w-1.5 h-8 rounded-full"
              :class="section.isActive ? 'bg-blue-500' : 'bg-slate-200'"
            ></div>
            <div>
              <h3 class="font-bold text-slate-800 text-sm">
                {{ section.name }}
              </h3>
              <div class="flex items-center gap-2 mt-1">
                <span
                  class="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100"
                  >{{ section.page || 'Home' }}</span
                >
                <span
                  class="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md"
                  >{{ section.component }}</span
                >
                <span
                  v-if="section.handle"
                  class="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md"
                  >{{ section.handle }}</span
                >
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="openEdit(section)" class="btn btn-secondary">
              Configure
            </button>
            <button
              @click="promptDelete(section)"
              class="text-slate-400 hover:text-red-500 p-2 transition-colors"
              title="Delete Section"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </template>
    </draggable>

    <!-- Filtered List (Static, no drag) -->
    <div v-else class="space-y-3">
      <div
        v-for="section in filteredSections"
        :key="section.id"
        class="group bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:border-blue-300 transition-all"
      >
        <div class="flex items-center gap-4">
          <!-- No Drag Handle in Filtered View -->
          <div
            class="w-1.5 h-8 rounded-full"
            :class="section.isActive ? 'bg-blue-500' : 'bg-slate-200'"
          ></div>
          <div>
            <h3 class="font-bold text-slate-800 text-sm">{{ section.name }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span
                class="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100"
                >{{ section.page || 'Home' }}</span
              >
              <span
                class="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md"
                >{{ section.component }}</span
              >
              <span
                v-if="section.handle"
                class="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md"
                >{{ section.handle }}</span
              >
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="openEdit(section)" class="btn btn-secondary">
            Configure
          </button>
          <button
            @click="promptDelete(section)"
            class="text-slate-400 hover:text-red-500 p-2 transition-colors"
            title="Delete Section"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
          </button>
        </div>
      </div>
      <div
        v-if="filteredSections.length === 0"
        class="text-center py-10 text-slate-400 text-sm"
      >
        No sections found matching your filters.
      </div>
    </div>
  </div>
  <BaseModal
    :show="isModalOpen"
    :title="(editingSection.id ? 'Edit ' : 'Create ') + 'Section'"
    @close="isModalOpen = false"
  >
    <template #content>
      <div class="flex border-b border-slate-200 mb-6">
        <button
          @click="modalTab = 'editor'"
          :class="
            modalTab === 'editor'
              ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          "
          class="pb-3 px-4 text-sm uppercase tracking-wide transition-all"
        >
          Edit Content
        </button>
        <button
          v-if="
            editingSection.component !== 'HeroBanner' &&
            editingSection.component !== 'FooterSection'
          "
          @click="modalTab = 'preview'"
          :class="
            modalTab === 'preview'
              ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          "
          class="pb-3 px-4 text-sm uppercase tracking-wide transition-all"
        >
          Live Preview
        </button>
      </div>
      <div v-if="modalTab === 'editor'" class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label
              for="sec-name"
              class="text-xs font-bold text-slate-500 uppercase"
              >Section Name</label
            >
            <input
              id="sec-name"
              name="section_name"
              v-model="editingSection.name"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="sec-component"
              class="text-xs font-bold text-slate-500 uppercase"
              >Layout Type</label
            >
            <select
              id="sec-component"
              name="section_component"
              v-model="editingSection.component"
              @change="handleComponentChange"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="HeroBanner">Hero Banner</option>
              <option value="ProductGrid">Product Grid</option>
              <option value="CMSProductCarousel">Product Carousel</option>
              <option value="CMSCategoriesCarousel">Category Carousel</option>
              <option value="CMSProductFeatures">Features Section</option>
              <option value="CMSFeaturedProducts">
                Featured Products (Banner)
              </option>
              <option value="CMSFeaturedCategory">
                Featured Category (Banner)
              </option>
              <option value="CMSFeaturedProduct">
                Featured Product (Single)
              </option>
              <option value="ContactFormSection">Contact Form</option>
              <option value="ServicesSection">Services Section</option>
              <option value="AboutUs">About Us</option>
              <option value="FooterSection">Footer Block</option>
            </select>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="section-page"
            class="text-xs font-bold text-slate-500 uppercase"
            >Assign to Page</label
          >
          <select
            id="section-page"
            name="section_page"
            v-model="editingSection.page"
            class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
          >
            <option value="Home">Home</option>
            <option value="About">About</option>
            <option value="Services">Services</option>
            <option value="Contact">Contact</option>
            <option value="Global">Global</option>
          </select>
        </div>

        <hr class="border-slate-100" />

        <div
          v-if="heroExistsOnPage"
          class="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-xs flex items-start gap-2"
        >
          <span class="material-symbols-outlined text-sm mt-0.5">warning</span>
          <p>
            <strong>Warning:</strong> A Hero Banner already exists for the
            {{ editingSection.page }} page. You cannot add another one.
          </p>
        </div>

        <div
          v-if="editingSection.component === 'HeroBanner'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex justify-between items-center">
            <label class="text-xs font-bold text-slate-500 uppercase"
              >Slides</label
            >
            <button
              v-if="editingSection.content.slides.length < 5"
              type="button"
              @click="
                editingSection.content.slides.push({
                  _id: Math.random().toString(36).substr(2, 9),
                  title: '',
                  subtitle: '',
                  imageURL: '',
                  buttonText: '',
                  buttonLink: '',
                  textColor: 'text-white',
                  overlayOpacity: 'bg-slate-900/60',
                  textAlignment: 'center',
                })
              "
              class="btn btn-dark text-xs py-1"
            >
              + Add Slide
            </button>
          </div>

          <draggable
            v-model="editingSection.content.slides"
            item-key="_id"
            handle=".slide-drag-handle"
            class="space-y-4"
          >
            <template #item="{ element: slide, index }">
              <div
                class="p-4 bg-white border border-slate-200 rounded-lg space-y-3 relative"
              >
                <div
                  class="absolute top-3 left-3 cursor-move slide-drag-handle text-slate-300 hover:text-slate-600 p-1"
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
                      d="M4 8h16M4 16h16"
                    ></path>
                  </svg>
                </div>
                <button
                  type="button"
                  @click="editingSection.content.slides.splice(index, 1)"
                  class="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                  v-if="editingSection.content.slides.length > 1"
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
                    ></path>
                  </svg>
                </button>
                <div
                  class="text-xs font-bold text-slate-400 uppercase mb-2 pl-8"
                >
                  Slide {{ index + 1 }}
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label
                      :for="'slide-title-' + index"
                      class="text-[10px] font-bold text-slate-500 uppercase"
                      >Title</label
                    >
                    <input
                      :id="'slide-title-' + index"
                      :name="'slide_title_' + index"
                      v-model="slide.title"
                      type="text"
                      class="w-full p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label
                      :for="'slide-subtitle-' + index"
                      class="text-[10px] font-bold text-slate-500 uppercase"
                      >Subtitle</label
                    >
                    <input
                      :id="'slide-subtitle-' + index"
                      :name="'slide_subtitle_' + index"
                      v-model="slide.subtitle"
                      type="text"
                      class="w-full p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label
                      :for="'slide-btn-text-' + index"
                      class="text-[10px] font-bold text-slate-500 uppercase"
                      >Button Text</label
                    >
                    <input
                      :id="'slide-btn-text-' + index"
                      :name="'slide_btn_text_' + index"
                      v-model="slide.buttonText"
                      type="text"
                      class="w-full p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label
                      :for="'slide-btn-link-' + index"
                      class="text-[10px] font-bold text-slate-500 uppercase"
                      >Button Link</label
                    >
                    <input
                      :id="'slide-btn-link-' + index"
                      :name="'slide_btn_link_' + index"
                      v-model="slide.buttonLink"
                      type="text"
                      class="w-full p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label
                    :for="'slide-align-' + index"
                    class="text-[10px] font-bold text-slate-500 uppercase"
                    >Text Alignment</label
                  >
                  <select
                    :id="'slide-align-' + index"
                    :name="'slide_align_' + index"
                    v-model="slide.textAlignment"
                    class="w-full p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 transition-all text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1">
                  <label
                    :for="'slide-text-color-' + index"
                    class="text-[10px] font-bold text-slate-500 uppercase"
                    >Text Color</label
                  >
                  <select
                    :id="'slide-text-color-' + index"
                    :name="'slide_text_color_' + index"
                    v-model="slide.textColor"
                    class="w-full p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 transition-all text-sm"
                  >
                    <option value="text-white">White</option>
                    <option value="text-slate-900">Dark</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1">
                  <label
                    :for="'slide-overlay-opacity-' + index"
                    class="text-[10px] font-bold text-slate-500 uppercase"
                    >Overlay Opacity</label
                  >
                  <select
                    :id="'slide-overlay-opacity-' + index"
                    :name="'slide_overlay_opacity_' + index"
                    v-model="slide.overlayOpacity"
                    class="w-full p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 transition-all text-sm"
                  >
                    <option value="bg-slate-900/0">0%</option>
                    <option value="bg-slate-900/20">20%</option>
                    <option value="bg-slate-900/40">40%</option>
                    <option value="bg-slate-900/60">60%</option>
                    <option value="bg-slate-900/80">80%</option>
                    <option value="bg-slate-900/100">100%</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase"
                    >Image</label
                  >
                  <MediaUpload
                    :id="'slide-image-' + index"
                    :name="'slide_image_' + index"
                    v-model="slide.imageURL"
                    @file-selected="(f) => (slide.file = f)"
                  />
                </div>
              </div>
            </template>
          </draggable>
        </div>

        <div
          v-else-if="editingSection.component === 'ProductGrid'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="grid-title"
                class="text-xs font-bold text-slate-500 uppercase"
                >Grid Title</label
              >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="grid-show-title"
                  v-model="editingSection.content.showTitle"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  for="grid-show-title"
                  class="text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                  >Show</label
                >
              </div>
            </div>
            <input
              id="grid-title"
              name="grid_title"
              v-model="editingSection.content.title"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="grid-col-id"
              class="text-xs font-bold text-slate-500 uppercase"
              >Source Category</label
            >
            <select
              id="grid-col-id"
              name="grid_collection_id"
              v-model="editingSection.content.collectionId"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option :value="null" disabled>Select a Category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="grid-limit"
              class="text-xs font-bold text-slate-500 uppercase"
              >Number of Items to Show</label
            >
            <input
              id="grid-limit"
              name="grid_display_limit"
              v-model.number="editingSection.content.limit"
              type="number"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div
          v-else-if="editingSection.component === 'CMSProductCarousel'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="carousel-title"
                class="text-xs font-bold text-slate-500 uppercase"
                >Carousel Title</label
              >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="carousel-show-title"
                  v-model="editingSection.content.showTitle"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  for="carousel-show-title"
                  class="text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                  >Show</label
                >
              </div>
            </div>
            <input
              id="carousel-title"
              name="carousel_title"
              v-model="editingSection.content.title"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="carousel-subtitle"
              class="text-xs font-bold text-slate-500 uppercase"
              >Subtitle</label
            >
            <input
              id="carousel-subtitle"
              name="carousel_subtitle"
              v-model="editingSection.content.subtitle"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="carousel-col-id"
              class="text-xs font-bold text-slate-500 uppercase"
              >Source Category</label
            >
            <select
              id="carousel-col-id"
              name="carousel_collection_id"
              v-model="editingSection.content.collectionId"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="">All Products</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="carousel-limit"
              class="text-xs font-bold text-slate-500 uppercase"
              >Number of Items</label
            >
            <input
              id="carousel-limit"
              name="carousel_display_limit"
              v-model.number="editingSection.content.limit"
              type="number"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div
          v-else-if="editingSection.component === 'CMSCategoriesCarousel'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="cat-carousel-title"
                class="text-xs font-bold text-slate-500 uppercase"
                >Carousel Title</label
              >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat-carousel-show-title"
                  v-model="editingSection.content.showTitle"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  for="cat-carousel-show-title"
                  class="text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                  >Show</label
                >
              </div>
            </div>
            <input
              id="cat-carousel-title"
              name="cat_carousel_title"
              v-model="editingSection.content.title"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="cat-carousel-col-id"
              class="text-xs font-bold text-slate-500 uppercase"
              >Parent Category (Optional)</label
            >
            <select
              id="cat-carousel-col-id"
              name="cat_carousel_collection_id"
              v-model="editingSection.content.collectionId"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="cat-carousel-limit"
              class="text-xs font-bold text-slate-500 uppercase"
              >Number of Items</label
            >
            <input
              id="cat-carousel-limit"
              name="cat_carousel_display_limit"
              v-model.number="editingSection.content.limit"
              type="number"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div
          v-else-if="editingSection.component === 'CMSProductFeatures'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="features-title"
                class="text-xs font-bold text-slate-500 uppercase"
                >Section Title</label
              >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="features-show-title"
                  v-model="editingSection.content.showTitle"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  for="features-show-title"
                  class="text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                  >Show</label
                >
              </div>
            </div>
            <input
              id="features-title"
              name="features_title"
              v-model="editingSection.content.title"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div
          v-else-if="editingSection.component === 'CMSFeaturedProduct'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <label
              for="feat-prod-rotation"
              class="text-xs font-bold text-slate-500 uppercase"
              >Rotation Period</label
            >
            <select
              id="feat-prod-rotation"
              name="feat_prod_rotation"
              v-model="editingSection.content.rotationPeriod"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <p class="text-[10px] text-slate-400">
              How often the featured product changes automatically.
            </p>
          </div>
        </div>

        <div
          v-else-if="editingSection.component === 'ContactFormSection'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="contact-title"
                class="text-xs font-bold text-slate-500 uppercase"
                >Section Title</label
              >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contact-show-title"
                  v-model="editingSection.content.showTitle"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  for="contact-show-title"
                  class="text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                  >Show</label
                >
              </div>
            </div>
            <input
              id="contact-title"
              name="contact_title"
              v-model="editingSection.content.title"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="contact-subtitle"
              class="text-xs font-bold text-slate-500 uppercase"
              >Subtitle</label
            >
            <input
              id="contact-subtitle"
              name="contact_subtitle"
              v-model="editingSection.content.subtitle"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="contact-btn"
              class="text-xs font-bold text-slate-500 uppercase"
              >Button Text</label
            >
            <input
              id="contact-btn"
              name="contact_btn_text"
              v-model="editingSection.content.buttonText"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div
          v-else-if="
            ['CMSFeaturedProducts', 'CMSFeaturedCategory'].includes(
              editingSection.component,
            )
          "
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div
            class="p-4 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-100"
          >
            <p class="font-bold mb-1">Automatic Content</p>
            <p>
              This section automatically selects content to display based on
              your store data. No manual configuration is required.
            </p>
          </div>
        </div>

        <div
          v-else-if="editingSection.component === 'ServicesSection'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="service-title"
                class="text-xs font-bold text-slate-500 uppercase"
                >Section Title</label
              >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="service-show-title"
                  name="service_show_title"
                  v-model="editingSection.content.showTitle"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  for="service-show-title"
                  class="text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                  >Show</label
                >
              </div>
            </div>
            <input
              id="service-title"
              name="service_title"
              v-model="editingSection.content.title"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold text-slate-500 uppercase"
                >Service Items</label
              >
              <button
                type="button"
                @click="
                  editingSection.content.items.push({
                    title: '',
                    description: '',
                    icon: 'star',
                  })
                "
                class="btn btn-dark"
              >
                + Add Service Item
              </button>
            </div>

            <div
              v-if="
                editingSection.content.items &&
                editingSection.content.items.length > 0
              "
              class="space-y-2"
            >
              <div
                v-for="(item, index) in editingSection.content.items"
                :key="index"
                class="bg-slate-50 border border-slate-200 rounded-lg p-3 flex gap-3 items-start"
              >
                <div class="grow space-y-2">
                  <input
                    :id="'service-item-title-' + index"
                    :name="'service_item_title_' + index"
                    v-model="item.title"
                    placeholder="Service Title"
                    aria-label="Service Title"
                    class="w-full p-2 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                  />
                  <textarea
                    :id="'service-item-desc-' + index"
                    :name="'service_item_desc_' + index"
                    v-model="item.description"
                    placeholder="Full Description"
                    aria-label="Service Description"
                    @input="utils.autoResize"
                    rows="1"
                    class="w-full p-2 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none resize-none"
                  ></textarea>
                  <input
                    :id="'service-item-icon-' + index"
                    :name="'service_item_icon_' + index"
                    v-model="item.icon"
                    placeholder="Icon (Material Symbol)"
                    aria-label="Service Icon"
                    class="w-full p-2 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none font-mono"
                  />
                </div>
                <button
                  type="button"
                  @click="editingSection.content.items.splice(index, 1)"
                  class="text-red-500 hover:text-red-700 p-1"
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
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
            <div
              v-else
              class="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs"
            >
              No services added.
            </div>
          </div>
        </div>

        <div
          v-else-if="editingSection.component === 'AboutUs'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="about-title"
                class="text-xs font-bold text-slate-500 uppercase"
                >Title</label
              >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="about-show-title"
                  v-model="editingSection.content.showTitle"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  for="about-show-title"
                  class="text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                  >Show</label
                >
              </div>
            </div>
            <input
              id="about-title"
              name="about_title"
              v-model="editingSection.content.title"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="about-body"
              class="text-xs font-bold text-slate-500 uppercase"
              >Body Text</label
            >
            <input
              id="about-body"
              name="about_body"
              type="hidden"
              :value="editingSection.content.body"
            />
            <trix-editor
              input="about-body"
              @trix-change="editingSection.content.body = $event.target.value"
              class="bg-white trix-content"
            ></trix-editor>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="about-image"
              class="text-xs font-bold text-slate-500 uppercase"
              >Image</label
            >
            <MediaUpload
              id="about-image"
              name="about_image"
              v-model="editingSection.content.imageURL"
              @file-selected="(f) => (imageFile = f)"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="about-align"
              class="text-xs font-bold text-slate-500 uppercase"
              >Image Position</label
            >
            <select
              id="about-align"
              name="about_alignment"
              v-model="editingSection.content.alignment"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="about-aspect"
              class="text-xs font-bold text-slate-500 uppercase"
              >Image Aspect Ratio</label
            >
            <select
              id="about-aspect"
              name="about_aspect_ratio"
              v-model="editingSection.content.aspectRatio"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="aspect-video">Landscape (16:9)</option>
              <option value="aspect-square">Square (1:1)</option>
              <option value="aspect-[3/4]">Portrait (3:4)</option>
              <option value="aspect-auto">Original/Auto</option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="about-radius"
              class="text-xs font-bold text-slate-500 uppercase"
              >Corner Rounding</label
            >
            <select
              id="about-radius"
              name="about_border_radius"
              v-model="editingSection.content.borderRadius"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="rounded-none">None</option>
              <option value="rounded-sm">Small</option>
              <option value="rounded-md">Medium</option>
              <option value="rounded-lg">Large (Default)</option>
              <option value="rounded-2xl">Extra Large</option>
              <option value="rounded-full">Full (Circle/Pill)</option>
            </select>
          </div>

          <div
            class="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
          >
            <div class="flex flex-col">
              <span class="text-sm font-medium text-slate-700 tracking-normal"
                >Enable Image Shadow</span
              >
            </div>
            <button
              type="button"
              @click="
                editingSection.content.hasShadow =
                  !editingSection.content.hasShadow
              "
              class="w-12 h-6 rounded-full transition-all relative"
              :class="
                editingSection.content.hasShadow ? 'bg-sky-500' : 'bg-slate-300'
              "
            >
              <div
                class="absolute top-1 bg-white w-4 h-4 rounded-full transition-all"
                :class="editingSection.content.hasShadow ? 'left-7' : 'left-1'"
              ></div>
            </button>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="about-bg"
              class="text-xs font-bold text-slate-500 uppercase"
              >Background Color</label
            >
            <select
              id="about-bg"
              name="about_bg"
              v-model="editingSection.content.styling.backgroundColor"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="bg-transparent">Transparent</option>
              <option value="bg-white">White</option>
              <option value="bg-slate-50">Slate 50</option>
              <option value="bg-slate-100">Slate 100</option>
              <option value="bg-pump-navy">Pump Navy</option>
              <option value="bg-pump-blue">Pump Blue</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label
              for="about-text-color"
              class="text-xs font-bold text-slate-500 uppercase"
              >Text Color</label
            >
            <select
              id="about-text-color"
              name="about_text_color"
              v-model="editingSection.content.styling.textColor"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="text-slate-900">Dark</option>
              <option value="text-white">Light</option>
            </select>
          </div>
        </div>

        <div
          v-else-if="editingSection.component === 'FooterSection'"
          class="space-y-4 animate-in fade-in duration-300"
        >
          <div class="flex flex-col gap-1">
            <label
              for="footer-brand"
              class="text-xs font-bold text-slate-500 uppercase"
              >Brand Name</label
            >
            <input
              id="footer-brand"
              name="footer_brand_name"
              v-model="editingSection.content.brandName"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="footer-desc"
              class="text-xs font-bold text-slate-500 uppercase"
              >Description</label
            >
            <textarea
              id="footer-desc"
              name="footer_description"
              v-model="editingSection.content.description"
              rows="3"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all resize-none"
            ></textarea>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold text-slate-500 uppercase"
                >Footer Columns</label
              >
              <button
                type="button"
                @click="
                  editingSection.content.columns.push({
                    type: 'nav',
                    title: 'New Column',
                    group: '',
                  })
                "
                class="text-xs text-blue-600 font-bold hover:underline"
              >
                + Add Column
              </button>
            </div>

            <draggable
              v-model="editingSection.content.columns"
              item-key="title"
              handle=".col-drag-handle"
              class="space-y-2"
            >
              <template #item="{ element: col, index }">
                <div
                  class="flex gap-2 items-start bg-slate-50 p-3 rounded border border-slate-200"
                >
                  <span
                    class="col-drag-handle material-symbols-outlined text-slate-400 cursor-move text-lg mt-2"
                    >drag_indicator</span
                  >
                  <div class="grow space-y-2">
                    <div class="flex gap-2">
                      <input
                        :id="'footer-col-title-' + index"
                        :name="'footer_col_title_' + index"
                        v-model="col.title"
                        placeholder="Column Title"
                        aria-label="Column Title"
                        class="w-1/2 p-2 text-sm border border-slate-200 rounded"
                      />
                      <select
                        :id="'footer-col-type-' + index"
                        :name="'footer_col_type_' + index"
                        v-model="col.type"
                        aria-label="Column Type"
                        class="w-1/2 p-2 text-sm border border-slate-200 rounded"
                      >
                        <option value="brand">Brand Info</option>
                        <option value="nav">Navigation</option>
                        <option value="contact">Contact Info</option>
                      </select>
                    </div>
                    <div v-if="col.type === 'nav'">
                      <input
                        :id="'footer-col-group-' + index"
                        :name="'footer_col_group_' + index"
                        v-model="col.group"
                        placeholder="Nav Group (matches NavManager)"
                        aria-label="Navigation Group"
                        class="w-full p-2 text-sm border border-slate-200 rounded"
                      />
                      <p class="text-[10px] text-slate-400">
                        Leave empty to show all ungrouped footer links.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="editingSection.content.columns.splice(index, 1)"
                    class="text-red-500 hover:bg-red-50 p-1 rounded"
                    :disabled="editingSection.content.columns.length <= 1"
                  >
                    <span class="material-symbols-outlined text-lg"
                      >delete</span
                    >
                  </button>
                </div>
              </template>
            </draggable>
            <div
              v-if="!editingSection.content.columns"
              class="text-center p-4 text-sm text-slate-400"
            >
              No columns configured. Initialize by changing Layout Type back and
              forth or saving.
            </div>
          </div>
        </div>

        <div
          class="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
        >
          <div class="flex flex-col">
            <span class="text-sm font-medium text-slate-700 tracking-normal"
              >Visible on Storefront</span
            >
            <span class="text-[10px] text-slate-400 uppercase font-bold"
              >Toggle active status</span
            >
          </div>
          <button
            type="button"
            @click="editingSection.isActive = !editingSection.isActive"
            class="w-12 h-6 rounded-full transition-all relative"
            :class="editingSection.isActive ? 'bg-sky-500' : 'bg-slate-300'"
          >
            <div
              class="absolute top-1 bg-white w-4 h-4 rounded-full transition-all"
              :class="editingSection.isActive ? 'left-7' : 'left-1'"
            ></div>
          </button>
        </div>
      </div>

      <div
        v-else-if="modalTab === 'preview'"
        class="bg-slate-100 rounded-lg p-8 border border-slate-200 min-h-100 flex items-center justify-center overflow-hidden relative"
      >
        <div
          class="bg-white shadow-2xl mx-auto rounded-md overflow-hidden transform scale-95 origin-top transition-all"
          :class="
            ['HeroBanner', 'FooterSection'].includes(editingSection.component)
              ? 'w-full'
              : 'w-full max-w-4xl'
          "
        >
          <SectionRenderer
            :section="editingSection"
            :isPreview="true"
            :key="JSON.stringify(editingSection)"
          />
        </div>
      </div>
    </template>

    <template #actions>
      <button
        @click="handleSubmit"
        :disabled="mediaStore.isUploading || heroExistsOnPage"
        class="btn btn-primary w-full md:w-auto"
      >
        {{
          mediaStore.isUploading
            ? 'Uploading...'
            : editingSection.id
              ? 'Save Changes'
              : heroExistsOnPage
                ? 'Limit Reached'
                : 'Create Section'
        }}
      </button>
    </template>
  </BaseModal>

  <!-- Delete Confirmation Modal -->
  <BaseModal
    :show="isDeleteModalOpen"
    title="Delete Section"
    :loading="sectionStore.loading"
    @close="isDeleteModalOpen = false"
  >
    <template #content>
      <div class="p-4 text-center">
        <p class="text-slate-600 mb-2">
          Are you sure you want to delete
          <span class="font-bold text-slate-900">{{
            sectionToDelete?.name
          }}</span
          >?
        </p>
        <p class="text-xs text-slate-400 uppercase font-bold">
          This action cannot be undone.
        </p>
      </div>
    </template>
    <template #actions>
      <button @click="handleDelete" class="btn btn-danger w-full md:w-auto">
        Confirm Delete
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.ghost-card {
  opacity: 0.5;
  background: #eff6ff;
  border: 2px dashed #3b82f6;
}
</style>
