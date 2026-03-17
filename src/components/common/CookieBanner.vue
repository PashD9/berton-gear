<script setup>
import { ref, onMounted } from 'vue'

const isVisible = ref(false)

onMounted(() => {
  if (!localStorage.getItem('pumphaus_cookie_consent')) {
    setTimeout(() => {
      isVisible.value = true
    }, 2000)
  }
})

const acceptCookies = () => {
  localStorage.setItem('pumphaus_cookie_consent', 'true')
  isVisible.value = false
}

const declineCookies = () => {
  localStorage.setItem('pumphaus_cookie_consent', 'false')
  isVisible.value = false
}
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-50 shadow-lg animate-in slide-in-from-bottom-5 duration-500"
  >
    <div
      class="container flex flex-col md:flex-row items-center justify-between gap-4"
    >
      <div class="text-sm text-slate-300 text-center md:text-left">
        <p>
          We use cookies to enhance your browsing experience and analyze our
          traffic. By clicking "Accept", you consent to our use of cookies.
        </p>
        <router-link
          to="/privacy-policy"
          class="text-blue-400 hover:text-blue-300 underline mt-1 inline-block text-xs"
        >
          Read our Privacy Policy
        </router-link>
      </div>
      <div class="flex gap-3 shrink-0">
        <button
          @click="declineCookies"
          class="btn bg-transparent border border-slate-600 hover:bg-slate-800 text-white"
        >
          Decline
        </button>
        <button
          id="accept-cookies-btn"
          name="accept_cookies"
          @click="acceptCookies"
          class="btn btn-primary"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
</template>
