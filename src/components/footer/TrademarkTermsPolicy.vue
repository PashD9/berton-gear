<script setup>
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

const currentYear = new Date().getFullYear()
const year = ref(currentYear)
const settingsStore = useSettingsStore()

const props = defineProps({
  mini: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['linkClicked'])

const onLinkClick = () => {
  if (props.mini) {
    emit('linkClicked')
  }
}
</script>

<template>
  <div
    :class="mini ? 'md:hidden' : ''"
    class="container xl:bg-pump-navy/50 py-3 xl:rounded-sm"
  >
    <div
      :class="mini ? 'flex-col-reverse' : ''"
      class="text-[13px] font-normal flex-col gap-2 flex items-center md:flex-row"
    >
      <div class="flex flex-1 items-center gap-1">
        <span class="font-normal">&copy;</span>
        <p>{{ settingsStore.settings.site_name }} {{ year }}</p>
      </div>
      <div class="flex flex-col items-center md:flex-row gap-4">
        <router-link
          to="/terms-of-service"
          class="hover:underline transition-colors"
          @click="onLinkClick"
          >Terms</router-link
        >
        <router-link
          to="/privacy-policy"
          class="hover:underline transition-colors"
          @click="onLinkClick"
          >Privacy Policy</router-link
        >
        <a
          href="https://storyset.com/rocket"
          target="_blank"
          rel="noopener noreferrer"
          title="Illustrations provided by Storyset"
          class="hover:underline transition-colors"
        >
          All illustrations by Storyset
        </a>
      </div>
    </div>
  </div>
</template>
