import { defineStore } from 'pinia'
import { db } from '@/firebase/firebase'
import { ref, computed, reactive, watch } from 'vue'
import { debounce } from 'lodash'
import {
  collection,
  query,
  getDocs,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  where,
  onSnapshot,
} from 'firebase/firestore'
import { useUtilityStore } from './utilityStore'
import { useProductStore } from './productStore'
import { useMediaStore } from './mediaStore' // <--- Added Import

let collectionRef = collection(db, 'categories')

export const useCategoryStore = defineStore('categoryStore', () => {
  const utils = useUtilityStore()
  const mediaStore = useMediaStore() // <--- Initialize Media Store

  // --- State ---

  const categories = ref([])
  const activeCategory = reactive({})
  const loading = ref(false)
  const error = ref(null)
  const saveStatus = ref('Synced')
  let debounceTimer = null
  let unsubscribe = null

  // --- Getters ---

  const getCategoryById = computed(() => {
    return (id) => categories.value.find((cat) => cat.id === id)
  })

  const getCategoryBySlug = computed(() => {
    return (slug) => categories.value.find((cat) => cat.slug === slug)
  })

  const parentCategories = computed(() => {
    return categories.value.filter((cat) => !cat.parentId)
  })

  const subCategories = computed(() => {
    return categories.value.filter((cat) => cat.parentId)
  })

  const categoriesWithChildren = computed(() => {
    return parentCategories.value.filter((parent) => {
      return categories.value.some((cat) => cat.parentId === parent.id)
    })
  })

  const getSubcategories = computed(() => {
    return (parentId) =>
      categories.value.filter((cat) => cat.parentId === parentId)
  })

  const featuredCategories = computed(() =>
    utils.filterFeatured(categories.value),
  )

  const featuredCategory = computed(() => utils.findFeatured(categories.value))

  const randomCategory = computed(() => {
    return utils.getRandomFeatured(categories.value)
  })

  // Helper: Recursive check (The one that worked for you!)
  const isTreePublished = (item) => {
    if (!item || item.isPublished === false) return false
    if (!item.parentId) return item.isPublished !== false

    // Check Categories or Products for the parent
    const productStore = useProductStore()
    // When stores are split (admin view) or combined (public view), we need to check all product types.
    const allProductItems = [
      ...productStore.products,
      ...productStore.models,
      ...productStore.variants,
    ]
    const parent =
      categories.value.find((c) => c.id === item.parentId) ||
      allProductItems.find((p) => p.id === item.parentId)

    return isTreePublished(parent)
  }

  // The "Verified" list for the UI
  const verifiedCategories = computed(() => {
    const productStore = useProductStore()

    // Helper to see if a category ID has any published products
    const hasProducts = (catId) => {
      return productStore.products.some(
        (p) => p.parentId === catId && p.isPublished !== false,
      )
    }

    return categories.value.filter((cat) => {
      // 1. Recursive Tree Check
      if (!isTreePublished(cat)) return false

      // 2. Empty Shelf Check
      const directProducts = hasProducts(cat.id)
      const subcategories = categories.value.filter(
        (s) => s.parentId === cat.id && s.isPublished !== false,
      )
      const childrenHaveContent = subcategories.some((s) => hasProducts(s.id))

      return directProducts || childrenHaveContent
    })
  })

  // --- Actions ---

  const fetchCategories = () => {
    // If listener is already active, do nothing.
    if (unsubscribe) return

    if (categories.value.length === 0) loading.value = true

    const q = query(collectionRef, orderBy('name', 'asc'))

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Example of how your store should map categories
        categories.value = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }))
        loading.value = false
      },
      (err) => {
        error.value = err.message
        loading.value = false
      },
    )
  }

  const setCategoryForEdit = async (id) => {
    await utils.getItem(categories.value, id, 'categories', activeCategory)
  }

  const addCategory = async (formData) => {
    const slug = utils.generateSlug(formData.name)

    // Safety Check
    const isUnique = await utils.isSlugUnique('categories', slug)
    if (!isUnique) throw new Error('Slug already exists')

    // CLEANUP: Ensure no imageURL is saved to categories
    // eslint-disable-next-line no-unused-vars
    const { imageURL, ...cleanData } = formData

    const payload = {
      ...cleanData,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return await addDoc(collection(db, 'categories'), payload)
  }

  const updateCategory = async (id, data) => {
    saveStatus.value = 'Saving'
    if (debounceTimer) clearTimeout(debounceTimer)

    debounceTimer = setTimeout(async () => {
      try {
        const docRef = doc(db, 'categories', id)

        // CLEANUP: Ensure we don't accidentally save an imageURL during auto-save
        // eslint-disable-next-line no-unused-vars
        const { imageURL, ...cleanData } = data

        await updateDoc(docRef, { ...cleanData, updatedAt: new Date() })
        saveStatus.value = 'Synced'
      } catch (err) {
        saveStatus.value = 'Error'
      }
    }, 1500)
  }

  const setAsBanner = async (targetCategoryId) => {
    loading.value = true
    const batch = writeBatch(db)

    try {
      const existingBanners = categories.value.filter(
        (c) => c.isBanner === true,
      )

      existingBanners.forEach((banner) => {
        if (banner.id !== targetCategoryId) {
          const oldRef = doc(db, 'categories', banner.id)
          batch.update(oldRef, { isBanner: false, updatedAt: new Date() })
        }
      })

      const newRef = doc(db, 'categories', targetCategoryId)
      batch.update(newRef, { isBanner: true, updatedAt: new Date() })

      await batch.commit()

      const updateLocal = (list) => {
        list.forEach((cat) => {
          cat.isBanner = cat.id === targetCategoryId
        })
      }

      updateLocal(categories.value)
      updateLocal(parentCategories.value)
      updateLocal(subCategories.value)

      return true
    } catch (error) {
      console.error('Atomic banner update failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const autoSave = debounce(async (data) => {
    if (!utils.isOnline) {
      saveStatus.value = 'Offline'
      return
    }
    saveStatus.value = 'Syncing...'

    const { slug, id, imageURL, ...updatableData } = data

    await utils.patchItem('categories', id, updatableData)
    saveStatus.value = 'Synced'
  }, 800)

  watch(
    () => ({ ...activeCategory }),
    (newVal, oldVal) => {
      if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
        autoSave(newVal)
      }
    },
    { deep: true },
  )

  const toggleFeatured = async (category) => {
    const docRef = doc(db, 'categories', category.id)
    try {
      await updateDoc(docRef, {
        isFeatured: !category.isFeatured,
        updatedAt: new Date(),
      })
    } catch (e) {
      console.error('Failed to update featured status:', e)
    }
  }

  const removeCategory = async (id) => {
    await deleteCategoryWithChildren(id)
  }

  const deleteCategoryWithChildren = async (targetId) => {
    const prodStore = useProductStore()
    const batch = writeBatch(db)
    const imagesToDelete = []

    // Safety Check
    const category = categories.value.find((c) => c.id === targetId)
    if (category) {
      const status = utils.getDeletionStatus(category)
      if (!status.canDelete) {
        const msg =
          status.reason === 'active'
            ? 'Cannot delete active item.'
            : `Item is in cooling period. Safe to delete in ${status.remaining}h.`
        throw new Error(msg)
      }
    }

    const idsToDelete = new Set([targetId])
    utils.modal.loading = true

    try {
      // Step 2: Subcategories (Level 1)
      const qSub = query(
        collection(db, 'categories'),
        where('parentId', '==', targetId),
      )
      const subSnap = await getDocs(qSub)

      const subIds = []
      subSnap.forEach((doc) => {
        batch.delete(doc.ref)
        idsToDelete.add(doc.id)
        subIds.push(doc.id)
      })

      // Step 3: Products (Level 2)
      const productIds = []

      // 3a. Direct children of category
      const qDirect = query(
        collection(db, 'products'),
        where('parentId', '==', targetId),
      )
      const directSnap = await getDocs(qDirect)
      directSnap.forEach((doc) => {
        batch.delete(doc.ref)
        idsToDelete.add(doc.id)
        productIds.push(doc.id)

        // Collect Image
        const data = doc.data()
        if (data.imageURL) imagesToDelete.push(data.imageURL)
      })

      // 3b. Children of subcategories
      if (subIds.length > 0) {
        const chunkSize = 10
        for (let i = 0; i < subIds.length; i += chunkSize) {
          const chunk = subIds.slice(i, i + chunkSize)
          const qSubProds = query(
            collection(db, 'products'),
            where('parentId', 'in', chunk),
          )
          const subProdSnap = await getDocs(qSubProds)
          subProdSnap.forEach((doc) => {
            batch.delete(doc.ref)
            idsToDelete.add(doc.id)
            productIds.push(doc.id)

            // Collect Image
            const data = doc.data()
            if (data.imageURL) imagesToDelete.push(data.imageURL)
          })
        }
      }

      // Step 4: Product Descendants (Models)
      const modelIds = []
      if (productIds.length > 0) {
        const chunkSize = 10
        for (let i = 0; i < productIds.length; i += chunkSize) {
          const chunk = productIds.slice(i, i + chunkSize)
          const qModels = query(
            collection(db, 'products'),
            where('parentId', 'in', chunk),
          )
          const modelSnap = await getDocs(qModels)
          modelSnap.forEach((doc) => {
            batch.delete(doc.ref)
            idsToDelete.add(doc.id)
            modelIds.push(doc.id)

            // Collect Image
            const data = doc.data()
            if (data.imageURL) imagesToDelete.push(data.imageURL)
          })
        }
      }

      // Step 5: Product Descendants (Variants)
      if (modelIds.length > 0) {
        const chunkSize = 10
        for (let i = 0; i < modelIds.length; i += chunkSize) {
          const chunk = modelIds.slice(i, i + chunkSize)
          const qVariants = query(
            collection(db, 'products'),
            where('parentId', 'in', chunk),
          )
          const variantSnap = await getDocs(qVariants)
          variantSnap.forEach((doc) => {
            batch.delete(doc.ref)
            idsToDelete.add(doc.id)

            // Collect Image
            const data = doc.data()
            if (data.imageURL) imagesToDelete.push(data.imageURL)
          })
        }
      }

      // Step 6: Atomic Commit
      batch.delete(doc(db, 'categories', targetId))
      await batch.commit()

      // Step 7: Local Sync & Cloudinary Cleanup
      categories.value = categories.value.filter((c) => !idsToDelete.has(c.id))
      prodStore.cleanupIds(idsToDelete)

      if (imagesToDelete.length > 0) {
        // Use Media Store instead of Utils
        imagesToDelete.forEach((url) => mediaStore.deleteImage(url))
      }

      utils.triggerToast('Category and related content deleted.', 'success')
    } catch (error) {
      console.error('Cascading delete failed:', error)
      utils.triggerToast('Failed to delete category.', 'error')
    } finally {
      utils.modal.loading = false
    }
  }

  const stopListener = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  return {
    categories,
    activeCategory,
    loading,
    error,
    saveStatus,
    getCategoryById,
    getCategoryBySlug,
    parentCategories,
    subCategories,
    categoriesWithChildren,
    getSubcategories,
    featuredCategories,
    featuredCategory,
    randomCategory,
    verifiedCategories,
    isTreePublished,
    fetchCategories,
    setCategoryForEdit,
    addCategory,
    updateCategory,
    setAsBanner,
    removeCategory,
    toggleFeatured,
    stopListener,
    deleteCategoryWithChildren,
  }
})
