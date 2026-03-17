import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBreadcrumbStore = defineStore('breadcrumb', () => {
  
  const breadcrumbs = ref([])

   function set(items) {
    breadcrumbs.value = items
  }

  function add(item) {
    const exists = breadcrumbs.value.some(b => b.path === item.path)
    if (!exists) {
      breadcrumbs.value.push(item)
    }
  }

  function clear() {
    breadcrumbs.value = []
  }

  return { breadcrumbs, set, add, clear }
})
