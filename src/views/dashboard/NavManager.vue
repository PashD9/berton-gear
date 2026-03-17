<script setup>
import { useNavStore } from '@/stores/navStore'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import draggable from 'vuedraggable'
import { useRouter } from 'vue-router'

const breadcrumb = useBreadcrumbStore()
const router = useRouter()

const navStore = useNavStore()
const localItems = ref([])

const formData = ref({
  id: null, // For edit mode
  name: '',
  icon: '',
  url: '',
  position: 'header',
  order: 0,
  isDropdown: false,
  isUserMenu: false,
  subLinks: [],
  footerGroup: '',
})

onMounted(() => {
  breadcrumb.set([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Navigation Manager' },
  ])

  navStore.subscribeToNav()
})

onUnmounted(() => breadcrumb.clear())

// Sync local items with store
watch(
  () => navStore.menuItems,
  (newVal) => {
    localItems.value = [...newVal]
  },
  { immediate: true, deep: true },
)

// When isUserMenu is checked, isDropdown should also be checked and disabled.
watch(
  () => formData.value.isUserMenu,
  (isUser) => {
    if (isUser) {
      formData.value.isDropdown = true
    }
  },
)

const availableRoutes = computed(() => {
  return router
    .getRoutes()
    .filter((r) => r.meta?.isPublic)
    .map((r) => r.path)
})

const isEditing = computed(() => !!formData.value.id)

const isValid = computed(() => {
  if (formData.value.isDropdown || formData.value.isUserMenu) return true
  if (!formData.value.url) return false
  const url = formData.value.url
  const isExternal = url.startsWith('http')
  const pathWithoutHash = url.split('#')[0]
  const isValidInternal = availableRoutes.value.includes(pathWithoutHash)
  return isExternal || isValidInternal
})

function resetForm() {
  formData.value = {
    id: null,
    name: '',
    icon: '',
    url: '',
    position: 'header',
    order: localItems.value.length,
    isDropdown: false,
    isUserMenu: false,
    subLinks: [],
    footerGroup: '',
  }
}

async function handleSubmit() {
  // Hard Block Logic
  if (!formData.value.isDropdown && !formData.value.isUserMenu) {
    const url = formData.value.url
    const isExternal = url.startsWith('http')
    const pathWithoutHash = url.split('#')[0]
    const isValidInternal = availableRoutes.value.includes(pathWithoutHash)

    if (!isExternal && !isValidInternal) {
      alert(
        'Error: The route "' +
          url +
          '" does not exist in the application. Link rejected.',
      )
      return // This stops the function completely
    }
  }

  const treatAsDropdown = formData.value.isDropdown || formData.value.isUserMenu

  // Clean up data before saving
  const payload = {
    name: formData.value.name,
    icon: formData.value.icon,
    position: formData.value.position,
    order: formData.value.order,
    isUserMenu: formData.value.isUserMenu,
    // Only save URL if it's not a dropdown
    to: treatAsDropdown ? '' : formData.value.url,
    // Only save subLinks if it is a dropdown
    subLinks: treatAsDropdown ? formData.value.subLinks : [],
    footerGroup: formData.value.footerGroup,
  }

  if (isEditing.value) {
    await navStore.updateNavLink(formData.value.id, payload)
  } else {
    await navStore.addNavLink(payload)
  }
  resetForm()
}

function editLink(item) {
  formData.value = {
    ...item,
    // Ensure defaults for editing existing items
    url: item.to || '',
    position: item.position || 'header',
    isDropdown:
      !!(item.subLinks && item.subLinks.length > 0) || item.isUserMenu,
    subLinks: item.subLinks || [],
    footerGroup: item.footerGroup || '',
  }
}

async function deleteLink(id) {
  if (confirm('Are you sure you want to delete this link?')) {
    await navStore.deleteNavLink(id)
  }
}

function onDragEnd() {
  // Update order for all items based on new index
  localItems.value.forEach((item, index) => {
    if (item.order !== index) {
      navStore.updateNavLink(item.id, { order: index })
    }
  })
}

function addSubLink() {
  formData.value.subLinks.push({ name: '', to: '', icon: '' })
}

function removeSubLink(index) {
  formData.value.subLinks.splice(index, 1)
}
</script>

<template>
  <section class="py-5">
    <div class="container">
      <div class="p-6 bg-white rounded-lg shadow">
        <h2 class="text-xl font-bold mb-4">Navigation Manager</h2>

        <!-- Form -->
        <form
          @submit.prevent="handleSubmit"
          class="mb-8 p-4 bg-slate-50 rounded border border-slate-200"
        >
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label
                for="nav-name"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Name</label
              >
              <input
                id="nav-name"
                name="nav-name"
                v-model="formData.name"
                type="text"
                placeholder="e.g. Home"
                class="w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border"
              />
            </div>
            <div>
              <label
                for="nav-icon"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Icon</label
              >
              <input
                id="nav-icon"
                name="nav-icon"
                v-model="formData.icon"
                type="text"
                placeholder="e.g. home"
                class="w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border"
              />
            </div>
            <div>
              <label
                for="nav-position"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Position</label
              >
              <select
                id="nav-position"
                name="nav-position"
                v-model="formData.position"
                class="w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border"
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div v-if="!formData.isDropdown">
              <label
                for="nav-url"
                class="block text-sm font-medium text-slate-700 mb-1"
                >URL</label
              >
              <input
                id="nav-url"
                name="nav_url"
                v-model="formData.url"
                type="text"
                list="route-suggestions"
                placeholder="e.g. /home"
                class="w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border"
                :class="{
                  'border-red-500 focus:border-red-500 focus:ring-red-500':
                    formData.url && !isValid,
                }"
              />
              <datalist id="route-suggestions">
                <option
                  v-for="route in availableRoutes"
                  :key="route"
                  :value="route"
                />
              </datalist>
            </div>
            <div>
              <label
                for="nav-order"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Order</label
              >
              <input
                id="nav-order"
                name="nav-order"
                v-model.number="formData.order"
                type="number"
                class="w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border"
              />
            </div>
            <div
              v-if="
                formData.position === 'footer' || formData.position === 'both'
              "
            >
              <label
                for="nav-footer-group"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Footer Group</label
              >
              <input
                id="nav-footer-group"
                name="nav-footer-group"
                v-model="formData.footerGroup"
                type="text"
                placeholder="e.g. Products"
                class="w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border"
              />
            </div>
          </div>

          <!-- Toggles -->
          <div class="flex gap-6 mb-4">
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                id="nav-is-dropdown"
                name="nav-is-dropdown"
                type="checkbox"
                :disabled="formData.isUserMenu"
                v-model="formData.isDropdown"
                class="sr-only peer"
              />
              <div
                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"
              ></div>
              <span class="ml-3 text-sm font-medium text-gray-900"
                >Is Dropdown</span
              >
            </label>

            <label class="relative inline-flex items-center cursor-pointer">
              <input
                id="nav-is-user-menu"
                name="nav-is-user-menu"
                type="checkbox"
                v-model="formData.isUserMenu"
                class="sr-only peer"
              />
              <div
                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"
              ></div>
              <span class="ml-3 text-sm font-medium text-gray-900"
                >Is User Menu</span
              >
            </label>
          </div>

          <!-- SubLinks Editor -->
          <div
            v-if="formData.isDropdown || formData.isUserMenu"
            class="mb-4 p-4 bg-white rounded border border-slate-200"
          >
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-medium text-sm text-slate-700">Sub Links</h3>
              <button
                type="button"
                @click="addSubLink"
                class="text-xs text-sky-600 hover:text-sky-800 font-bold"
              >
                + Add Sub Link
              </button>
            </div>
            <div
              v-if="formData.subLinks.length === 0"
              class="text-sm text-slate-400 italic"
            >
              No sub links added.
            </div>
            <div
              v-for="(sub, index) in formData.subLinks"
              :key="index"
              class="flex gap-2 mb-2 items-end"
            >
              <div class="flex-1">
                <label
                  :for="'sub-name-' + index"
                  class="block text-xs text-slate-500 mb-1"
                  >Name</label
                >
                <input
                  :id="'sub-name-' + index"
                  :name="'sub-name-' + index"
                  v-model="sub.name"
                  type="text"
                  class="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-1.5 border"
                />
              </div>
              <div class="flex-1">
                <label
                  :for="'sub-to-' + index"
                  class="block text-xs text-slate-500 mb-1"
                  >URL</label
                >
                <input
                  :id="'sub-to-' + index"
                  :name="'sub-to-' + index"
                  v-model="sub.to"
                  type="text"
                  class="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-1.5 border"
                />
              </div>
              <div class="w-24">
                <label
                  :for="'sub-icon-' + index"
                  class="block text-xs text-slate-500 mb-1"
                  >Icon</label
                >
                <input
                  :id="'sub-icon-' + index"
                  :name="'sub-icon-' + index"
                  v-model="sub.icon"
                  type="text"
                  class="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-1.5 border"
                />
              </div>
              <button
                type="button"
                @click="removeSubLink(index)"
                class="p-2 text-red-500 hover:bg-red-50 rounded"
              >
                <span class="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              type="submit"
              :disabled="!isValid"
              class="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isEditing ? 'Update Link' : 'Add Link' }}
            </button>
            <button
              v-if="isEditing"
              @click="resetForm"
              type="button"
              class="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        <!-- List -->
        <draggable
          v-model="localItems"
          item-key="id"
          @end="onDragEnd"
          handle=".drag-handle"
          class="space-y-2"
        >
          <template #item="{ element }">
            <div
              class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded hover:border-sky-300 transition-colors group"
            >
              <div class="flex items-center gap-3">
                <span
                  class="drag-handle cursor-move text-slate-400 hover:text-slate-600 material-symbols-outlined select-none"
                  >drag_indicator</span
                >
                <div>
                  <div class="font-medium">
                    {{ element.name }}
                    <span
                      v-if="element.icon"
                      class="material-symbols-outlined text-sm align-middle ml-1"
                      >{{ element.icon }}</span
                    >
                  </div>
                  <div class="text-xs text-slate-500">
                    <span
                      class="uppercase font-bold text-[10px] bg-slate-100 px-1 rounded mr-1"
                      >{{ element.position || 'HEADER' }}</span
                    >
                    {{
                      element.to ||
                      (element.subLinks
                        ? element.subLinks.length + ' sub-links'
                        : 'No URL')
                    }}
                  </div>
                </div>
              </div>
              <div
                class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  @click="editLink(element)"
                  class="p-1 text-sky-600 hover:bg-sky-50 rounded"
                  title="Edit"
                >
                  <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                  @click="deleteLink(element.id)"
                  class="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          </template>
        </draggable>

        <div
          v-if="localItems.length === 0"
          class="text-center py-8 text-slate-500"
        >
          No navigation links found. Add one above.
        </div>
      </div>
    </div>
  </section>
</template>
