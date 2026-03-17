<script setup>
import { onMounted, computed } from 'vue'
import Navbar from '@/components/nav/Navbar.vue'
import GlobalLoader from '@/components/common/GlobalLoader.vue'
import { useSectionStore } from '@/stores/sectionStore'
import SectionRenderer from '@/components/SectionRenderer.vue'
import CartDrawer from '@/components/cart/CartDrawer.vue'

const sectionStore = useSectionStore()

onMounted(() => {
  sectionStore.fetchSections()
})

const footerSection = computed(() =>
  sectionStore.globalSections.find(
    (s) => s.component === 'FooterBlock' || s.component === 'FooterSection',
  ),
)
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-50">
    <GlobalLoader />
    <Navbar />
    <main class="grow">
      <RouterView />
    </main>
    <SectionRenderer v-if="footerSection" :section="footerSection" />
    <CartDrawer />
  </div>
</template>
