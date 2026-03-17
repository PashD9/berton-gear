<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useMessageStore } from '@/stores/messageStore'
import { useOrderStore } from '@/stores/orderStore'
import Logo from '@/components/logo/Logo.vue'

const messageStore = useMessageStore()
const authStore = useAuthStore()

onMounted(() => {
  // Ensure messages are fetched when the dashboard is loaded
  if (authStore.isAdmin) {
    orderStore.fetchOrders()
    messageStore.subscribeToMessages()
  }
})

onUnmounted(() => messageStore.stopMessagesListener())

const links = computed(() => [
  { name: 'Dashboard', icon: 'home', to: '/dashboard', exact: true },
  { name: 'Categories', icon: 'stacks', to: '/dashboard/categories' },
  { name: 'Products', icon: 'box', to: '/dashboard/products' },
  {
    name: 'Orders',
    icon: 'receipt_long',
    to: '/dashboard/orders',
    badge: orderStore.pendingCount,
  },
  {
    name: 'Messages',
    icon: 'mail',
    to: '/dashboard/messages',
    badge: messageStore.unreadCount,
  },
  { name: 'Sections', icon: 'splitscreen', to: '/dashboard/sections' },
  { name: 'Settings', icon: 'settings', to: '/dashboard/settings' },
  {
    name: 'Navigation',
    icon: 'navigation',
    to: '/dashboard/navigationmanager',
  },
])
const orderStore = useOrderStore()
</script>

<template>
  <aside
    class="bg-slate-900 text-slate-300 sticky top-0 h-screen w-20 lg:w-56 shrink-0 transition-all duration-300 ease-in-out"
  >
    <nav class="flex flex-col h-full p-2">
      <div class="h-12 flex items-center justify-center shrink-0 mb-4">
        <Logo />
      </div>
      <ul class="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        <li v-for="link in links" :key="link.name">
          <RouterLink
            :to="link.to"
            custom
            v-slot="{ href, navigate, isActive, isExactActive }"
          >
            <a
              :href="href"
              @click="navigate"
              class="flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2 lg:p-3 rounded-lg transition-colors duration-200 justify-center lg:justify-start"
              :class="
                (link.exact ? isExactActive : isActive)
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              "
            >
              <span class="material-symbols-outlined text-2xl">{{
                link.icon
              }}</span>
              <span
                class="text-[10px] lg:text-sm font-bold whitespace-nowrap"
                >{{ link.name }}</span
              >
              <span
                v-if="link.badge > 0"
                class="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full hidden lg:inline-flex items-center justify-center"
              >
                {{ link.badge }}
              </span>
            </a>
          </RouterLink>
        </li>
      </ul>
      <ul class="flex flex-col gap-2 mt-auto">
        <li>
          <a
            @click="authStore.logout"
            class="flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2 lg:p-3 rounded-lg transition-colors duration-200 justify-center lg:justify-start text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
          >
            <span class="material-symbols-outlined text-2xl">logout</span>
            <span class="text-[10px] lg:text-sm font-bold whitespace-nowrap"
              >Logout</span
            >
          </a>
        </li>
      </ul>
    </nav>
  </aside>
</template>
