<script setup>
import { onMounted, onUnmounted, computed, reactive } from 'vue'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useMessageStore } from '@/stores/messageStore'
import { useAuthStore } from '@/stores/authStore'
import { useUtilityStore } from '@/stores/utilityStore'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import ProductChart from './components/ProductChart.vue'

const breadcrumb = useBreadcrumbStore()
const prodStore = useProductStore()
const catStore = useCategoryStore()
const messageStore = useMessageStore()
const authStore = useAuthStore()
const utils = useUtilityStore()
const router = useRouter()

const isChartCollapsed = ref(true)
const isRefreshing = ref(false)
const newAdminEmail = ref('')

const showNoteModal = ref(false)
const editingNoteId = ref(null)
const noteForm = reactive({ title: '', text: '' })

onMounted(() => {
  breadcrumb.set([{ label: 'Dashboard' }])
  // Ensure we have data for the dashboard stats
  prodStore.fetchAllItems()
  catStore.fetchCategories()
  authStore.fetchAllUsers()
  messageStore.subscribeToMessages()
})

onUnmounted(() => {
  breadcrumb.clear()
  prodStore.stopAllListeners()
  authStore.allUsers = []
  catStore.stopListener()
  messageStore.stopMessagesListener()
})

// Stats
const allProducts = computed(() => [
  ...prodStore.products,
  ...prodStore.models,
  ...prodStore.variants,
])
const totalProducts = computed(() => allProducts.value.length)
const totalCategories = computed(() => catStore.categories.length)
const lowStockCount = computed(
  () => allProducts.value.filter((p) => p.stock < 5 && p.stock > 0).length,
)
const unpublishedCount = computed(
  () => allProducts.value.filter((p) => !p.isPublished).length,
)

// Recent Items (Top 5)
const recentProducts = computed(() => {
  return allProducts.value
    .sort((a, b) => {
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0
      return dateB - dateA
    })
    .slice(0, 5)
})

const navigateTo = (path) => router.push(path)

const refreshDashboard = () => {
  isRefreshing.value = true

  // Reset Stores
  prodStore.stopAllListeners()
  catStore.stopListener()

  // Re-fetch
  prodStore.fetchAllItems()
  catStore.fetchCategories()

  setTimeout(() => (isRefreshing.value = false), 1000)
}

const handleMakeAdmin = async () => {
  if (!newAdminEmail.value) return
  const emailToMakeAdmin = newAdminEmail.value
  utils.openConfirm(
    'Grant Admin Privileges',
    `Are you sure you want to make ${emailToMakeAdmin} an admin?`,
    async () => {
      await authStore.makeAdmin(emailToMakeAdmin)
      newAdminEmail.value = ''
    },
    'Grant Access',
    'bg-blue-600',
  )
}

const handleRevokeAdmin = async (email) => {
  if (!email) return
  utils.openConfirm(
    'Revoke Admin Privileges',
    `Are you sure you want to revoke admin rights for ${email}?`,
    async () => {
      await authStore.revokeAdmin(email)
    },
    'Revoke',
    'bg-red-600',
  )
}

const handleToggleStatus = async (user) => {
  const action = user.disabled ? 'enable' : 'disable'
  utils.openConfirm(
    `${action.charAt(0).toUpperCase() + action.slice(1)} User Account`,
    `Are you sure you want to ${action} access for ${user.email}?`,
    async () => {
      await authStore.toggleUserStatus(user.email, user.disabled)
    },
    action.charAt(0).toUpperCase() + action.slice(1),
    user.disabled ? 'bg-green-600' : 'bg-amber-600',
  )
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Welcome Section -->
    <div
      class="flex flex-col lg:flex-row items-start justify-between lg:items-center gap-2"
    >
      <div>
        <h2 class="font-medium text-slate-800">Dashboard Overview</h2>
        <p class="text-sm text-slate-500">
          Welcome back to the PumpHaus control center.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          @click="refreshDashboard"
          class="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:text-blue-600 hover:border-blue-300 transition-all"
          title="Refresh Dashboard"
        >
          <span
            class="material-symbols-outlined"
            :class="{ 'animate-spin': isRefreshing }"
            >refresh</span
          >
        </button>
        <button
          @click="navigateTo('/dashboard/products')"
          class="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Manage Products
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <!-- Total Products -->
      <div
        class="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition-all"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="p-2 bg-blue-50 rounded-lg text-blue-600">
            <span class="material-symbols-outlined">inventory_2</span>
          </div>
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Total</span
          >
        </div>
        <div class="text-3xl font-black text-slate-800">
          {{ totalProducts }}
        </div>
        <div class="text-sm text-slate-500 mt-1">Active Products</div>
      </div>

      <!-- Categories -->
      <div
        class="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition-all"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="p-2 bg-purple-50 rounded-lg text-purple-600">
            <span class="material-symbols-outlined">category</span>
          </div>
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Catalog</span
          >
        </div>
        <div class="text-3xl font-black text-slate-800">
          {{ totalCategories }}
        </div>
        <div class="text-sm text-slate-500 mt-1">Product Categories</div>
      </div>

      <!-- Unpublished / Drafts -->
      <div
        class="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition-all"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="p-2 bg-amber-50 rounded-lg text-amber-600">
            <span class="material-symbols-outlined">visibility_off</span>
          </div>
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Drafts</span
          >
        </div>
        <div class="text-3xl font-black text-slate-800">
          {{ unpublishedCount }}
        </div>
        <div class="text-sm text-slate-500 mt-1">Unpublished Items</div>
      </div>

      <!-- Low Stock -->
      <div
        class="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition-all"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="p-2 bg-red-50 rounded-lg text-red-600">
            <span class="material-symbols-outlined">warning</span>
          </div>
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Alerts</span
          >
        </div>
        <div class="text-3xl font-black text-slate-800">
          {{ lowStockCount }}
        </div>
        <div class="text-sm text-slate-500 mt-1">Low Stock Items</div>
      </div>

      <!-- Messages -->
      <div
        class="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition-all"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <span class="material-symbols-outlined">mail</span>
          </div>
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Messages</span
          >
        </div>
        <div class="text-3xl font-black text-slate-800">
          {{ messageStore.unreadCount }}
        </div>
        <div class="text-sm text-slate-500 mt-1">Unread Inquiries</div>
      </div>
    </div>

    <!-- Chart Section -->
    <div
      class="bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all"
    >
      <div class="p-6 border-b border-slate-100">
        <div class="flex justify-between items-center">
          <h3 class="font-bold text-slate-800">
            Product Additions (Last 12 Months)
          </h3>
          <button
            @click="isChartCollapsed = !isChartCollapsed"
            class="text-slate-500 hover:text-slate-700"
          >
            <span v-if="isChartCollapsed" class="material-symbols-outlined"
              >expand_more</span
            >
            <span v-else class="material-symbols-outlined">expand_less</span>
          </button>
        </div>
      </div>

      <div v-if="!isChartCollapsed" class="p-6">
        <ProductChart :products="allProducts" />
      </div>
    </div>

    <!-- Recent Activity Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <!-- Recent Products List -->
      <div
        class="xl:col-span-2 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all overflow-hidden"
      >
        <div
          class="p-6 border-b border-slate-100 flex justify-between items-center"
        >
          <h3 class="font-bold text-slate-800">Recently Added</h3>
          <button
            @click="navigateTo('/dashboard/products')"
            class="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
          >
            View All
          </button>
        </div>
        <div class="divide-y divide-slate-50">
          <div
            v-for="product in recentProducts"
            :key="product.id"
            class="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
          >
            <div
              class="w-12 h-12 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-200"
            >
              <img
                :src="product.imageURL || '/placeholder-pump.jpg'"
                class="w-full h-full object-contain mix-blend-multiply"
              />
            </div>
            <div class="grow min-w-0">
              <h4 class="font-medium text-slate-900 truncate">
                {{ product.name }}
              </h4>
              <p class="text-xs text-slate-500 truncate">
                {{ product.product_code || 'No SKU' }}
              </p>
            </div>
            <div class="text-right">
              <span
                :class="
                  product.isPublished
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                "
                class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide"
              >
                {{ product.isPublished ? 'Live' : 'Draft' }}
              </span>
            </div>
          </div>
          <div
            v-if="recentProducts.length === 0"
            class="p-8 text-center text-slate-400 text-sm"
          >
            No products found. Start adding some!
          </div>
        </div>
      </div>

      <!-- Quick Actions / System Status -->
      <div class="space-y-6">
        <div
          class="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white"
        >
          <h3 class="font-bold text-lg mb-2">Quick Actions</h3>
          <p class="text-slate-400 text-sm mb-6">
            Common tasks to manage your inventory.
          </p>

          <div class="space-y-3">
            <button
              @click="navigateTo('/dashboard/products')"
              class="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
            >
              <span class="material-symbols-outlined text-sky-400"
                >add_circle</span
              >
              Add New Product
            </button>
            <button
              @click="navigateTo('/dashboard/categories')"
              class="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
            >
              <span class="material-symbols-outlined text-purple-400"
                >folder_open</span
              >
              Manage Categories
            </button>
            <button
              @click="navigateTo('/dashboard/orders')"
              class="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
            >
              <span class="material-symbols-outlined text-emerald-400"
                >receipt_long</span
              >
              View Orders
            </button>
            <button
              @click="navigateTo('/dashboard/messages')"
              class="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
            >
              <span class="material-symbols-outlined text-indigo-400"
                >mail</span
              >
              Check Messages
            </button>
          </div>
        </div>

        <div
          class="bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all p-6"
        >
          <h3 class="font-bold text-slate-800 mb-4">System Status</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-500">Database Connection</span>
              <span class="flex items-center gap-2 text-green-600 font-medium">
                <span
                  class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                ></span>
                Online
              </span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-500">Last Sync</span>
              <span class="text-slate-900 font-medium">Just now</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-500">Version</span>
              <span class="text-slate-900 font-medium">v1.0.2</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Actions & User List -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- User Management -->
      <div
        class="lg:col-span-2 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all overflow-hidden"
      >
        <div
          class="p-6 border-b border-slate-100 flex justify-between items-center"
        >
          <h3 class="font-bold text-slate-800">User Management</h3>
        </div>
        <div class="p-6">
          <div
            v-if="authStore.allUsers.length > 0"
            class="divide-y divide-slate-100 -mx-6"
          >
            <div
              v-for="user in authStore.allUsers"
              :key="user.uid"
              class="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
            >
              <div
                class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg shrink-0"
              >
                <img
                  v-if="user.photoURL"
                  :src="user.photoURL"
                  class="w-full h-full rounded-full object-cover"
                  alt="User Avatar"
                />
                <span v-else>{{
                  user.displayName?.charAt(0) || user.email?.charAt(0)
                }}</span>
              </div>
              <div class="grow min-w-0">
                <h4 class="font-medium text-slate-900 truncate">
                  {{ user.displayName || 'No Name' }}
                </h4>
                <p class="text-xs text-slate-500 truncate">
                  {{ user.email }}
                </p>
              </div>
              <div
                class="hidden md:block text-sm text-slate-500 text-right shrink-0"
              >
                <p class="font-medium text-slate-800">
                  {{
                    user.createdAt
                      ? utils.formatDate(user.createdAt)
                      : 'Unknown'
                  }}
                </p>
                <p class="text-xs">Joined</p>
              </div>
              <div
                class="hidden md:block text-sm text-slate-500 text-right shrink-0"
              >
                <p class="font-medium text-slate-800">
                  {{
                    user.lastLoginAt
                      ? utils.formatDate(user.lastLoginAt)
                      : 'Never'
                  }}
                </p>
                <p class="text-xs">Last Login</p>
              </div>
              <div class="ml-auto flex items-center gap-4">
                <span
                  v-if="user.role === 'admin'"
                  class="px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-700"
                >
                  Admin
                </span>
                <span
                  v-else
                  class="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600"
                >
                  User
                </span>
                <button
                  v-if="user.uid !== authStore.user.uid"
                  @click="handleToggleStatus(user)"
                  class="text-slate-400 transition-colors"
                  :class="
                    user.disabled
                      ? 'hover:text-green-600'
                      : 'hover:text-amber-600'
                  "
                  :title="user.disabled ? 'Enable Account' : 'Disable Account'"
                >
                  <span class="material-symbols-outlined text-xl">{{
                    user.disabled ? 'check_circle' : 'block'
                  }}</span>
                </button>
                <button
                  v-if="
                    user.role === 'admin' && user.uid !== authStore.user.uid
                  "
                  @click="handleRevokeAdmin(user.email)"
                  class="text-slate-400 hover:text-red-600 transition-colors"
                  title="Revoke Admin Privileges"
                >
                  <span class="material-symbols-outlined text-xl"
                    >person_remove</span
                  >
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-slate-400 text-sm">
            <span v-if="utils.loading">Loading users...</span>
            <span v-else>No users found.</span>
          </div>
        </div>
      </div>

      <!-- Make Admin Form -->
      <div class="space-y-6">
        <div
          class="bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all p-6"
        >
          <h3 class="font-bold text-slate-800 mb-4">Grant Admin Privileges</h3>
          <form @submit.prevent="handleMakeAdmin" class="space-y-4">
            <div>
              <label
                for="admin-email"
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >User Email</label
              >
              <input
                id="admin-email"
                name="admin-email"
                type="email"
                v-model="newAdminEmail"
                required
                class="w-full rounded border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <button
              type="submit"
              :disabled="utils.loading || !newAdminEmail"
              class="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span
                v-if="utils.loading"
                class="material-symbols-outlined animate-spin text-lg"
                >progress_activity</span
              >
              Make Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Simple Modal for Warranty Notes -->
  <div
    v-if="showNoteModal"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <h3 class="text-lg font-bold mb-4">
        {{ editingNoteId ? 'Edit Note' : 'Add Warranty Note' }}
      </h3>
      <form @submit.prevent="saveNote" class="space-y-4">
        <div>
          <label
            for="note-title"
            class="block text-sm font-medium text-slate-700 mb-1"
            >Title</label
          >
          <input
            id="note-title"
            name="note-title"
            v-model="noteForm.title"
            type="text"
            required
            class="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder="e.g. Standard Warranty"
          />
        </div>
        <div>
          <label
            for="note-content"
            class="block text-sm font-medium text-slate-700 mb-1"
            >Content</label
          >
          <textarea
            id="note-content"
            name="note-content"
            v-model="noteForm.text"
            required
            rows="3"
            class="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder="Warranty details..."
          ></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="closeNoteModal"
            class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
