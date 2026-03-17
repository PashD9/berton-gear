<script setup>
import Breadcrumb from '@/components/nav/Breadcrumb.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProductStore } from '@/stores/productStore'
import Modal from '@/components/modal/Modal.vue'
import CategoryExplorer from '@/components/modal/CategoryExplorer.vue'
import ProductSearchModal from '@/components/modal/ProductSearchModal.vue'
import { ref, onMounted } from 'vue'

const catStore = useCategoryStore()
const prodStore = useProductStore()

onMounted(() => {
  catStore.fetchCategories()
})

const showModal = ref(false)
const showSearchModal = ref(false)

const handleExplorerClose = () => {
  showModal.value = false
  prodStore.restorePagedState()
}
</script>

<template>
  <Breadcrumb
    styles="top-[49px] border-b border-b-gray-100 py-1 bg-white text-sm z-30"
  >
    <div class="actions flex items-center gap-2">
      <span
        @click="showSearchModal = true"
        class="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-all duration-300"
        title="Search Products"
      >
        <span class="material-symbols-outlined text-[20px]">search</span>
      </span>

      <div class="h-4 w-px bg-gray-200 mx-1"></div>

      <span
        @click="showModal = true"
        class="flex items-center md:gap-2 px-3 py-1 rounded-full cursor-pointer text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-all duration-300"
      >
        <span class="material-symbols-outlined">stacks</span>
        <span class="hidden md:block">Categories</span>
      </span>
    </div>
  </Breadcrumb>
  <RouterView />
  <Modal :isVisible="showModal" @close="handleExplorerClose">
    <template #header>
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-gray-500">stacks</span>
        <h3 class="text-lg font-bold text-gray-800">Explore Categories</h3>
      </div>
    </template>
    <CategoryExplorer @close="handleExplorerClose" />
  </Modal>

  <Modal :isVisible="showSearchModal" @close="showSearchModal = false">
    <template #header>
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-gray-500">search</span>
        <h3 class="text-lg font-bold text-gray-800">Search Products</h3>
      </div>
    </template>
    <ProductSearchModal @close="showSearchModal = false" />
  </Modal>
</template>
