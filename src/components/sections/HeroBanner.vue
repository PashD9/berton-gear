<script setup>
import { ref, computed } from 'vue'
import { Splide, SplideSlide } from '@splidejs/vue-splide'
import '@splidejs/splide/css/core'

const props = defineProps({
  slides: {
    type: Array,
    default: () => [],
  },
  // Legacy props for backward compatibility
  title: String,
  subtitle: String,
  imageURL: String,
  buttonText: String,
  buttonLink: String,
  textAlignment: {
    type: String,
    default: 'center',
  },
  styling: {
    type: Object,
    default: () => ({}),
  },
})

// Normalizing data so the template always has a reliable "slide.image" to look at
const displaySlides = computed(() => {
  if (props.slides && props.slides.length > 0) {
    return props.slides.map((slide) => ({
      ...slide,
      // Maps your Firestore 'imageUrl' or 'imageURL' to a single 'image' key
      image: slide.imageUrl || slide.imageURL || '',
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      btnText: slide.buttonText || '',
      btnLink: slide.buttonLink || '',
      textColor: slide.textColor || 'text-white',
      overlayOpacity: slide.overlayOpacity || 'bg-slate-900/60',
      textAlignment: slide.textAlignment || props.textAlignment || 'center',
    }))
  }

  // Keeps your fallback for single slide logic
  if (props.imageURL) {
    return [
      {
        title: props.title,
        subtitle: props.subtitle,
        image: props.imageURL,
        btnText: props.buttonText,
        btnLink: props.buttonLink,
        textColor: 'text-white', // Default for legacy
        overlayOpacity: 'bg-slate-900/60', // Default for legacy
        textAlignment: props.textAlignment || 'center',
      },
    ]
  }
  return []
})

const loadedSlides = ref({})

const onImageLoad = (key) => {
  if (key) loadedSlides.value[key] = true
}

const setImageRef = (el, key) => {
  if (el && el.complete) onImageLoad(key)
}

const splideOptions = computed(() => ({
  type: 'fade',
  rewind: true,
  arrows: false,
  pagination: displaySlides.value.length > 1,
  autoplay: displaySlides.value.length > 1,
  drag: displaySlides.value.length > 1,
  interval: 8000,
  pauseOnHover: true,
  speed: 1200,
}))

const getAlignmentClasses = (alignment) => {
  if (alignment === 'left') return 'items-start text-left'
  if (alignment === 'right') return 'items-end text-right'
  return 'items-center text-center'
}

const getSubtitleAlignment = (alignment) => {
  if (alignment === 'left') return 'mr-auto'
  if (alignment === 'right') return 'ml-auto'
  return 'mx-auto'
}
</script>

<template>
  <section
    class="relative h-100 md:h-125 bg-slate-900 overflow-hidden"
    :class="styling.backgroundColor"
  >
    <Splide
      v-if="displaySlides.length > 0"
      :options="splideOptions"
      :has-track="false"
      class="h-full"
    >
      <div class="splide__track h-full">
        <ul class="splide__list h-full">
          <SplideSlide
            v-for="(slide, index) in displaySlides"
            :key="index"
            class="h-full relative"
          >
            <div class="absolute inset-0 z-0">
              <img
                v-if="slide.image"
                :ref="(el) => setImageRef(el, slide.image)"
                :src="slide.image"
                :alt="slide.title || 'Hero Background'"
                @load="onImageLoad(slide.image)"
                @error="onImageLoad(slide.image)"
                class="w-full h-full object-cover transition-opacity duration-1000"
                :class="loadedSlides[slide.image] ? 'opacity-100' : 'opacity-0'"
              />

              <div class="absolute inset-0" :class="slide.overlayOpacity"></div>

              <div
                v-if="slide.image && !loadedSlides[slide.image]"
                class="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80"
              >
                <div
                  class="w-12 h-12 border-4 border-slate-500 border-t-white rounded-full animate-spin"
                ></div>
              </div>
            </div>

            <div
              class="relative z-10 h-full flex flex-col justify-center text-white px-6"
              :class="getAlignmentClasses(slide.textAlignment)"
            >
              <div class="container mx-auto">
                <h1
                  v-if="slide.title"
                  class="text-4xl md:text-6xl font-bold mb-4 drop-shadow-2xl leading-tight"
                  :class="slide.textColor"
                >
                  {{ slide.title }}
                </h1>
                <p
                  v-if="slide.subtitle"
                  class="text-lg md:text-xl mb-10 text-slate-100 font-normal drop-shadow-lg max-w-2xl"
                  :class="[
                    slide.textColor,
                    getSubtitleAlignment(slide.textAlignment),
                  ]"
                >
                  {{ slide.subtitle }}
                </p>

                <router-link
                  v-if="slide.btnText && slide.btnLink"
                  :to="slide.btnLink"
                  class="inline-block bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 font-bold py-3 px-10 rounded-sm uppercase text-xs tracking-widest transition-all shadow-xl"
                >
                  {{ slide.btnText }}
                </router-link>
              </div>
            </div>
          </SplideSlide>
        </ul>
      </div>
    </Splide>
  </section>
</template>

<style scoped>
/* ESSENTIAL FIX: Splide's default CSS often collapses height. 
  This forces the slider and its children to fill the parent <section>.
*/
:deep(.splide),
:deep(.splide__track),
:deep(.splide__list) {
  height: 100% !important;
}

:deep(.splide__pagination) {
  bottom: 1.5rem;
  z-index: 20;
}
:deep(.splide__pagination__page) {
  background: rgba(255, 255, 255, 0.3);
  border: 0;
  border-radius: 50%;
  display: inline-block;
  height: 10px;
  margin: 0 5px;
  opacity: 1;
  padding: 0;
  position: relative;
  transition: all 0.3s ease;
  width: 10px;
}
:deep(.splide__pagination__page.is-active) {
  background: white;
  transform: scale(1.2);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}
</style>
