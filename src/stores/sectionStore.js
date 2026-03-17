import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useUtilityStore } from '@/stores/utilityStore'

export const useSectionStore = defineStore('section', () => {
  const sections = ref([])
  const loading = ref(false)
  let unsubscribe = null
  const utils = useUtilityStore()

  const subscribe = () => {
    if (unsubscribe) return
    loading.value = true

    // Fetch all sections (real-time)
    const q = query(collection(db, 'sections'))

    // increment global loader until listener fires once
    utils.beginLoading()
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        // Sort in memory: prefer sortOrder, fallback to order, then 0
        sections.value = docs.sort(
          (a, b) =>
            (a.sortOrder || a.order || 0) - (b.sortOrder || b.order || 0),
        )
        loading.value = false
        utils.endLoading()
      },
      (error) => {
        console.error('Error fetching sections:', error)
        loading.value = false
        utils.endLoading()
      },
    )
  }

  // Alias for backward compatibility
  const fetchSections = subscribe

  const stopListener = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  const saveSection = async (section) => {
    loading.value = true
    utils.beginLoading()
    try {
      // Ensure page field exists, default to Home
      if (!section.page) section.page = 'Home'

      if (section.id) {
        const { id, ...data } = section
        await updateDoc(doc(db, 'sections', id), data)
      } else {
        await addDoc(collection(db, 'sections'), section)
      }
    } catch (error) {
      console.error('Error saving section:', error)
    } finally {
      loading.value = false
      utils.endLoading()
    }
  }

  const deleteSection = async (id) => {
    loading.value = true
    utils.beginLoading()
    try {
      await deleteDoc(doc(db, 'sections', id))
    } catch (error) {
      console.error('Error deleting section:', error)
    } finally {
      loading.value = false
      utils.endLoading()
    }
  }

  const reorderSections = async (newSectionsArray) => {
    const originalSections = [...sections.value]
    sections.value = newSectionsArray

    try {
      const batch = writeBatch(db)
      newSectionsArray.forEach((section, index) => {
        const docRef = doc(db, 'sections', section.id)
        batch.update(docRef, { sortOrder: index })
      })
      await batch.commit()
    } catch (error) {
      console.error('Error reordering sections:', error)
      sections.value = originalSections
      if (utils.showToast)
        utils.showToast('Failed to reorder sections', 'error')
    }
  }

  const globalSections = computed(() =>
    sections.value.filter((s) => s.page === 'Global'),
  )

  const getPageSections = (pageName) => {
    const items = sections.value.filter((s) => s.page === pageName)

    // Sort by sortOrder
    items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

    // Enforce HeroBanner at top
    const heroIndex = items.findIndex((s) => s.component === 'HeroBanner')
    if (heroIndex > 0) {
      const [hero] = items.splice(heroIndex, 1)
      items.unshift(hero)
    }
    return items
  }

  const organizedSections = (pageName) => {
    const allSections = sections.value || []
    const filtered = allSections.filter(
      (s) => s.page === pageName || s.page === 'Global',
    )

    const hero = []
    const middle = []
    const footer = []

    filtered.forEach((s) => {
      if (s.component === 'HeroBanner') {
        hero.push(s)
      } else if (
        s.component === 'FooterBlock' ||
        s.component === 'FooterSection'
      ) {
        // Only add to page sections if it is NOT global.
        // Global footers are handled by MainLayout.vue to avoid duplication.
        if (s.page !== 'Global') {
          footer.push(s)
        }
      } else {
        middle.push(s)
      }
    })

    middle.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

    return [...hero, ...middle, ...footer]
  }

  return {
    sections,
    loading,
    subscribe,
    fetchSections,
    stopListener,
    saveSection,
    deleteSection,
    reorderSections,
    globalSections,
    getPageSections,
    organizedSections,
  }
})
