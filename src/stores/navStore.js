import { defineStore } from 'pinia'
import { db } from '@/firebase/firebase'
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore'

export const useNavStore = defineStore('nav', {
  state: () => ({
    menuItems: [],
    loading: false,
    unsubscribe: null
  }),

  getters: {
    headerItems: (state) => state.menuItems.filter(item => !item.position || item.position === 'header' || item.position === 'both'),
    footerItems: (state) => state.menuItems.filter(item => item.position === 'footer' || item.position === 'both')
  },

  actions: {
    subscribeToNav() {
      if (this.unsubscribe) return

      this.loading = true
      const q = query(collection(db, 'navigation'), orderBy('order'))
      
      this.unsubscribe = onSnapshot(q, (snapshot) => {
        this.menuItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        this.loading = false
      }, (error) => {
        console.error("Error fetching nav items: ", error)
        this.loading = false
      })
    },
    
    async addNavLink(link) {
      await addDoc(collection(db, 'navigation'), link)
    },

    async updateNavLink(id, data) {
      await updateDoc(doc(db, 'navigation', id), data)
    },

    async deleteNavLink(id) {
      await deleteDoc(doc(db, 'navigation', id))
    }
  }
})