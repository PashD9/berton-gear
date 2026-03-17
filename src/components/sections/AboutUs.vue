<script setup>
import { ref } from 'vue'

defineProps({
  data: {
    type: Object,
    default: () => ({
      title: '',
      name: '',
      showTitle: true,
      body: '',
      imageURL: '',
      alignment: 'right',
      aspectRatio: 'aspect-video',
      borderRadius: 'rounded-lg',
      hasShadow: true,
      styling: {},
    }),
  },
  styling: {
    type: Object,
    default: () => ({}),
  },
})

const imageLoaded = ref(false)
const onImageLoad = () => {
  imageLoaded.value = true
}
const setImageRef = (el) => {
  if (el && el.complete) {
    onImageLoad()
  }
}
</script>

<template>
  <section
    :class="[
      data.styling?.backgroundColor ||
        styling.backgroundColor ||
        'bg-transparent',
      styling.padding || 'py-16',
      styling.textColor || 'text-slate-900',
    ]"
  >
    <div class="container mx-auto px-4">
      <!-- Content -->
      <!-- center items vertically and keep image responsive using aspect ratio -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <!-- Text Column -->
        <div class="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h3
            v-if="data.showTitle && data.title"
            class="text-3xl mb-6 font-medium tracking-normal"
            :class="styling.textColor ? 'text-current' : 'text-slate-900'"
          >
            {{ data.title }}
          </h3>
          <div
            v-if="data.body"
            v-html="data.body"
            class="prose prose-lg max-w-none prose-slate trix-content"
            :class="{
              'prose-invert':
                data.styling?.backgroundColor &&
                (data.styling.backgroundColor.includes('slate-800') ||
                  data.styling.backgroundColor.includes('slate-900')),
              'opacity-80': styling.textColor,
            }"
          ></div>
        </div>

        <!-- Image Column -->
        <!-- use an aspect ratio container instead of fixed height to prevent squeezing -->
        <div
          class="relative"
          :class="[
            data.aspectRatio || 'aspect-video',
            { 'lg:order-first': data.alignment === 'left' },
          ]"
        >
          <div
            v-if="data.imageURL && !imageLoaded"
            class="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg"
          >
            <div
              class="w-12 h-12 border-4 border-slate-300 border-t-slate-500 rounded-full animate-spin"
            ></div>
          </div>
          <img
            v-if="data.imageURL"
            :ref="setImageRef"
            :src="data.imageURL"
            :alt="data.name"
            @load="onImageLoad"
            class="w-full object-cover object-center transition-opacity duration-500"
            :class="[
              imageLoaded ? 'opacity-100' : 'opacity-0',
              data.aspectRatio && data.aspectRatio !== 'aspect-auto'
                ? 'h-full'
                : 'h-auto',
              data.borderRadius || 'rounded-lg',
              data.hasShadow ? 'shadow-lg' : 'shadow-none',
            ]"
          />
          <div
            v-else
            class="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200"
          >
            <span class="material-symbols-outlined text-6xl">image</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* Basic styles for Trix content if Tailwind's Typography plugin isn't used */
.trix-content ul {
  list-style-type: disc;
  margin-left: 1.25rem;
}
.trix-content ol {
  list-style-type: decimal;
  margin-left: 1.25rem;
}
.trix-content h1 {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 600;
}
.trix-content blockquote {
  border-left: 4px solid #ccc;
  margin-left: 1rem;
  padding-left: 1rem;
}
.trix-content pre {
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
}
</style>
