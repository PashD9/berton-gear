import { defineStore } from 'pinia'
import { db } from '@/firebase/firebase'
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'

export const useSettingsStore = defineStore('settingsStore', {
  state: () => ({
    settings: {},
    isLoading: false,
    saveStatus: 'Saved',
    unsubscribe: null,
  }),

  actions: {
    // 1. Fetch settings once or set up a listener
    subscribe() {
      if (this.unsubscribe) return

      this.isLoading = true
      const docRef = doc(db, 'settings', 'global')

      // We use onSnapshot so if you change a setting,
      // the whole app updates instantly without a refresh
      this.unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()

          // --- Data Normalization for Backward Compatibility ---
          if (!data.contact_info) data.contact_info = {}

          // 1. Emails: Ensure array exists, sync legacy string
          if (!Array.isArray(data.contact_info.emails)) {
            data.contact_info.emails = data.contact_info.email
              ? [data.contact_info.email]
              : []
          }
          data.contact_info.email = data.contact_info.emails[0] || ''

          // 2. Phones: Ensure array exists, sync legacy string
          if (!Array.isArray(data.contact_info.phones)) {
            data.contact_info.phones = data.contact_info.phone
              ? [data.contact_info.phone]
              : []
          }
          data.contact_info.phone = data.contact_info.phones[0] || ''

          // 3. Addresses: Ensure array exists, sync legacy string
          if (!Array.isArray(data.contact_info.addresses)) {
            data.contact_info.addresses = data.contact_info.address
              ? [data.contact_info.address]
              : []
          }
          data.contact_info.address = data.contact_info.addresses[0] || ''

          // 3.5 Postal Addresses: Ensure array exists, sync legacy string
          if (!Array.isArray(data.contact_info.postal_addresses)) {
            data.contact_info.postal_addresses = data.contact_info
              .postal_address
              ? [data.contact_info.postal_address]
              : []
          }
          data.contact_info.postal_address =
            data.contact_info.postal_addresses[0] || ''

          // 4. Social Links: Use 'social_platforms' (array) for editing, 'social_links' (object) for legacy display
          if (!Array.isArray(data.contact_info.social_platforms)) {
            data.contact_info.social_platforms = []
            // Migrate existing object to array if needed
            if (
              data.contact_info.social_links &&
              !Array.isArray(data.contact_info.social_links)
            ) {
              Object.entries(data.contact_info.social_links).forEach(
                ([platform, url]) => {
                  if (url)
                    data.contact_info.social_platforms.push({ platform, url })
                },
              )
            }
          }
          // Re-generate social_links object from array for legacy components
          const socialObj = {}
          data.contact_info.social_platforms.forEach((item) => {
            if (item.platform && item.url) {
              socialObj[item.platform.toLowerCase()] = item.url
            }
          })
          data.contact_info.social_links = socialObj

          // 5. Warranty Notes: Ensure array exists
          if (!Array.isArray(data.warranty_notes)) {
            data.warranty_notes = data.warranty_notes_default
              ? [data.warranty_notes_default]
              : []
          }
          // Sync legacy string
          data.warranty_notes_default = data.warranty_notes.join('\n\n')

          this.settings = data
        }
        this.isLoading = false
      })
    },

    unsubscribeListener() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
    },

    // Alias for backward compatibility if needed
    fetchSettings() {
      this.subscribe()
    },

    // 2. Update a specific field
    async updateSetting(updates) {
      this.saveStatus = 'Saving...'
      try {
        const docRef = doc(db, 'settings', 'global')
        await updateDoc(docRef, {
          ...updates,
          updatedAt: new Date(),
        })
        this.saveStatus = 'Saved'
      } catch (error) {
        console.error('Error updating settings:', error)
        this.saveStatus = 'Error'
      }
    },
  },
})
