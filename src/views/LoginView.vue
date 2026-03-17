<script setup>
import { useAuthStore } from '@/stores/authStore'
import Logo from '@/components/logo/Logo.vue'
import { useSettingsStore } from '@/stores/settingsStore'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100"
  >
    <div class="w-full max-w-sm text-center px-6">
      <div class="mb-6 flex flex-col items-center gap-4">
        <Logo />
        <p class="text-slate-500 font-black">Admin Management Portal</p>
      </div>
      <div
        class="bg-white p-8 rounded-2xl shadow-lg border border-slate-800/10"
      >
        <h3 class="font-medium text-slate-400 mb-8">Identify Yourself</h3>

        <button
          @click="authStore.loginWithGoogle"
          id="google-auth-trigger"
          name="google_sign_in_button"
          class="w-full flex items-center justify-center gap-4 py-4 px-6 bg-[#12191d] text-white rounded-xl hover:bg-[#005da6] transition-all active:scale-95 group"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            class="w-5 h-5"
            alt="Google"
          />
          <span class="text-sm font-bold uppercase tracking-wider"
            >Continue with Google</span
          >
        </button>

        <p class="mt-8 text-xs text-slate-500 font-medium leading-relaxed">
          Access is restricted to authorized
          {{ settingsStore.settings.site_name }} administrators. Unauthorized
          access attempts are logged.
        </p>
      </div>
    </div>
  </div>
</template>
