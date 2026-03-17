<script setup>
import { ref, reactive, watch, computed } from 'vue'
import BaseModal from '@/components/modal/BaseModal.vue'
import MediaUpload from './MediaUpload.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProductStore } from '@/stores/productStore'
import { useUtilityStore } from '@/stores/utilityStore'
import { useMediaStore } from '@/stores/mediaStore' // Added this

const utils = useUtilityStore()
const catStore = useCategoryStore()
const prodStore = useProductStore()
const mediaStore = useMediaStore() // Added this

const isCategoryLocked = ref(false)
const isLoading = ref(false)
const resultMessage = ref('')
const isError = ref(false)

const imagePreview = ref(null)
const imageFile = ref(null)

const currentSectionTitle = ref('')
const currentSectionItem = ref('')
const currentSectionList = ref([])
const keywordsInput = ref('')
const currentLinkTitle = ref('')
const currentLinkUrl = ref('')

const catForm = reactive({ name: '', description: '', parentId: null })
const itemForm = reactive({
  name: '',
  description: '',
  product_code: '',
  price: null,
  stock: null,
  parentId: null,
  imageURL: '',
  isPublished: false,
  isFeatured: false,
  isBanner: false,
  hasWarranty: false,
  externalLinks: [],
})

const resetForms = () => {
  Object.assign(catForm, { name: '', description: '', parentId: null })
  Object.assign(itemForm, {
    name: '',
    description: '',
    product_code: '',
    price: null,
    stock: null,
    parentId: null,
    imageURL: '',
    isPublished: false,
    isFeatured: false,
    isBanner: false,
    hasWarranty: false,
    info_sections: [],
    externalLinks: [],
  })
  isCategoryLocked.value = false
  imagePreview.value = null
  imageFile.value = null
  currentSectionTitle.value = ''
  currentSectionList.value = []
  currentLinkTitle.value = ''
  currentLinkUrl.value = ''
  keywordsInput.value = ''
}

watch(
  () => utils.createModal.show,
  (isVisible) => {
    if (isVisible) {
      const data = utils.createModal.data
      const isEdit = utils.createModal.isEdit

      if (isEdit && data) {
        if (['category', 'subcategory'].includes(utils.createModal.mode)) {
          Object.assign(catForm, data)
        } else {
          Object.assign(itemForm, data)
          if (data.imageURL) imagePreview.value = data.imageURL
          if (!itemForm.externalLinks) itemForm.externalLinks = []
        }
        if (data.parentId) isCategoryLocked.value = true
        keywordsInput.value = data.keywords ? data.keywords.join(', ') : ''
      } else {
        if (
          (utils.createModal.mode === 'model' ||
            utils.createModal.mode === 'variant') &&
          data?.parentId
        ) {
          let parent = null
          if (utils.createModal.mode === 'model') {
            parent = prodStore.products.find((p) => p.id === data.parentId)
          } else {
            // variant
            parent = prodStore.models.find((m) => m.id === data.parentId)
          }

          if (parent) {
            itemForm.parentId = parent.id
            isCategoryLocked.value = true
          }
        } else if (data?.categoryId) {
          itemForm.parentId = data.categoryId
          catForm.parentId = data.categoryId
          isCategoryLocked.value = true
        }
      }
    } else {
      setTimeout(() => {
        resetForms()
        resultMessage.value = ''
        isError.value = false
      }, 300)
    }
  },
  { immediate: true },
)

const handleSubmit = async () => {
  isLoading.value = true
  resultMessage.value = ''
  const mode = utils.createModal.mode
  const isEdit = utils.createModal.isEdit
  const idToEdit = utils.createModal.data?.id

  try {
    // A. IMAGE UPLOAD LOGIC
    let finalImageURL = itemForm.imageURL
    if (imageFile.value) {
      resultMessage.value = 'Uploading to Cloudinary...'
      const uploadedUrls = await mediaStore.uploadImages([imageFile.value])
      finalImageURL = uploadedUrls[0]
    }

    const timestamp = new Date()
    const commonData = { updatedAt: timestamp }

    const keywords = keywordsInput.value
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k)

    if (['category', 'subcategory'].includes(mode)) {
      // CATEGORY ACTIONS
      const slug = utils.generateSlug(catForm.name)

      // Clean Category Data
      const payload = {
        ...catForm,
        keywords,
        slug,
        ...commonData,
      }

      if (isEdit) {
        await catStore.updateCategory(idToEdit, payload)
      } else {
        await catStore.addCategory({
          ...payload,
          isPublished: false,
          createdAt: timestamp,
        })
      }
      handleClose()
      utils.triggerToast(
        isEdit
          ? 'Category updated successfully!'
          : 'Category created successfully!',
        'success',
      )
    } else {
      // PRODUCT/MODEL/VARIANT ACTIONS
      const slug = utils.generateSlug(itemForm.name)

      // --- DATA SANITIZATION START ---
      // We cast everything to ensure correct Firestore types
      const payload = {
        ...itemForm,
        price: Number(itemForm.price || 0), // Force Number
        stock: Number(itemForm.stock || 0), // Force Number
        isPublished: Boolean(itemForm.isPublished || false), // Force Boolean
        isFeatured: Boolean(itemForm.isFeatured || false),
        isBanner: Boolean(itemForm.isBanner || false),
        hasWarranty: Boolean(itemForm.hasWarranty || false),
        slug,
        keywords,
        imageURL: finalImageURL,
        type: mode,
        ...commonData,
      }
      // --- DATA SANITIZATION END ---

      if (isEdit) {
        await prodStore.updateItem(idToEdit, payload)
      } else {
        await prodStore.addItem({
          ...payload,
          createdAt: timestamp,
        })
      }
      handleClose()
      utils.triggerToast(
        isEdit ? 'Item updated successfully!' : 'Item created successfully!',
        'success',
      )
    }
  } catch (err) {
    console.error(err)
    isError.value = true
    resultMessage.value = `Error: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => (utils.createModal.show = false)

// 1. Add an item to the temporary list
const addItemToSection = () => {
  if (!currentSectionItem.value.trim()) return
  currentSectionList.value.push(currentSectionItem.value.trim())
  currentSectionItem.value = '' // Clear item input
}

// 2. Remove an item from the temporary list
const removeItemFromSection = (index) => {
  currentSectionList.value.splice(index, 1)
}

// 3. Save the whole section to the Main Form
const saveSection = () => {
  if (
    !currentSectionTitle.value.trim() ||
    currentSectionList.value.length === 0
  )
    return

  // Initialize main array if needed
  if (!itemForm.info_sections) itemForm.info_sections = []

  // Push the new object
  itemForm.info_sections.push({
    title: currentSectionTitle.value.trim(),
    items: [...currentSectionList.value], // Create a copy
  })

  // Reset the builder
  currentSectionTitle.value = ''
  currentSectionList.value = []
}

// 4. Remove a whole section from the Main Form
const removeSection = (index) => {
  itemForm.info_sections.splice(index, 1)
}

const addExternalLink = () => {
  if (!currentLinkTitle.value.trim() || !currentLinkUrl.value.trim()) return
  itemForm.externalLinks.push({
    title: currentLinkTitle.value.trim(),
    url: currentLinkUrl.value.trim(),
  })
  currentLinkTitle.value = ''
  currentLinkUrl.value = ''
}

const removeExternalLink = (index) => {
  itemForm.externalLinks.splice(index, 1)
}

const isProductPublished = computed(() => {
  return (
    utils.createModal.isEdit &&
    !['category', 'subcategory'].includes(utils.createModal.mode) &&
    utils.createModal.data?.isPublished
  )
})

const unpublishProduct = async () => {
  if (confirm('This item will be hidden from the frontend. Unpublish now?')) {
    isLoading.value = true
    try {
      const id = utils.createModal.data.id
      await prodStore.updateItem(id, { isPublished: false })
      itemForm.isPublished = false
      if (utils.createModal.data) utils.createModal.data.isPublished = false
      utils.triggerToast('Item unpublished.', 'success')
    } catch (e) {
      console.error(e)
      isError.value = true
      resultMessage.value = `Error: ${e.message}`
    } finally {
      isLoading.value = false
    }
  }
}

const generateKeywords = () => {
  const desc = ['category', 'subcategory'].includes(utils.createModal.mode)
    ? catForm.description
    : itemForm.description

  if (!desc) return

  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'this',
    'that',
    'these',
    'those',
    'it',
    'as',
    'from',
  ])

  const words = desc
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))

  const uniqueWords = [...new Set(words)].slice(0, 10)
  const current = keywordsInput.value
    ? keywordsInput.value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s)
    : []

  // Merge avoiding duplicates
  const combined = [...new Set([...current, ...uniqueWords])]
  keywordsInput.value = combined.join(', ')
}
</script>

<template>
  <BaseModal
    :show="utils.createModal.show"
    :title="
      (utils.createModal.isEdit ? 'Edit ' : 'Create ') + utils.createModal.mode
    "
    :loading="isLoading"
    :resultMessage="resultMessage"
    :isError="isError"
    @close="handleClose"
  >
    <template #content>
      <div
        v-if="['category', 'subcategory'].includes(utils.createModal.mode)"
        class="space-y-4"
      >
        <div
          v-if="utils.createModal.mode === 'subcategory'"
          class="flex flex-col gap-1"
        >
          <label
            for="cat-parent-id"
            class="text-xs font-bold text-slate-500 uppercase"
            >Parent Category</label
          >
          <select
            id="cat-parent-id"
            name="category_parent_id"
            v-model="catForm.parentId"
            class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
          >
            <option :value="null">None (Make Top Level)</option>
            <option
              v-for="c in catStore.parentCategories"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="cat-name-input"
            class="text-xs font-bold text-slate-500 uppercase"
            >Category Name</label
          >
          <input
            id="cat-name-input"
            name="category_name"
            v-model="catForm.name"
            type="text"
            class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="cat-desc-input"
            class="text-xs font-bold text-slate-500 uppercase"
            >Description</label
          >
          <textarea
            id="cat-desc-input"
            name="category_description"
            v-model="catForm.description"
            @input="utils.autoResize"
            class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all resize-none min-h-20"
          ></textarea>
        </div>

        <div class="flex flex-col gap-1">
          <div class="flex justify-between items-center">
            <label
              for="cat-keywords-input"
              class="text-xs font-bold text-slate-500 uppercase"
              >Keywords (Comma Separated)</label
            >
            <button
              type="button"
              @click="generateKeywords"
              class="text-[10px] text-blue-600 font-bold uppercase hover:underline flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[14px]"
                >auto_awesome</span
              >
              Suggest
            </button>
          </div>
          <input
            id="cat-keywords-input"
            name="category_keywords"
            v-model="keywordsInput"
            type="text"
            placeholder="e.g. pump, water, industrial"
            class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div
        v-else-if="isProductPublished"
        class="bg-slate-900 rounded-xl p-12 text-center shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-300 my-4"
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
          Item is Live
        </h2>
        <p class="text-slate-400 text-sm max-w-sm mx-auto mb-8">
          This item is currently published on the frontend. To prevent SEO
          breaks, editing is restricted.
        </p>
        <button
          @click="unpublishProduct"
          class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-sm font-bold text-[11px] uppercase tracking-widest transition-all"
        >
          Unpublish to Edit
        </button>
      </div>

      <div v-else>
        <div class="space-y-5">
          <div class="flex flex-col gap-1">
            <label
              for="product-image-input"
              class="text-xs font-bold text-slate-500 uppercase"
              >Product Image</label
            >
            <MediaUpload
              v-model="itemForm.imageURL"
              id="product-image-input"
              name="product_image"
              @file-selected="(file) => (imageFile = file)"
            />
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="prod-parent-id"
                class="text-xs font-bold text-slate-500 uppercase"
              >
                {{
                  utils.createModal.mode === 'model'
                    ? 'Parent Product'
                    : utils.createModal.mode === 'variant'
                      ? 'Parent Model'
                      : 'Category'
                }}
              </label>
              <button
                v-if="isCategoryLocked"
                @click="isCategoryLocked = false"
                type="button"
                class="text-[10px] text-blue-600 font-bold uppercase hover:underline"
                title="Parent is locked automatically upon creation. Unlock to change."
              >
                Unlock to Change
              </button>
            </div>
            <select
              id="prod-parent-id"
              name="product_parent_category"
              v-model="itemForm.parentId"
              :disabled="isCategoryLocked"
              :class="{ 'opacity-60 cursor-not-allowed': isCategoryLocked }"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option :value="null" disabled>
                Select
                {{
                  utils.createModal.mode === 'model'
                    ? 'Product'
                    : utils.createModal.mode === 'variant'
                      ? 'Model'
                      : 'Category'
                }}
              </option>

              <optgroup
                v-if="utils.createModal.mode === 'model'"
                label="Products"
              >
                <option
                  v-for="p in prodStore.products"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.name }}
                </option>
              </optgroup>

              <optgroup
                v-else-if="utils.createModal.mode === 'variant'"
                label="Models"
              >
                <option v-for="m in prodStore.models" :key="m.id" :value="m.id">
                  {{ m.name }}
                </option>
              </optgroup>

              <template v-else>
                <optgroup label="Categories">
                  <option
                    v-for="c in catStore.parentCategories"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.name }}
                  </option>
                </optgroup>
                <optgroup label="Subcategories">
                  <option
                    v-for="s in catStore.subCategories"
                    :key="s.id"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </optgroup>
              </template>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="prod-name-input"
              class="text-xs font-bold text-slate-500 uppercase"
              >Product Name</label
            >
            <input
              id="prod-name-input"
              name="product_name"
              v-model="itemForm.name"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label
                for="prod-price-input"
                class="text-xs font-bold text-slate-500 uppercase"
                >Price</label
              >
              <input
                id="prod-price-input"
                name="product_price"
                v-model.number="itemForm.price"
                type="number"
                class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label
                for="prod-stock-input"
                class="text-xs font-bold text-slate-500 uppercase"
                >Stock</label
              >
              <input
                id="prod-stock-input"
                name="product_stock"
                v-model.number="itemForm.stock"
                type="number"
                class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="prod-sku-input"
              class="text-xs font-bold text-slate-500 uppercase"
              >Product SKU</label
            >
            <input
              id="prod-sku-input"
              name="product_sku"
              v-model="itemForm.product_code"
              type="text"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="prod-desc-input"
              class="text-xs font-bold text-slate-500 uppercase"
              >Description</label
            >
            <textarea
              id="prod-desc-input"
              name="product_description"
              v-model="itemForm.description"
              @input="utils.autoResize"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all resize-none min-h-25"
            ></textarea>
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label
                for="prod-keywords-input"
                class="text-xs font-bold text-slate-500 uppercase"
                >Keywords (Comma Separated)</label
              >
              <button
                type="button"
                @click="generateKeywords"
                class="text-[10px] text-blue-600 font-bold uppercase hover:underline flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-[14px]"
                  >auto_awesome</span
                >
                Suggest
              </button>
            </div>
            <input
              id="prod-keywords-input"
              name="product_keywords"
              v-model="keywordsInput"
              type="text"
              placeholder="e.g. centrifugal, stainless steel, high pressure"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        <div
          class="col-span-2 space-y-5 my-5 bg-slate-50 p-4 rounded-lg border border-slate-200"
        >
          <div class="flex justify-between items-center">
            <label class="text-xs font-black uppercase text-slate-500"
              >Add Information Section</label
            >
            <span class="text-[10px] text-slate-400"
              >e.g. Features, Applications, Box Contents</span
            >
          </div>

          <div>
            <input
              id="section-title"
              name="section_title_input"
              type="text"
              v-model="currentSectionTitle"
              placeholder="Section Title (e.g. 'Suitable For')"
              class="w-full p-2 bg-white border border-slate-300 rounded text-sm font-bold focus:border-blue-500 outline-none"
            />
          </div>

          <div class="flex gap-2">
            <input
              id="section-item"
              name="section_item_input"
              type="text"
              v-model="currentSectionItem"
              @keydown.enter.prevent="addItemToSection"
              placeholder="Add list item..."
              class="grow p-2 bg-white border border-slate-300 rounded text-sm focus:border-blue-500 outline-none"
            />
            <button
              type="button"
              @click="addItemToSection"
              class="bg-slate-200 text-slate-600 hover:bg-slate-300 px-3 py-2 rounded font-bold text-xs uppercase"
            >
              + Add
            </button>
          </div>

          <div
            v-if="currentSectionList.length > 0"
            class="pl-4 border-l-2 border-slate-300"
          >
            <p class="text-[10px] uppercase font-bold text-slate-400 mb-2">
              Preview:
            </p>
            <ul
              class="list-disc list-inside text-xs text-slate-600 mb-3 space-y-1"
            >
              <li
                v-for="(item, idx) in currentSectionList"
                :key="idx"
                class="flex justify-between items-center"
              >
                {{ item }}
                <button
                  type="button"
                  @click="removeItemFromSection(idx)"
                  class="text-red-400 hover:text-red-600 font-bold ml-2"
                >
                  x
                </button>
              </li>
            </ul>

            <button
              type="button"
              @click="saveSection"
              class="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors"
            >
              Save "{{ currentSectionTitle }}" Section
            </button>
          </div>
        </div>

        <div
          v-if="itemForm.info_sections && itemForm.info_sections.length > 0"
          class="col-span-2 space-y-2"
        >
          <label class="text-xs font-black uppercase text-slate-500"
            >Saved Sections</label
          >
          <div
            v-for="(section, index) in itemForm.info_sections"
            :key="index"
            class="bg-white border border-slate-200 rounded p-3 relative group"
          >
            <h4 class="font-bold text-sm text-slate-800">
              {{ section.title }}
            </h4>
            <div class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="t in section.items"
                :key="t"
                class="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600"
                >{{ t }}</span
              >
            </div>
            <button
              type="button"
              @click="removeSection(index)"
              class="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
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

        <!-- External Links Builder -->
        <div
          class="col-span-2 space-y-5 my-5 bg-slate-50 p-4 rounded-lg border border-slate-200"
        >
          <div class="flex justify-between items-center">
            <label class="text-xs font-black uppercase text-slate-500"
              >Additional Resources</label
            >
            <span class="text-[10px] text-slate-400"
              >e.g. Manufacturer Site, Spec Sheet, Manual</span
            >
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              v-model="currentLinkTitle"
              placeholder="Link Title (e.g. 'View Manual')"
              class="w-full p-2 bg-white border border-slate-300 rounded text-sm font-bold focus:border-blue-500 outline-none"
            />
            <div class="flex gap-2">
              <input
                type="text"
                v-model="currentLinkUrl"
                @keydown.enter.prevent="addExternalLink"
                placeholder="URL (https://...)"
                class="grow p-2 bg-white border border-slate-300 rounded text-sm focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                @click="addExternalLink"
                class="bg-slate-200 text-slate-600 hover:bg-slate-300 px-3 py-2 rounded font-bold text-xs uppercase"
              >
                +
              </button>
            </div>
          </div>

          <div
            v-if="itemForm.externalLinks && itemForm.externalLinks.length > 0"
            class="space-y-2"
          >
            <div
              v-for="(link, idx) in itemForm.externalLinks"
              :key="idx"
              class="flex items-center justify-between bg-white p-2 rounded border border-slate-200"
            >
              <div class="text-xs">
                <span class="font-bold">{{ link.title }}:</span>
                <a
                  :href="link.url"
                  target="_blank"
                  class="text-blue-500 hover:underline truncate max-w-50 inline-block align-bottom"
                  >{{ link.url }}</a
                >
              </div>
              <button
                type="button"
                @click="removeExternalLink(idx)"
                class="text-red-400 hover:text-red-600 font-bold px-2"
              >
                x
              </button>
            </div>
          </div>
        </div>
        <div
          class="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
        >
          <div class="flex flex-col">
            <span class="text-sm font-bold text-slate-700">Has Warranty</span>
            <span class="text-[10px] text-slate-400 uppercase font-medium"
              >Display warranty information</span
            >
          </div>

          <input
            type="checkbox"
            id="has-warranty-input"
            name="has_warranty_status"
            v-model="itemForm.hasWarranty"
            class="hidden"
          />

          <button
            type="button"
            @click="itemForm.hasWarranty = !itemForm.hasWarranty"
            class="w-12 h-6 rounded-full transition-all relative"
            :class="itemForm.hasWarranty ? 'bg-sky-500' : 'bg-slate-300'"
          >
            <div
              class="absolute top-1 bg-white w-4 h-4 rounded-full transition-all"
              :class="itemForm.hasWarranty ? 'left-7' : 'left-1'"
            ></div>
          </button>
        </div>
        <div
          class="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
        >
          <div class="flex flex-col">
            <span class="text-sm font-bold text-slate-700"
              >Publish Product</span
            >
            <span class="text-[10px] text-slate-400 uppercase font-medium"
              >Make this visible to customers</span
            >
          </div>

          <input
            type="checkbox"
            id="is-published-input"
            name="is_published_status"
            v-model="itemForm.isPublished"
            class="hidden"
          />

          <button
            type="button"
            @click="itemForm.isPublished = !itemForm.isPublished"
            class="w-12 h-6 rounded-full transition-all relative"
            :class="itemForm.isPublished ? 'bg-sky-500' : 'bg-slate-300'"
          >
            <div
              class="absolute top-1 bg-white w-4 h-4 rounded-full transition-all"
              :class="itemForm.isPublished ? 'left-7' : 'left-1'"
            ></div>
          </button>
        </div>
      </div>
    </template>

    <template #actions>
      <button
        v-if="!isProductPublished"
        @click="handleSubmit"
        class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-all w-full md:w-auto"
      >
        {{ utils.createModal.isEdit ? 'Update Changes' : 'Create Item' }}
      </button>
    </template>
  </BaseModal>
</template>
