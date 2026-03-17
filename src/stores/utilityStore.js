import { defineStore } from 'pinia'
import { db } from '@/firebase/firebase'
import { ref, reactive, watch, computed } from 'vue'
import { useSettingsStore } from './settingsStore'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

export const useUtilityStore = defineStore('utility', () => {
  const isOnline = ref(navigator.onLine)
  const settingsStore = useSettingsStore()
  // global loading indicator (supports nested requests)
  const loadingCount = ref(0)

  // spinner delay – set to 0 for immediate display, or configure via env
  const SHOW_DELAY_MS = Number(import.meta.env.PHA_SHOW_DELAY_MS) || 0
  const MIN_DISPLAY_MS = 200 // once shown, keep visible for at least this long

  let lastShowTs = 0
  let showTimer = null
  let hideTimer = null
  const visible = ref(false)

  const loading = computed(() => visible.value)

  const modal = reactive({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false,
    confirmText: 'Confirm',
    confirmClass: 'bg-red-600',
  })

  const createModal = reactive({
    show: false,
    mode: 'category', // 'category', 'product', 'service', 'model'
    parentId: null,
    data: null,
  })

  const toast = reactive({
    show: false,
    message: '',
    type: 'success',
  })

  const settings = ref({
    currency: 'GHS',
    locale: 'en-GH',
  })

  // Ensure we are subscribed to global settings
  settingsStore.subscribe()

  // Sync global settings to local utility settings
  watch(
    () => settingsStore.settings,
    (newSettings) => {
      if (newSettings && newSettings.default_currency) {
        settings.value.currency = newSettings.default_currency
        // You can also map locale here if you add it to your settings schema later
      }
    },
    { immediate: true, deep: true },
  )

  const warrantyNotes = ref([
    {
      id: '1',
      title: 'Standard Warranty',
      text: '1 Year warranty on parts and labor.',
    },
  ])

  // --- Text Utilities ---

  window.addEventListener('online', () => (isOnline.value = true))
  window.addEventListener('offline', () => (isOnline.value = false))

  const generateSlug = (text) => {
    if (!text) return ''
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/&/g, '-and-')
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Truncates a string to a specified length and adds an ellipsis.
   * @param {string} text - The sentence to shorten.
   * @param {number} limit - Max character count (default 60).
   */

  const truncate = (text, limit = 60) => {
    if (!text || text.length <= limit) return text || ''
    const subString = text.substring(0, limit)
    return subString.substring(0, subString.lastIndexOf(' ')) + '...'
  }

  // --- 3. AUTO-EXPAND TEXTAREA LOGIC ---

  const autoResize = (event) => {
    const element = event.target
    element.style.height = 'auto'

    if (element.scrollHeight > 200) {
      element.style.height = '200px'
      element.style.overflowY = 'auto'
      element.classList.add('custom-scrollbar')
      element.scrollTop = element.scrollHeight
    } else {
      element.style.height = element.scrollHeight + 'px'
      element.style.overflowY = 'hidden'
      element.classList.remove('custom-scrollbar')
    }
  }

  // backwards‑compatible setter; increments/decrements count
  const setLoading = (value) => {
    if (value) beginLoading()
    else endLoading()
  }

  const beginLoading = () => {
    loadingCount.value++
    if (loadingCount.value === 1) {
      // first caller; schedule show after delay
      clearTimeout(hideTimer)
      showTimer = setTimeout(() => {
        visible.value = true
        lastShowTs = Date.now()
      }, SHOW_DELAY_MS)
    }
  }

  const endLoading = () => {
    if (loadingCount.value === 0) return
    loadingCount.value--
    if (loadingCount.value === 0) {
      // no more active requests
      clearTimeout(showTimer)
      const elapsed = Date.now() - lastShowTs
      if (visible.value) {
        if (elapsed < MIN_DISPLAY_MS) {
          // keep spinner up for remainder
          hideTimer = setTimeout(() => {
            visible.value = false
          }, MIN_DISPLAY_MS - elapsed)
        } else {
          visible.value = false
        }
      }
    }
  }

  /**
   * Helper that wraps a promise with the global loader. Usage:
   * await withLoading(fetchSomething())
   */
  const withLoading = async (promise) => {
    beginLoading()
    try {
      return await promise
    } finally {
      endLoading()
    }
  }

  // --- Cross-Store Logic Helpers ---

  const getItem = async (sourceArray, id, collectionName, targetObject) => {
    // 1. Clear previous data
    Object.keys(targetObject).forEach((key) => delete targetObject[key])

    // 2. Strategy A: Try to find it in the existing local array (Fastest)
    const localItem = sourceArray.find((item) => item.id === id)

    if (localItem) {
      Object.assign(targetObject, localItem)
      return
    }

    // 3. Strategy B: If not in array (e.g. page refresh), fetch directly from Firebase
    try {
      const docRef = doc(db, collectionName, id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        Object.assign(targetObject, { id: docSnap.id, ...docSnap.data() })
      }
    } catch (error) {
      console.error(`Error fetching item from ${collectionName}:`, error)
    }
  }

  // Helper to find the "Featured" items in any array of objects
  const filterFeatured = (items) => {
    return items.filter((item) => item.isFeatured === true)
  }

  // Helper to find the "Featured" item in any array of objects
  const findFeatured = (items) => {
    return items.find((item) => item.isFeatured === true)
  }

  // Helper to find the "Banner" item in any array
  const findBanner = (items) => {
    return items.find((item) => item.isBanner === true) || null
  }

  /**
   * Returns one random item from a list of featured items.
   * @param {Array} items - The array to pick from (e.g., categories, products).
   */
  const getRandomFeatured = (items) => {
    if (!items || items.length === 0) return null

    // Filter for featured items first to be safe
    const featured = items.filter((item) => item.isFeatured === true)

    if (featured.length === 0) return null

    const randomIndex = Math.floor(Math.random() * featured.length)
    return featured[randomIndex]
  }

  /**
   * Updates a single field in a Firestore document.
   */
  const patchItem = async (colName, id, data) => {
    if (!navigator.onLine) throw new Error('Offline')
    if (!id) return
    try {
      const docRef = doc(db, colName, id)
      // We only send the specific changed fields to Firebase
      await updateDoc(docRef, data)
      return true
    } catch (error) {
      console.error('Firebase Error:', error.code)
      throw error
    }
  }

  /**
   * Powerful Delete: Handles single docs or Parent + Children
   */
  const performDelete = async (colName, id, childColName = null) => {
    modal.loading = true
    const batch = writeBatch(db)

    try {
      // 1. If there's a child collection, find and queue them for deletion
      if (childColName) {
        const q = query(
          collection(db, childColName),
          where('parentId', '==', id),
        )
        const childSnap = await getDocs(q)
        childSnap.forEach((childDoc) => {
          batch.delete(childDoc.ref)
        })
      }

      // 2. Queue the parent for deletion
      const parentRef = doc(db, colName, id)
      batch.delete(parentRef)

      // 3. Commit all deletions at once (Atomic)
      await batch.commit()

      modal.show = false
      return true
    } catch (error) {
      console.error('Cascade delete failed:', error)
      return false
    } finally {
      modal.loading = false
    }
  }

  /**
   * Opens and populates modals
   */
  const openConfirm = (
    title,
    message,
    onConfirmAction,
    confirmText = 'Confirm',
    confirmClass = 'bg-red-600',
  ) => {
    modal.title = title
    modal.message = message
    modal.onConfirm = onConfirmAction
    modal.show = true
    modal.confirmText = confirmText
    modal.confirmClass = confirmClass
  }

  const openEdit = (mode, item) => {
    createModal.mode = mode
    createModal.data = item
    createModal.isEdit = true
    createModal.show = true
  }

  const openCreate = (mode, data = null, activeModal = '') => {
    createModal.mode = mode
    createModal.data = data
    createModal.parentId = data?.categoryId || null
    createModal.isEdit = false // Reset this
    createModal.show = true
    createModal.activeModal = activeModal
  }

  /**
   * Checks if a slug already exists in a specific Firestore collection
   */
  const isSlugUnique = async (colName, slug, currentId) => {
    const q = query(collection(db, colName), where('slug', '==', slug))
    const querySnapshot = await getDocs(q)
    let unique = true
    querySnapshot.forEach((doc) => {
      if (doc.id !== currentId) unique = false
    })
    return unique
  }

  /**
   * Determines if a parent item has any associated children
   * Works for Categories -> Subcategories or Models -> Variants
   */
  const hasChildren = (parentId, allItems, parentField = 'parentId') => {
    if (!parentId || !allItems) return false
    return allItems.some((item) => item[parentField] === parentId)
  }

  /**
   * Returns the total count of children for a specific parent
   */
  const getChildCount = (parentId, allItems, parentField = 'parentId') => {
    if (!parentId || !allItems) return 0
    return allItems.filter((item) => item[parentField] === parentId).length
  }

  // --- Currency Formatter ---
  // Formats numbers to: GHS 1,250.00
  const formatCurrency = (
    value,
    currency = settings.value.currency,
    locale = settings.value.locale,
  ) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(value)
  }

  // --- Date Formatter ---
  // Converts Firebase Timestamps or Date objects to: Feb 3, 2026
  const formatDate = (dateValue) => {
    if (!dateValue) return ''

    // Handle Firebase Timestamps (which have a .toDate() method)
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue)

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  // --- Phone Formatter ---
  const formatPhoneNumber = (phone) => {
    if (!phone) return ''
    const str = phone.toString()
    const cleaned = str.replace(/\D/g, '')

    // Handle Ghana International (e.g., 233 20 123 4567)
    if (cleaned.length === 12 && cleaned.startsWith('233')) {
      return cleaned.replace(/^(233)(\d{2})(\d{3})(\d{4})$/, '+$1 $2 $3 $4')
    }

    // Handle Standard 10-digit (e.g., 020 123 4567)
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
    }

    if (str.trim().startsWith('+')) {
      return `+${cleaned}`
    }
    return str
  }

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      )
  }

  let toastTimeout
  const triggerToast = (message, type = 'success') => {
    toast.message = message
    toast.type = type
    toast.show = true

    if (toastTimeout) clearTimeout(toastTimeout)
    toastTimeout = setTimeout(() => {
      toast.show = false
    }, 3000)
  }

  const getDeletionStatus = (item) => {
    if (item.isPublished || item.isBanner || item.isFeatured) {
      return { canDelete: false, reason: 'active' }
    }

    if (!item.updatedAt) return { canDelete: true }

    let updatedAtMs = 0
    if (item.updatedAt.seconds) {
      updatedAtMs = item.updatedAt.seconds * 1000
    } else {
      updatedAtMs = new Date(item.updatedAt).getTime()
    }

    const diff = Date.now() - updatedAtMs
    const cooldown = 24 * 60 * 60 * 1000 // 24 hours

    if (diff < cooldown) {
      const hoursLeft = Math.ceil((cooldown - diff) / (60 * 60 * 1000))
      return { canDelete: false, remaining: hoursLeft, reason: 'cooling' }
    }

    return { canDelete: true }
  }

  // --- Warranty Notes Actions ---
  const addWarrantyNote = (note) => {
    warrantyNotes.value.push({ ...note, id: Date.now().toString() })
  }

  const updateWarrantyNote = (id, updatedNote) => {
    const index = warrantyNotes.value.findIndex((n) => n.id === id)
    if (index !== -1) {
      warrantyNotes.value[index] = {
        ...warrantyNotes.value[index],
        ...updatedNote,
      }
    }
  }

  const deleteWarrantyNote = (id) => {
    warrantyNotes.value = warrantyNotes.value.filter((n) => n.id !== id)
  }

  return {
    isOnline,
    // export both names so components can choose. `loading` is the canonical
    // computed; `isLoading` is kept for any existing consumers.
    loading,
    isLoading: loading,
    modal,
    createModal,
    toast,
    triggerToast,
    generateSlug,
    truncate,
    autoResize,
    setLoading,
    beginLoading,
    endLoading,
    withLoading,
    getItem,
    filterFeatured,
    findFeatured,
    findBanner,
    getRandomFeatured,
    patchItem,
    performDelete,
    openConfirm,
    openEdit,
    openCreate,
    isSlugUnique,
    hasChildren,
    getChildCount,
    formatCurrency,
    formatDate,
    formatPhoneNumber,
    validateEmail,
    getDeletionStatus,
    settings,
    warrantyNotes,
    addWarrantyNote,
    updateWarrantyNote,
    deleteWarrantyNote,
  }
})
