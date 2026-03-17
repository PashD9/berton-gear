<script setup>
import { ref } from 'vue'
import Trix from 'trix'
import 'trix/dist/trix.css'
import { useUtilityStore } from '@/stores/utilityStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMessageStore } from '@/stores/messageStore'

// Change the Trix heading button from H1 to H3
Trix.config.blockAttributes.heading1.tagName = 'h3'

// Customize the Trix toolbar to only include essential buttons and fix functionality.
// Hiding buttons with CSS can break Trix's internal logic, especially for lists.
// By defining the toolbar HTML directly, we ensure all included features work correctly.
Trix.config.toolbar.getDefaultHTML = () => `
  <div class="trix-button-row">
    <span class="trix-button-group trix-button-group--text-tools">
      <button type="button" class="trix-button trix-button--icon trix-button--icon-bold" data-trix-attribute="bold" data-trix-key="b" title="Bold" tabindex="-1">Bold</button>
      <button type="button" class="trix-button trix-button--icon trix-button--icon-italic" data-trix-attribute="italic" data-trix-key="i" title="Italic" tabindex="-1">Italic</button>
    </span>
    <span class="trix-button-group trix-button-group--block-tools">
      <button type="button" class="trix-button trix-button--icon trix-button--icon-heading-1" data-trix-attribute="heading1" title="Heading" tabindex="-1">Heading</button>
      <button type="button" class="trix-button trix-button--icon trix-button--icon-quote" data-trix-attribute="quote" title="Quote" tabindex="-1">Quote</button>
      <button type="button" class="trix-button trix-button--icon trix-button--icon-bullet-list" data-trix-attribute="bullet" title="Bullets" tabindex="-1">Bullets</button>
      <button type="button" class="trix-button trix-button--icon trix-button--icon-number-list" data-trix-attribute="number" title="Numbers" tabindex="-1">Numbers</button>
      <button type="button" class="trix-button trix-button--icon trix-button--icon-decrease-nesting-level" data-trix-action="decreaseNestingLevel" title="Decrease Level" tabindex="-1">Decrease Level</button>
      <button type="button" class="trix-button trix-button--icon trix-button--icon-increase-nesting-level" data-trix-action="increaseNestingLevel" title="Increase Level" tabindex="-1">Increase Level</button>
    </span>
    <span class="trix-button-group trix-button-group--history-tools">
      <button type="button" class="trix-button trix-button--icon trix-button--icon-undo" data-trix-action="undo" data-trix-key="z" title="Undo" tabindex="-1">Undo</button>
      <button type="button" class="trix-button trix-button--icon trix-button--icon-redo" data-trix-action="redo" data-trix-key="y" title="Redo" tabindex="-1">Redo</button>
    </span>
  </div>`

defineProps({
  data: {
    type: Object,
    default: () => ({
      title: 'Get in Touch',
      subtitle: 'We would love to hear from you.',
      buttonText: 'Send Message',
      showTitle: true,
    }),
  },
  styling: {
    type: Object,
    default: () => ({}),
  },
})

const utils = useUtilityStore()
const settingsStore = useSettingsStore()
const messageStore = useMessageStore()

const socialIcons = {
  facebook:
    'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  twitter:
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  youtube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93 1.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-1.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
}

const getSocialIcon = (platform) => {
  if (!platform) return null
  const key = platform.toLowerCase()
  if (key.includes('facebook')) return socialIcons.facebook
  if (key.includes('instagram')) return socialIcons.instagram
  if (key.includes('twitter') || key.includes('x')) return socialIcons.twitter
  if (key.includes('linkedin')) return socialIcons.linkedin
  if (key.includes('youtube')) return socialIcons.youtube
  return null
}

const form = ref({
  company: '',
  name: '',
  email: '',
  message: '',
  honeypot: '', // Hidden field for bot prevention
})

const trixEditorRef = ref(null)

const errors = ref({})

const handleTrixChange = (event) => {
  // Sync rich-text editor content to the reactive model
  form.value.message = event.target.value
  if (errors.value.message) {
    errors.value.message = ''
  }
}
const loading = ref(false)

const validateForm = () => {
  errors.value = {}
  if (!form.value.name.trim()) {
    errors.value.name = 'Your name is required.'
  }
  if (!form.value.email.trim()) {
    errors.value.email = 'Your email is required.'
  } else if (!utils.validateEmail(form.value.email)) {
    errors.value.email = 'Please enter a valid email address.'
  }
  if (
    !trixEditorRef.value ||
    trixEditorRef.value.editor.getDocument().isEmpty()
  ) {
    errors.value.message = 'A message is required.'
  }
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  // Honeypot check: If this hidden field is filled, it's likely a bot.
  if (form.value.honeypot) {
    console.warn('Honeypot triggered. Faking success to deceive bot.')
    // To fool the bot, we'll mimic a successful submission without actually sending anything.
    loading.value = true
    await new Promise((r) => setTimeout(r, 750)) // Fake network delay
    loading.value = false
    form.value = { company: '', name: '', email: '', message: '', honeypot: '' }
    if (trixEditorRef.value?.editor) {
      trixEditorRef.value.editor.loadHTML('')
    }
    utils.triggerToast('Your message has been sent successfully!', 'success')
    return
  }

  if (!validateForm()) {
    return
  }

  loading.value = true

  const success = await messageStore.sendMessage(form.value)
  loading.value = false

  if (success) {
    form.value = { company: '', name: '', email: '', message: '', honeypot: '' }
    if (trixEditorRef.value && trixEditorRef.value.editor) {
      trixEditorRef.value.editor.loadHTML('')
    }
  }
}
</script>

<template>
  <section
    :class="[
      styling.backgroundColor || 'bg-white',
      styling.padding || '',
      styling.textColor || 'text-slate-900',
    ]"
  >
    <div class="w-full flex flex-col lg:flex-row min-h-screen">
      <!-- Left Column: Contact Info -->
      <div
        class="lg:w-5/12 bg-pump-navy text-white p-10 flex flex-col justify-between relative overflow-hidden"
      >
        <!-- Decorative elements -->
        <div
          class="absolute -bottom-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"
        ></div>
        <div
          class="absolute top-10 right-10 w-32 h-32 bg-pump-blue/20 rounded-full blur-2xl pointer-events-none"
        ></div>

        <div class="relative z-10">
          <h3
            v-if="data.showTitle"
            class="text-3xl font-bold mb-6 tracking-tight"
          >
            {{ data.title }}
          </h3>
          <p v-if="data.subtitle" class="text-slate-300 mb-10 leading-relaxed">
            {{ data.subtitle }}
          </p>

          <div class="space-y-8">
            <div class="flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
              >
                <span class="material-symbols-outlined text-xl">call</span>
              </div>
              <div>
                <p
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Phone
                </p>
                <template
                  v-if="
                    settingsStore.settings.contact_info?.phones?.filter(
                      (p) => p,
                    ).length
                  "
                >
                  <p
                    v-for="phone in settingsStore.settings.contact_info.phones.filter(
                      (p) => p,
                    )"
                    :key="phone"
                    class="font-medium text-lg"
                  >
                    <a
                      :href="`tel:${phone}`"
                      class="hover:text-white transition-colors"
                      >{{ utils.formatPhoneNumber(phone) }}</a
                    >
                  </p>
                </template>
                <p v-else class="font-medium text-lg"></p>
              </div>
            </div>

            <div class="flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
              >
                <span class="material-symbols-outlined text-xl">mail</span>
              </div>
              <div>
                <p
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Email
                </p>
                <template
                  v-if="
                    settingsStore.settings.contact_info?.emails?.filter(
                      (e) => e,
                    ).length
                  "
                >
                  <p
                    v-for="email in settingsStore.settings.contact_info.emails.filter(
                      (e) => e,
                    )"
                    :key="email"
                    class="font-medium text-lg"
                  >
                    <a
                      :href="`mailto:${email}`"
                      class="hover:text-white transition-colors"
                      >{{ email }}</a
                    >
                  </p>
                </template>
                <p v-else class="font-medium text-lg"></p>
              </div>
            </div>

            <div class="flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
              >
                <span class="material-symbols-outlined text-xl"
                  >markunread_mailbox</span
                >
              </div>
              <div>
                <p
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Postal Address
                </p>
                <template
                  v-if="
                    settingsStore.settings.contact_info?.postal_addresses
                      ?.length
                  "
                >
                  <p
                    v-for="address in settingsStore.settings.contact_info
                      .postal_addresses"
                    :key="address"
                    class="font-medium text-lg max-w-xs leading-snug"
                  >
                    {{ address }}
                  </p>
                </template>
                <p v-else class="font-medium text-lg max-w-xs leading-snug"></p>
              </div>
            </div>

            <div class="flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
              >
                <span class="material-symbols-outlined text-xl"
                  >location_on</span
                >
              </div>
              <div>
                <p
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Address
                </p>
                <template
                  v-if="
                    settingsStore.settings.contact_info?.addresses?.filter(
                      (a) => a,
                    ).length
                  "
                >
                  <p
                    v-for="address in settingsStore.settings.contact_info.addresses.filter(
                      (a) => a,
                    )"
                    :key="address"
                    class="font-medium text-lg max-w-xs leading-snug"
                  >
                    {{ address }}
                  </p>
                </template>
                <p v-else class="font-medium text-lg max-w-xs leading-snug"></p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="settingsStore.settings.contact_info?.social_platforms?.length"
          class="relative z-10 mt-12"
        >
          <p
            class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4"
          >
            Follow Us
          </p>
          <div class="flex gap-4 flex-wrap">
            <a
              v-for="(social, index) in settingsStore.settings.contact_info
                .social_platforms"
              :key="index"
              :href="social.url"
              target="_blank"
              class="text-slate-300 hover:text-white transition-colors"
              :title="social.platform"
            >
              <svg
                v-if="getSocialIcon(social.platform)"
                class="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path :d="getSocialIcon(social.platform)" />
              </svg>
              <span v-else class="material-symbols-outlined text-xl"
                >public</span
              >
            </a>
          </div>
        </div>
      </div>

      <!-- Right Column: Form -->
      <div class="lg:w-7/12 bg-white p-5">
        <div>
          <div
            class="flex flex-col md:flex-row items-start md:items-center gap-4 bg-linear-to-r from-sky-100 to-sky-50 border border-sky-200 rounded-lg p-4"
          >
            <div
              class="flex items-center justify-center w-14 h-14 rounded-full bg-sky-200 text-sky-800"
            >
              <span class="material-symbols-outlined text-2xl">info</span>
            </div>
            <div class="space-y-1">
              <p class="text-slate-900 text-lg font-semibold leading-snug">
                Have a unique project or specialized need? Tell us what you’re
                building and we’ll reply within 1–2 business days.
              </p>
              <p class="text-sm text-slate-500">
                No pressure—just quick, friendly support to help you hit your
                goals.
              </p>
            </div>
          </div>
        </div>

        <div class="p-5 flex items-center justify-center">
          <div class="w-full max-w-4xl">
            <form @submit.prevent="handleSubmit" class="space-y-6">
              <div class="mb-8 md:mb-10">
                <h3 class="text-2xl font-bold text-slate-900 mb-2">
                  Send us a message
                </h3>
                <p class="text-slate-500">
                  We'll get back to you as soon as possible.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex flex-col gap-1 md:col-span-2">
                  <label
                    for="contact-company"
                    class="text-xs font-bold uppercase tracking-wider"
                    :class="
                      styling.textColor
                        ? 'text-current opacity-70'
                        : 'text-slate-500'
                    "
                    >Company</label
                  >
                  <input
                    id="contact-company"
                    name="company"
                    v-model="form.company"
                    type="text"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                    placeholder="Company name (optional)"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <label
                    for="contact-name"
                    class="text-xs font-bold uppercase tracking-wider"
                    :class="
                      styling.textColor
                        ? 'text-current opacity-70'
                        : 'text-slate-500'
                    "
                    >Name</label
                  >
                  <input
                    id="contact-name"
                    name="name"
                    v-model="form.name"
                    @input="errors.name = ''"
                    type="text"
                    required
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                    :class="{ 'border-red-500': errors.name }"
                    placeholder="Your Name"
                  />
                  <p v-if="errors.name" class="text-red-500 text-xs mt-1">
                    {{ errors.name }}
                  </p>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    for="contact-email"
                    class="text-xs font-bold uppercase tracking-wider"
                    :class="
                      styling.textColor
                        ? 'text-current opacity-70'
                        : 'text-slate-500'
                    "
                    >Email</label
                  >
                  <input
                    id="contact-email"
                    name="email"
                    v-model="form.email"
                    @input="errors.email = ''"
                    type="email"
                    required
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                    :class="{ 'border-red-500': errors.email }"
                    placeholder="your@email.com"
                  />
                  <p v-if="errors.email" class="text-red-500 text-xs mt-1">
                    {{ errors.email }}
                  </p>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="contact-message"
                  class="text-xs font-bold uppercase tracking-wider"
                  :class="
                    styling.textColor
                      ? 'text-current opacity-70'
                      : 'text-slate-500'
                  "
                  >Message</label
                >
                <input
                  id="contact-message"
                  name="message"
                  type="hidden"
                  v-model="form.message"
                />
                <div
                  class="trix-editor-wrapper"
                  :class="{ 'trix-editor-error': errors.message }"
                >
                  <trix-editor
                    ref="trixEditorRef"
                    placeholder="Share your project details, ask a question, or just say hello..."
                    input="contact-message"
                    class="w-full"
                    @trix-change="handleTrixChange"
                  ></trix-editor>
                </div>
                <p v-if="errors.message" class="text-red-500 text-xs mt-1">
                  {{ errors.message }}
                </p>
              </div>

              <div class="pt-4">
                <button
                  type="submit"
                  :disabled="loading"
                  class="btn btn-primary w-full md:w-auto"
                >
                  {{
                    loading ? 'Sending...' : data.buttonText || 'Send Message'
                  }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
