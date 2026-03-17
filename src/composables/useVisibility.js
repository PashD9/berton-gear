import { useCategoryStore } from '@/stores/categoryStore'
import { useProductStore } from '@/stores/productStore'

export function useVisibility() {
  const catStore = useCategoryStore()
  const prodStore = useProductStore()

  /**
   * RECURSIVE CHECK: Traces the parentId all the way to the top.
   * Works for Categories, Products, Models, and Variants.
   */
  const isTreePublished = (item) => {
    // 1. Base Case: If the item itself is explicitly unpublished, stop here.
    if (item?.isPublished === false) return false

    // 2. If it has no parentId, it's a Top-Level Main Category.
    // If we reached here, it means item.isPublished isn't false, so it's visible.
    if (!item?.parentId) return true

    // 3. Find the Parent. 
    // We check BOTH stores because the parent could be a Category OR a Product/Model.
    const parent = catStore.categories.find(c => c.id === item.parentId) || 
                   prodStore.products.find(p => p.id === item.parentId) ||
                   prodStore.models?.find(m => m.id === item.parentId)

    // 4. Logic Gate:
    // If parent doesn't exist (orphaned), we hide it for safety.
    // If parent is unpublished, hide this item.
    if (!parent || parent.isPublished === false) return false

    // 5. THE RECURSION: 
    // If the parent is published, we MUST check the parent's parent.
    return isTreePublished(parent)
  }

  return { isTreePublished }
}