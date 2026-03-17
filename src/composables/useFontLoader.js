import { ref, onMounted } from 'vue'

export function useFontLoader() {
  const areIconsLoaded = ref(false)

  // sync check: if the font is already available (e.g. from browser cache),
  // set to true immediately to render icons without delay.
  if (
    typeof document !== 'undefined' &&
    document.fonts &&
    document.fonts.check('1em "Material Symbols Outlined"')
  ) {
    areIconsLoaded.value = true
  }

  onMounted(() => {
    if (areIconsLoaded.value) {
      return
    }

    // Wait for fonts to finish loading before showing the icons
    document.fonts.ready.then(() => {
      areIconsLoaded.value = true
    })
  })

  return {
    areIconsLoaded,
  }
}
