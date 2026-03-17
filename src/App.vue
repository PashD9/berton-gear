<script setup>
import ConfirmationModal from '@/components/modal/ConfirmationModal.vue'
import CookieBanner from '@/components/common/CookieBanner.vue'
import ToastNotification from './components/common/ToastNotification.vue'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useSettingsStore } from '@/stores/settingsStore'

const route = useRoute()
const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.subscribe()
})

const siteName = computed(
  () => settingsStore.settings.site_name || 'Berton Gear',
)
const tagline = computed(() => settingsStore.settings.tagline || '')
const defaultDescription = computed(
  () =>
    settingsStore.settings.seo_defaults?.meta_description ||
    'Industrial pumping solutions and water flow engineering.',
)

useHead({
  // Sets the title template: "Page Title | PumpHaus"
  titleTemplate: (title) => {
    const name = siteName.value
    if (title === name) return title
    return route.name === 'Home' ? `${name} | ${title}` : `${title} | ${name}`
  },
  title: computed(() => {
    if (route.name === 'Home') return tagline.value || siteName.value
    return route.meta?.title || siteName.value
  }),
  meta: [
    { name: 'description', content: defaultDescription },
    {
      property: 'og:title',
      content: computed(() => {
        const name = siteName.value
        if (!route.meta?.title) return name
        return route.name === 'Home'
          ? `${name} | ${route.meta.title}`
          : `${route.meta.title} | ${name}`
      }),
    },
    { property: 'og:description', content: defaultDescription },
    { property: 'og:image', content: '/logo.png' },
  ],
})
</script>

<template>
  <CookieBanner />
  <RouterView />
  <ToastNotification />
  <ConfirmationModal />
</template>
