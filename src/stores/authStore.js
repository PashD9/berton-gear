import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, db } from '@/firebase/firebase'
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore'
import { serverTimestamp } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { useUtilityStore } from './utilityStore'

const authChannel = new BroadcastChannel('pump_house_auth_channel')

export const useAuthStore = defineStore('authStore', () => {
  const user = ref(null)
  const isAdmin = ref(false)
  const allUsers = ref([])
  const router = useRouter()
  const utils = useUtilityStore()
  const isAuthReady = ref(false) // Prevents flickering on page refresh
  let initPromise = null

  // Initialize and listen for the bouncer
  function init() {
    authChannel.onmessage = (event) => {
      if (event.data === 'logout') {
        logout(false)
      }
    }

    if (!initPromise) {
      initPromise = new Promise((resolve) => {
        onAuthStateChanged(auth, async (userData) => {
          if (userData) {
            user.value = userData
            await syncUserToFirestore(userData)
          } else {
            user.value = null
            isAdmin.value = false
          }
          isAuthReady.value = true
          resolve()
        })
      })
    }
    return initPromise
  }

  // Sync Auth User to Firestore & Check Role
  const syncUserToFirestore = async (userData) => {
    // 1. Check Hardcoded Super Admin immediately
    if (userData.uid === import.meta.env.PHA_FIREBASE_ADMIN_UID) {
      isAdmin.value = true
    }

    try {
      const userRef = doc(db, 'users', userData.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const data = userSnap.data()

        // Check if disabled - enforce ban
        if (
          data.disabled &&
          userData.uid !== import.meta.env.PHA_FIREBASE_ADMIN_UID
        ) {
          await signOut(auth)
          user.value = null
          isAdmin.value = false
          utils.triggerToast('Your account has been disabled.', 'error')
          return
        }

        // --- EXISTING USER ---
        const updates = {
          lastLoginAt: serverTimestamp(),
        }

        // Ensure super admin always has 'admin' role in the database
        if (isAdmin.value && data.role !== 'admin') {
          updates.role = 'admin'
        }
        await updateDoc(userRef, updates)

        // If not already admin on client, check if they have the role in DB
        if (!isAdmin.value && data.role === 'admin') {
          isAdmin.value = true
        }
      } else {
        // --- NEW USER ---
        await setDoc(userRef, {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          role: isAdmin.value ? 'admin' : 'user',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        })
      }
    } catch (e) {
      console.error('Error syncing user:', e)
    }
  }

  const loginWithGoogle = async () => {
    utils.setLoading(true)
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      if (result.user) {
        await syncUserToFirestore(result.user)
      }
      router.push('/dashboard')
    } catch (error) {
      if (error.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider)
        } catch (e) {
          console.error('Redirect Error:', e)
          utils.triggerToast('Authentication failed', 'error')
        }
      } else {
        console.error('Auth Error:', error.code)
        utils.triggerToast(error.message, 'error')
      }
    } finally {
      utils.setLoading(false)
    }
  }

  const logout = async (broadcast = true) => {
    // Notify other tabs before signing out.
    if (broadcast) {
      authChannel.postMessage('logout')
    }
    await signOut(auth)

    if (broadcast) {
      authChannel.postMessage('logout')
    }

    // After signOut, try to set persistence to local. This ensures that any expired
    // or invalid tokens are cleared from localStorage, preventing the user
    // from being re-authenticated on refresh.
    try {
      await setPersistence(auth, browserLocalPersistence)
    } catch (error) {
      console.warn('Could not clear local persistence on logout:', error)
    } finally {
      isAdmin.value = false
      allUsers.value = []
      router.push('/')
    }
  }

  // --- Admin Actions (Firestore Based) ---

  const fetchAllUsers = async () => {
    if (!isAdmin.value) return
    utils.setLoading(true)
    try {
      const q = query(collection(db, 'users'))
      const querySnapshot = await getDocs(q)
      allUsers.value = querySnapshot.docs.map((doc) => doc.data())
    } catch (error) {
      console.error('Error fetching users:', error)
      utils.triggerToast('Failed to fetch users', 'error')
    } finally {
      utils.setLoading(false)
    }
  }

  const makeAdmin = async (email) => {
    if (!isAdmin.value) return
    utils.setLoading(true)
    try {
      const q = query(collection(db, 'users'), where('email', '==', email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error('User not found in database. Have they logged in yet?')
      }

      const userDoc = querySnapshot.docs[0]
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'admin',
      })

      utils.triggerToast(`${email} is now an admin`, 'success')
      await fetchAllUsers()
    } catch (error) {
      console.error('Error making admin:', error)
      utils.triggerToast(error.message, 'error')
    } finally {
      utils.setLoading(false)
    }
  }

  const revokeAdmin = async (email) => {
    if (!isAdmin.value) return
    utils.setLoading(true)
    try {
      const q = query(collection(db, 'users'), where('email', '==', email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error('User not found in database.')
      }

      const userDoc = querySnapshot.docs[0]
      // Prevent super admin from being demoted
      if (userDoc.id === import.meta.env.PHA_FIREBASE_ADMIN_UID) {
        throw new Error(
          'Cannot revoke privileges from the super administrator.',
        )
      }

      await updateDoc(doc(db, 'users', userDoc.id), { role: 'user' })

      utils.triggerToast(`${email} is no longer an admin`, 'success')
      await fetchAllUsers()
    } catch (error) {
      console.error('Error revoking admin:', error)
      utils.triggerToast(error.message, 'error')
    } finally {
      utils.setLoading(false)
    }
  }

  const toggleUserStatus = async (email, currentStatus) => {
    if (!isAdmin.value) return
    utils.setLoading(true)
    try {
      const q = query(collection(db, 'users'), where('email', '==', email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error('User not found in database.')
      }

      const userDoc = querySnapshot.docs[0]
      // Prevent super admin from being disabled
      if (userDoc.id === import.meta.env.PHA_FIREBASE_ADMIN_UID) {
        throw new Error('Cannot disable the super administrator.')
      }

      await updateDoc(doc(db, 'users', userDoc.id), {
        disabled: !currentStatus,
      })

      utils.triggerToast(
        `User ${!currentStatus ? 'disabled' : 'enabled'} successfully`,
        'success',
      )
      await fetchAllUsers()
    } catch (error) {
      console.error('Error toggling user status:', error)
      utils.triggerToast(error.message, 'error')
    } finally {
      utils.setLoading(false)
    }
  }

  return {
    user,
    isAdmin,
    allUsers,
    isAuthReady,
    init,
    loginWithGoogle,
    logout,
    fetchAllUsers,
    makeAdmin,
    revokeAdmin,
    toggleUserStatus,
  }
})
