<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import TrademarkTermsPolicy from '../footer/TrademarkTermsPolicy.vue'
import Dropdown from '@/components/nav/Dropdown.vue'
import Logo from '../logo/Logo.vue'
import { useNavStore } from '@/stores/navStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { useOrderStore } from '@/stores/orderStore'
import { useMessageStore } from '@/stores/messageStore'

const navStore = useNavStore()
const cartStore = useCartStore()
const authStore = useAuthStore()
const orderStore = useOrderStore()
const messageStore = useMessageStore()

onMounted(() => {
  navStore.subscribeToNav()
})

const regularLinks = computed(() =>
  navStore.headerItems.filter((item) => !item.isUserMenu),
)

const accountSubLinks = computed(() => {
  const links = [{ name: 'Dashboard', to: '/dashboard', icon: 'dashboard' }]

  if (authStore.isAdmin) {
    links.push({
      name: 'Messages',
      to: '/dashboard/messages',
      icon: 'mail',
      badge: messageStore.unreadCount > 0 ? messageStore.unreadCount : null,
    })
    links.push({
      name: 'Orders',
      to: '/dashboard/orders',
      icon: 'receipt_long',
      badge: orderStore.pendingCount > 0 ? orderStore.pendingCount : null,
    })
    links.push({
      name: 'Settings',
      to: '/dashboard/settings',
      icon: 'settings',
    })
  }
  return links
})

// Keep messages in sync if user is admin, so badges update in real-time anywhere on the site
watch(
  () => authStore.isAdmin,
  (isAdmin) => {
    if (isAdmin) {
      messageStore.subscribeToMessages()
      orderStore.fetchOrders()
    } else messageStore.stopMessagesListener()
  },
  { immediate: true },
)

const isOpened = ref(false)

function toggleOpen() {
  isOpened.value = !isOpened.value
}

const handleLogout = () => {
  authStore.logout()
}
</script>

<template>
  <header
    class="bg-white/90 backdrop-blur-md border-b border-slate-200/60 sticky top-0 left-0 w-full z-50"
  >
    <nav class="container flex items-center justify-between h-12">
      <Logo />

      <div
        :class="isOpened ? 'right-0' : '-right-full'"
        class="fixed top-0 min-h-screen w-full bg-white/95 backdrop-blur-md flex flex-col items-center justify-around transition-all md:transition-none md:static md:bg-transparent md:backdrop-blur-none md:min-h-fit md:w-auto z-50"
      >
        <ul
          class="flex flex-col md:flex-row gap-6 items-center justify-center w-full md:w-auto p-6 md:p-0"
        >
          <template v-for="link in regularLinks" :key="link.name || link.icon">
            <!-- Regular Links -->
            <li
              v-if="link.to !== '/dashboard' || authStore.isAdmin"
              class="w-full md:w-auto text-center relative group"
            >
              <Dropdown v-if="link.subLinks && link.subLinks.length">
                <template #trigger>
                  <div
                    class="flex items-center justify-center gap-2 py-2 md:py-0 font-bold text-sm transition-colors"
                  >
                    <span v-if="link.name">{{ link.name }}</span>
                    <span v-else class="material-symbols-outlined text-2xl">{{
                      link.icon
                    }}</span>
                  </div>
                </template>
                <template #content="{ close }">
                  <!-- Generic Dropdown Fallback -->
                  <ul class="flex flex-col py-2 text-left">
                    <li v-for="sub in link.subLinks" :key="sub.name">
                      <RouterLink
                        v-if="sub.to"
                        :to="sub.to"
                        @click="close"
                        class="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                      >
                        {{ sub.name }}
                      </RouterLink>
                    </li>
                  </ul>
                </template>
              </Dropdown>
              <RouterLink
                v-else
                :to="link.to"
                custom
                v-slot="{ href, navigate, isActive }"
              >
                <a
                  :href="href"
                  @click="(navigate($event), (isOpened = false))"
                  class="font-bold text-sm w-full transition-colors duration-200"
                  :class="
                    isActive
                      ? 'text-sky-600'
                      : 'text-slate-700 hover:text-slate-500'
                  "
                >
                  <span v-if="link.name">
                    {{ link.name }}
                  </span>
                  <span v-else class="material-symbols-outlined">
                    {{ link.icon }}
                  </span>
                </a>
              </RouterLink>
            </li>
          </template>
          <!-- Cart Icon (Desktop & Mobile inside menu) -->
          <Transition name="scale-slide">
            <li
              v-if="cartStore.items.length"
              class="w-full md:w-auto text-center"
            >
              <button
                @click="(cartStore.toggleCart(), (isOpened = false))"
                class="relative p-2 text-slate-600 hover:text-blue-600 transition-colors inline-flex"
                :class="{
                  'animate-bounce text-blue-600': cartStore.isAnimating,
                }"
              >
                <span class="material-symbols-outlined">shopping_cart</span>
                <span
                  v-if="cartStore.items.length"
                  class="absolute -top-0.5 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                >
                  {{ cartStore.items.length }}
                </span>
              </button>
            </li>
          </Transition>
          <!-- Hardcoded User Menu Link -->
          <li
            v-if="authStore.user"
            class="w-full md:w-auto text-center relative group"
          >
            <Dropdown>
              <template #trigger>
                <div
                  class="flex items-center justify-center gap-2 py-2 md:py-0 font-bold text-sm transition-colors"
                >
                  <span class="material-symbols-outlined text-2xl"
                    >account_circle</span
                  >
                  <span class="md:hidden">Account</span>
                </div>
              </template>
              <template #content="{ close }">
                <div class="flex flex-col text-left">
                  <!-- User Details -->
                  <div
                    class="px-5 py-4 border-b border-slate-100 bg-slate-50/50"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0"
                      >
                        <img
                          v-if="authStore.user?.photoURL"
                          :src="authStore.user.photoURL"
                          class="w-full h-full rounded-full object-cover"
                        />
                        <span v-else>{{
                          authStore.user?.displayName?.charAt(0)
                        }}</span>
                      </div>
                      <div class="overflow-hidden">
                        <p class="text-sm font-bold text-slate-800 truncate">
                          {{ authStore.user?.displayName }}
                        </p>
                        <p class="text-xs text-slate-500 truncate">
                          {{ authStore.user?.email }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Links -->
                  <div class="p-2">
                    <template v-for="sub in accountSubLinks" :key="sub.name">
                      <RouterLink
                        v-if="sub.to !== '/dashboard' || authStore.isAdmin"
                        :to="sub.to"
                        @click="close"
                        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <span class="material-symbols-outlined text-[20px]">{{
                          sub.icon
                        }}</span>
                        {{ sub.name }}
                        <span
                          v-if="sub.badge"
                          class="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                          >{{ sub.badge }}</span
                        >
                      </RouterLink>
                    </template>
                  </div>

                  <!-- Logout -->
                  <div class="p-2 border-t border-slate-100">
                    <button
                      @click="(handleLogout(), close())"
                      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <span class="material-symbols-outlined text-[20px]"
                        >logout</span
                      >
                      Log Out
                    </button>
                  </div>
                </div>
              </template>
            </Dropdown>
          </li>
        </ul>
        <div class="mt-auto p-6 md:hidden w-full border-t border-slate-100">
          <TrademarkTermsPolicy :mini="true" @linkClicked="isOpened = false" />
        </div>
      </div>
      <button
        @click="toggleOpen"
        class="cursor-pointer md:hidden z-50 flex items-center p-2 text-slate-600"
      >
        <span class="material-symbols-outlined text-2xl">{{
          isOpened ? 'close' : 'menu'
        }}</span>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.scale-slide-enter-active,
.scale-slide-leave-active {
  transition: all 0.3s ease;
}

.scale-slide-enter-from,
.scale-slide-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
