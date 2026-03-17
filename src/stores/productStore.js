import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  limit,
  startAfter,
} from 'firebase/firestore'
import { useUtilityStore } from '@/stores/utilityStore'
import { useMediaStore } from '@/stores/mediaStore'
import { useCategoryStore } from '@/stores/categoryStore'

export const useProductStore = defineStore('product', () => {
  // --- STATE ---
  const products = ref([])
  const models = ref([])
  const variants = ref([])
  const currentProduct = ref(null)
  const isLoading = ref(false)
  const isAppending = ref(false)
  const error = ref(null)
  const hasMore = ref(true)
  const lastVisible = ref(null)
  const pagedStateBackup = ref(null)

  // These hold the "Open Lines" to Google Firestore
  const activeListeners = {
    published: null,
    all: null,
  }

  // Track initialization state to handle cancellation
  const initializingListeners = {
    published: false,
    all: false,
  }

  const utils = useUtilityStore()
  const mediaStore = useMediaStore()

  // --- GETTERS ---
  const hasProducts = computed(() => products.value.length > 0)
  const currentModels = computed(() => {
    if (!currentProduct.value) return []
    return models.value.filter((m) => m.parentId === currentProduct.value.id)
  })

  const visibleCatalog = computed(() => {
    return products.value.filter((item) => {
      // If it's a top-level product, it's already filtered by isPublished in the query
      if (item.type === 'product') return true

      // If it's a model or variant, find the parent in our current list
      // If the parent isn't in 'products.value', it means the parent is NOT published
      const parent = products.value.find((p) => p.id === item.parentId)
      return !!parent
    })
  })

  const verifiedProducts = computed(() => {
    const catStore = useCategoryStore()
    return products.value.filter((p) => catStore.isTreePublished(p))
  })

  // Verified Models (Linked to Products)
  const verifiedModels = computed(() => {
    const catStore = useCategoryStore()
    return models.value.filter((m) => catStore.isTreePublished(m))
  })

  // Verified Variants (Linked to Models)
  const verifiedVariants = computed(() => {
    const catStore = useCategoryStore()
    return variants.value.filter((v) => catStore.isTreePublished(v))
  })

  // --- CORE REAL-TIME ENGINE ---
  const stopAllListeners = () => {
    if (activeListeners.published) {
      activeListeners.published()
      activeListeners.published = null
      if (initializingListeners.published) {
        initializingListeners.published = false
        utils.endLoading()
      }
    }
    if (activeListeners.all) {
      activeListeners.all()
      activeListeners.all = null
      if (initializingListeners.all) {
        initializingListeners.all = false
        utils.endLoading()
      }
    }
  }

  // 1. FOR CATEGORIES VIEW: Pulls ALL Published Products (for tree navigation)
  const fetchAllPublished = async () => {
    if (activeListeners.published) return

    // If the products list is currently in a paginated state, back it up
    // before we overwrite it with the full list. This allows us to restore
    // the user's view when they close the component that triggered this fetch.
    if (hasMore.value && products.value.length > 0) {
      pagedStateBackup.value = {
        products: products.value,
        lastVisible: lastVisible.value,
        hasMore: hasMore.value,
      }
    }

    isLoading.value = true
    isAppending.value = false

    // This is not paged because CategoriesView needs the full tree
    // to filter subcategories client-side.
    utils.beginLoading()
    initializingListeners.published = true

    // We fetch everything published, regardless of type
    const q = query(
      collection(db, 'products'),
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'),
    )

    activeListeners.published = onSnapshot(q, (snapshot) => {
      // This array now contains all 12 items (Products, Models, Variants)
      products.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      isLoading.value = false

      // Prevent pagination from appending duplicates if Products.vue is active.
      // We now have the full list, so disable further paging.
      hasMore.value = false
      lastVisible.value = null

      // listener ready, remove a count from global loader if it was initializing
      if (initializingListeners.published) {
        initializingListeners.published = false
        utils.endLoading()
      }
    })
  }

  // 2. FOR PRODUCTS VIEW: Pulls Published Products in CHUNKS (Pagination)
  const fetchPagedProducts = async ({ reset = false } = {}) => {
    // Stop any active listeners to avoid conflicts
    stopAllListeners()

    if (reset) {
      products.value = []
      lastVisible.value = null
      hasMore.value = true
    }

    if (!hasMore.value && !reset) return

    isLoading.value = true
    isAppending.value = !reset
    utils.beginLoading()

    try {
      let q = query(
        collection(db, 'products'),
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc'),
        limit(12),
      )

      if (lastVisible.value) {
        q = query(q, startAfter(lastVisible.value))
      }

      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        lastVisible.value = snapshot.docs[snapshot.docs.length - 1]
        const newItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        products.value = [...products.value, ...newItems]

        if (snapshot.docs.length < 12) hasMore.value = false
      } else {
        hasMore.value = false
      }
    } finally {
      isLoading.value = false
      isAppending.value = false
      utils.endLoading()
    }
  }

  // 2. FOR ADMIN: Pulls everything (Products, Models, Variants)
  const fetchAllItems = async ({ reset = false } = {}) => {
    // This function is now a one-time fetch, not a listener. It's used by
    // Product.vue to ensure all models/variants are loaded for computing
    // related items.

    // Stop any real-time listeners, as we're doing a full manual fetch.
    stopAllListeners()

    if (reset) {
      products.value = []
      models.value = []
      variants.value = []
    }

    // The global loader is handled by the calling component (Product.vue),
    // but we'll set the store's local loading flag if it's a cold load.
    if (
      products.value.length === 0 &&
      models.value.length === 0 &&
      variants.value.length === 0
    ) {
      isLoading.value = true
    }

    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)

      const p = [],
        m = [],
        v = []
      snapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() }
        if (item.type === 'product') p.push(item)
        else if (item.type === 'model') m.push(item)
        else if (item.type === 'variant') v.push(item)
      })
      products.value = p
      models.value = m
      variants.value = v
    } catch (err) {
      error.value = err
      console.error('Error fetching all items:', err)
      throw err // Re-throw to allow the caller to handle it.
    } finally {
      isLoading.value = false
    }
  }

  // --- RESTORED FUNCTIONS (THE "BULKY" LOGIC) ---

  const fetchProductBySlug = async (slug) => {
    const q = query(collection(db, 'products'), where('slug', '==', slug))
    const snap = await getDocs(q)
    return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null
  }

  const subscribeToProduct = (slug, callback) => {
    const q = query(collection(db, 'products'), where('slug', '==', slug))
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() })
      } else {
        callback(null)
      }
    })
  }

  const addItem = async (payload) => {
    const newItem = {
      ...payload,
      stock: Number(payload.stock || 0),
      price: Number(payload.price || 0),
      isCallForPrice: !payload.price || payload.price === 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    return await addDoc(collection(db, 'products'), newItem)
  }

  const updateItem = async (id, updates) => {
    const docRef = doc(db, 'products', id)
    const cleanUpdates = { ...updates, updatedAt: serverTimestamp() }
    if (cleanUpdates.price !== undefined) {
      cleanUpdates.isCallForPrice =
        !cleanUpdates.price || cleanUpdates.price === 0
    }
    await updateDoc(docRef, cleanUpdates)
  }

  const togglePublish = async (item) => {
    // GUARD: If item is somehow null or doesn't have an ID, stop before crashing
    if (!item || !item.id) {
      return
    }

    try {
      const docRef = doc(db, 'products', item.id)

      // We only interact with Firestore here.
      // No .indexOf, no local array manipulation.
      await updateDoc(docRef, {
        isPublished: !item.isPublished,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Firestore Update Error:', err)
    }
  }

  const updateAttribute = async (id, field, value) => {
    const docRef = doc(db, 'products', id)
    await updateDoc(docRef, {
      [field]: value,
      updatedAt: serverTimestamp(),
    })
  }

  const bulkUpdate = async (ids, updates) => {
    const batch = writeBatch(db)
    ids.forEach((id) => {
      const docRef = doc(db, 'products', id)
      batch.update(docRef, { ...updates, updatedAt: serverTimestamp() })
    })
    await batch.commit()
  }

  const deleteItem = async (item) => {
    const status = utils.getDeletionStatus(item)
    if (!status.canDelete) throw new Error(status.reason)

    const batch = writeBatch(db)
    const imagesToDelete = []
    if (item.imageURL) imagesToDelete.push(item.imageURL)

    const findChildren = async (parentId) => {
      const q = query(
        collection(db, 'products'),
        where('parentId', '==', parentId),
      )
      const snap = await getDocs(q)
      for (const childDoc of snap.docs) {
        batch.delete(childDoc.ref)
        if (childDoc.data().imageURL)
          imagesToDelete.push(childDoc.data().imageURL)
        await findChildren(childDoc.id)
      }
    }

    await findChildren(item.id)
    batch.delete(doc(db, 'products', item.id))
    await batch.commit()

    // Use Cloudinary cleanup from mediaStore
    imagesToDelete.forEach((url) => mediaStore.deleteImage(url))
  }

  const cleanupIds = (idsSet) => {
    const filterOut = (arr) => arr.filter((i) => !idsSet.has(i.id))
    products.value = filterOut(products.value)
    models.value = filterOut(models.value)
    variants.value = filterOut(variants.value)
  }

  const clearProducts = () => {
    stopAllListeners()
    products.value = []
    models.value = []
    variants.value = []
    isLoading.value = false
  }

  const clearCurrentProduct = () => {
    currentProduct.value = null
  }

  const restorePagedState = () => {
    if (pagedStateBackup.value) {
      products.value = pagedStateBackup.value.products
      lastVisible.value = pagedStateBackup.value.lastVisible
      hasMore.value = pagedStateBackup.value.hasMore
      pagedStateBackup.value = null // Clear the backup
    }
  }

  const $reset = () => {
    stopAllListeners()
    products.value = []
    models.value = []
    variants.value = []
    currentProduct.value = null
    isLoading.value = false
    isAppending.value = false
    error.value = null
    hasMore.value = true
    lastVisible.value = null
    pagedStateBackup.value = null
  }

  return {
    products,
    models,
    variants,
    currentProduct,
    isLoading,
    isAppending,
    error,
    hasProducts,
    visibleCatalog,
    currentModels,
    verifiedProducts,
    verifiedModels,
    verifiedVariants,
    fetchAllPublished,
    fetchPagedProducts,
    fetchAllItems,
    fetchProductBySlug,
    subscribeToProduct,
    addItem,
    updateItem,
    togglePublish,
    updateAttribute,
    bulkUpdate,
    deleteItem,
    cleanupIds,
    clearProducts,
    clearCurrentProduct,
    stopAllListeners,
    hasMore,
    restorePagedState,
    $reset,
  }
})
