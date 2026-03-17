<script setup>
import { onMounted, ref, watch, computed, nextTick } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import { storeToRefs } from 'pinia'
import { useUtilityStore } from '@/stores/utilityStore'

const settingsStore = useSettingsStore()
const breadcrumb = useBreadcrumbStore()
const { settings } = storeToRefs(settingsStore)
const utils = useUtilityStore()
const isFormInitialized = ref(false)
const isUpdatingFromStore = ref(false)

// Initialize form with default structure to prevent undefined errors
const form = ref({
  site_name: '',
  tagline: '',
  default_currency: 'GHS',
  tax_rate: 0,
  currency_symbol: '₵',
  warranty_notes_default: '',
  low_stock_threshold: 5,
  contact_info: {
    emails: [''],
    phones: [''],
    addresses: [''],
    postal_addresses: [''],
    social_platforms: [{ platform: 'Facebook', url: '' }],
  },
  seo_defaults: {
    meta_title: '',
    meta_description: '',
    keywords: [],
  },
  warranty_notes: [''],
  maintenance_mode: false,
})

const currencySymbols = {
  GHS: '₵',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

const updateCurrencySymbol = () => {
  const symbol = currencySymbols[form.value.default_currency]
  if (symbol) {
    form.value.currency_symbol = symbol
  }
}

// Track which sections are in edit mode
const editing = ref({})
const toggleEdit = (section) => {
  editing.value[section] = !editing.value[section]
}

// Computed property to handle keywords array as a comma-separated string
const keywordsString = computed({
  get: () => form.value.seo_defaults?.keywords?.join(', ') || '',
  set: (val) => {
    if (!form.value.seo_defaults) form.value.seo_defaults = {}
    form.value.seo_defaults.keywords = val
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s)
  },
})

// Helper functions for dynamic lists
const addItem = (arr, item) => {
  arr.push(item)
}
const removeItem = (arr, index) => {
  arr.splice(index, 1)
}

onMounted(() => {
  breadcrumb.set([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Settings' },
  ])
  settingsStore.subscribe()
})

// Sync local form with store data when it loads
watch(
  settings,
  (newSettings) => {
    if (newSettings && Object.keys(newSettings).length > 0) {
      // Deep copy to avoid direct mutation of store state before save
      const merged = {
        ...form.value,
        ...JSON.parse(JSON.stringify(newSettings)),
      }

      // Ensure nested objects exist even if missing in DB
      if (!merged.contact_info) merged.contact_info = {}
      if (!merged.contact_info.emails) merged.contact_info.emails = ['']
      if (!merged.contact_info.phones) merged.contact_info.phones = ['']
      if (!merged.contact_info.addresses) merged.contact_info.addresses = ['']
      if (!merged.contact_info.postal_addresses)
        merged.contact_info.postal_addresses = ['']
      if (!merged.contact_info.social_platforms)
        merged.contact_info.social_platforms = [
          { platform: 'Facebook', url: '' },
        ]
      if (!merged.seo_defaults) merged.seo_defaults = { keywords: [] }
      if (!merged.warranty_notes) merged.warranty_notes = ['']

      isUpdatingFromStore.value = true
      form.value = merged
      // Use nextTick to ensure the form is populated before we start watching for changes
      nextTick(() => {
        isFormInitialized.value = true
        isUpdatingFromStore.value = false
      })
    }
  },
  { immediate: true, deep: true },
)

let debounceTimer = null
watch(
  form,
  (newForm) => {
    // Do not save on initial load/sync from the store
    if (!isFormInitialized.value || isUpdatingFromStore.value) return

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      // The updateSetting function in the store should handle the saving status
      await settingsStore.updateSetting(newForm)
    }, 1000) // 1-second debounce for auto-saving
  },
  { deep: true },
)
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-8">
    <!-- Header -->
    <div
      class="sticky top-10 z-30 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
    >
      <div>
        <h2 class="text-2xl font-medium text-slate-900 tracking-normal">
          Settings
        </h2>
        <p class="text-slate-500 mt-1 text-sm">
          Configure global application settings.
        </p>
      </div>
      <span
        :class="
          settingsStore.saveStatus === 'Synced'
            ? 'text-green-600 bg-green-50'
            : 'text-blue-600 bg-blue-50'
        "
        class="text-[10px] font-bold px-3 py-1 rounded-full uppercase transition-colors"
      >
        {{ settingsStore.saveStatus }}
      </span>
    </div>

    <!-- Loading State -->
    <div
      v-if="settingsStore.isLoading && !form.site_name"
      class="py-12 text-center text-slate-400"
    >
      <span class="material-symbols-outlined animate-spin text-3xl"
        >refresh</span
      >
      <p class="mt-2 text-sm">Loading configuration...</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-8">
      <!-- 1. Basic Info -->
      <section class="bg-white border border-slate-200 rounded-lg p-6">
        <div
          class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100"
        >
          <h3 class="text-lg font-medium text-slate-800">Basic Information</h3>
          <button
            @click="toggleEdit('basic')"
            class="text-slate-400 hover:text-blue-600 transition-colors"
          >
            <span class="material-symbols-outlined">{{
              editing.basic ? 'close' : 'edit'
            }}</span>
          </button>
        </div>

        <div v-if="editing.basic" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-1">
            <label
              for="site_name"
              class="block text-sm font-medium text-slate-700"
              >Site Name</label
            >
            <input
              type="text"
              id="site_name"
              name="site_name"
              v-model="form.site_name"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="space-y-1">
            <label
              for="tagline"
              class="block text-sm font-medium text-slate-700"
              >Tagline</label
            >
            <input
              type="text"
              id="tagline"
              name="tagline"
              v-model="form.tagline"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Site Name</span
            >
            <p class="text-slate-800 font-medium">
              {{ form.site_name || 'Not set' }}
            </p>
          </div>
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Tagline</span
            >
            <p class="text-slate-800 font-medium">
              {{ form.tagline || 'Not set' }}
            </p>
          </div>
        </div>
      </section>

      <!-- 2. Localization & Finance -->
      <section class="bg-white border border-slate-200 rounded-lg p-6">
        <div
          class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100"
        >
          <h3 class="text-lg font-medium text-slate-800">
            Localization & Finance
          </h3>
          <button
            @click="toggleEdit('finance')"
            class="text-slate-400 hover:text-blue-600 transition-colors"
          >
            <span class="material-symbols-outlined">{{
              editing.finance ? 'close' : 'edit'
            }}</span>
          </button>
        </div>

        <div
          v-if="editing.finance"
          class="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div class="space-y-1">
            <label
              for="default_currency"
              class="block text-sm font-medium text-slate-700"
              >Currency</label
            >
            <select
              id="default_currency"
              name="default_currency"
              v-model="form.default_currency"
              @change="updateCurrencySymbol"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            >
              <option value="GHS">GHS (Ghanaian Cedi)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
            </select>
          </div>
          <div class="space-y-1">
            <label
              for="currency_symbol"
              class="block text-sm font-medium text-slate-700"
              >Symbol</label
            >
            <input
              type="text"
              id="currency_symbol"
              name="currency_symbol"
              v-model="form.currency_symbol"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="space-y-1">
            <label
              for="tax_rate"
              class="block text-sm font-medium text-slate-700"
              >Tax Rate (%)</label
            >
            <input
              type="number"
              id="tax_rate"
              name="tax_rate"
              v-model.number="form.tax_rate"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Currency</span
            >
            <p class="text-slate-800 font-medium">
              {{ form.default_currency }}
            </p>
          </div>
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Symbol</span
            >
            <p class="text-slate-800 font-medium">
              {{ form.currency_symbol || '-' }}
            </p>
          </div>
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Tax Rate</span
            >
            <p class="text-slate-800 font-medium">{{ form.tax_rate }}%</p>
          </div>
        </div>
      </section>

      <!-- 3. Business Logic -->
      <section class="bg-white border border-slate-200 rounded-lg p-6">
        <div
          class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100"
        >
          <h3 class="text-lg font-medium text-slate-800">Business Logic</h3>
          <button
            @click="toggleEdit('logic')"
            class="text-slate-400 hover:text-blue-600 transition-colors"
          >
            <span class="material-symbols-outlined">{{
              editing.logic ? 'close' : 'edit'
            }}</span>
          </button>
        </div>

        <div v-if="editing.logic" class="space-y-6">
          <div class="space-y-1">
            <label
              for="low_stock_threshold"
              class="block text-sm font-medium text-slate-700"
              >Low Stock Threshold</label
            >
            <input
              type="number"
              id="low_stock_threshold"
              name="low_stock_threshold"
              v-model.number="form.low_stock_threshold"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all md:w-1/3"
            />
            <p class="text-xs text-slate-500 mt-1">
              Products with stock below this number will be flagged.
            </p>
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-slate-700"
              >Warranty Notes</label
            >
            <div class="space-y-2">
              <div
                v-for="(note, index) in form.warranty_notes"
                :key="index"
                class="flex gap-2"
              >
                <textarea
                  v-model="form.warranty_notes[index]"
                  rows="2"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                  placeholder="Enter warranty note..."
                ></textarea>
                <button
                  @click="removeItem(form.warranty_notes, index)"
                  class="text-slate-400 hover:text-red-500"
                  v-if="form.warranty_notes.length > 1"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
              <button
                @click="addItem(form.warranty_notes, '')"
                class="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-sm">add</span> Add
                Note
              </button>
            </div>
          </div>
        </div>
        <div v-else class="space-y-6">
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Low Stock Threshold</span
            >
            <p class="text-slate-800 font-medium">
              {{ form.low_stock_threshold }} units
            </p>
          </div>
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Warranty Notes</span
            >
            <ul class="list-disc pl-4 text-slate-800 font-medium">
              <li v-for="(note, i) in form.warranty_notes" :key="i">
                {{ note }}
              </li>
            </ul>
            <p v-if="!form.warranty_notes?.length" class="text-slate-400">
              None
            </p>
          </div>
        </div>
      </section>

      <!-- 4. Contact & Social -->
      <section class="bg-white border border-slate-200 rounded-lg p-6">
        <div
          class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100"
        >
          <h3 class="text-lg font-medium text-slate-800">Contact & Social</h3>
          <button
            @click="toggleEdit('contact')"
            class="text-slate-400 hover:text-blue-600 transition-colors"
          >
            <span class="material-symbols-outlined">{{
              editing.contact ? 'close' : 'edit'
            }}</span>
          </button>
        </div>

        <div v-if="editing.contact" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-slate-700"
                >Email Addresses</label
              >
              <div class="space-y-2">
                <div
                  v-for="(email, index) in form.contact_info.emails"
                  :key="index"
                  class="flex gap-2"
                >
                  <input
                    type="email"
                    v-model="form.contact_info.emails[index]"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                    placeholder="email@example.com"
                  />
                  <button
                    @click="removeItem(form.contact_info.emails, index)"
                    class="text-slate-400 hover:text-red-500"
                    v-if="form.contact_info.emails.length > 1"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <button
                  @click="addItem(form.contact_info.emails, '')"
                  class="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                >
                  <span class="material-symbols-outlined text-sm">add</span> Add
                  Email
                </button>
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-medium text-slate-700"
                >Phone Numbers</label
              >
              <div class="space-y-2">
                <div
                  v-for="(phone, index) in form.contact_info.phones"
                  :key="index"
                  class="flex gap-2"
                >
                  <input
                    type="tel"
                    @blur="
                      form.contact_info.phones[index] = utils.formatPhoneNumber(
                        form.contact_info.phones[index],
                      )
                    "
                    v-model="form.contact_info.phones[index]"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                    placeholder="+1 234 567 8900"
                  />
                  <button
                    @click="removeItem(form.contact_info.phones, index)"
                    class="text-slate-400 hover:text-red-500"
                    v-if="form.contact_info.phones.length > 1"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <button
                  @click="addItem(form.contact_info.phones, '')"
                  class="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                >
                  <span class="material-symbols-outlined text-sm">add</span> Add
                  Phone
                </button>
              </div>
            </div>
          </div>
          <div class="space-y-1 mb-6">
            <label class="block text-sm font-medium text-slate-700"
              >Physical Addresses</label
            >
            <div class="space-y-2">
              <div
                v-for="(address, index) in form.contact_info.addresses"
                :key="index"
                class="flex gap-2"
              >
                <input
                  type="text"
                  v-model="form.contact_info.addresses[index]"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                  placeholder="123 Main St, City, Country"
                />
                <button
                  @click="removeItem(form.contact_info.addresses, index)"
                  class="text-slate-400 hover:text-red-500"
                  v-if="form.contact_info.addresses.length > 1"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
              <button
                @click="addItem(form.contact_info.addresses, '')"
                class="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-sm">add</span> Add
                Address
              </button>
            </div>
          </div>
          <div class="space-y-1 mb-6">
            <label class="block text-sm font-medium text-slate-700"
              >Postal Addresses</label
            >
            <div class="space-y-2">
              <div
                v-for="(address, index) in form.contact_info.postal_addresses"
                :key="index"
                class="flex gap-2"
              >
                <input
                  type="text"
                  v-model="form.contact_info.postal_addresses[index]"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                  placeholder="P.O. Box 123, City, Country"
                />
                <button
                  @click="removeItem(form.contact_info.postal_addresses, index)"
                  class="text-slate-400 hover:text-red-500"
                  v-if="form.contact_info.postal_addresses.length > 1"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
              <button
                @click="addItem(form.contact_info.postal_addresses, '')"
                class="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-sm">add</span> Add
                Postal Address
              </button>
            </div>
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-slate-700"
              >Social Media Links</label
            >
            <div class="space-y-2">
              <div
                v-for="(social, index) in form.contact_info.social_platforms"
                :key="index"
                class="flex gap-2"
              >
                <input
                  type="text"
                  v-model="social.platform"
                  class="w-1/3 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                  placeholder="Platform (e.g. Facebook)"
                />
                <input
                  type="url"
                  v-model="social.url"
                  class="w-2/3 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                  placeholder="URL"
                />
                <button
                  @click="removeItem(form.contact_info.social_platforms, index)"
                  class="text-slate-400 hover:text-red-500"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
              <button
                @click="
                  addItem(form.contact_info.social_platforms, {
                    platform: '',
                    url: '',
                  })
                "
                class="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-sm">add</span> Add
                Social Link
              </button>
            </div>
          </div>
        </div>
        <div v-else>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <span
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Emails</span
              >
              <ul class="text-slate-800 font-medium">
                <li v-for="email in form.contact_info.emails" :key="email">
                  {{ email }}
                </li>
              </ul>
              <p
                v-if="!form.contact_info.emails?.length"
                class="text-slate-400"
              >
                -
              </p>
            </div>
            <div>
              <span
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Phones</span
              >
              <ul class="text-slate-800 font-medium">
                <li v-for="phone in form.contact_info.phones" :key="phone">
                  {{ phone }}
                </li>
              </ul>
              <p
                v-if="!form.contact_info.phones?.length"
                class="text-slate-400"
              >
                -
              </p>
            </div>
          </div>
          <div class="mb-6">
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Addresses</span
            >
            <ul class="text-slate-800 font-medium">
              <li v-for="addr in form.contact_info.addresses" :key="addr">
                {{ addr }}
              </li>
            </ul>
            <p
              v-if="!form.contact_info.addresses?.length"
              class="text-slate-400"
            >
              -
            </p>
          </div>
          <div class="mb-6">
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Postal Addresses</span
            >
            <ul class="text-slate-800 font-medium">
              <li
                v-for="addr in form.contact_info.postal_addresses"
                :key="addr"
              >
                {{ addr }}
              </li>
            </ul>
            <p
              v-if="!form.contact_info.postal_addresses?.length"
              class="text-slate-400"
            >
              -
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="social in form.contact_info.social_platforms"
              :key="social.platform"
            >
              <span
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >{{ social.platform }}</span
              >
              <a
                :href="social.url"
                target="_blank"
                class="text-blue-600 hover:underline truncate block"
                >{{ social.url }}</a
              >
            </div>
            <p
              v-if="!form.contact_info.social_platforms?.length"
              class="text-slate-400 col-span-2"
            >
              No social links configured.
            </p>
          </div>
        </div>
      </section>

      <!-- 5. Global SEO -->
      <section class="bg-white border border-slate-200 rounded-lg p-6">
        <div
          class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100"
        >
          <h3 class="text-lg font-medium text-slate-800">
            Global SEO Defaults
          </h3>
          <button
            @click="toggleEdit('seo')"
            class="text-slate-400 hover:text-blue-600 transition-colors"
          >
            <span class="material-symbols-outlined">{{
              editing.seo ? 'close' : 'edit'
            }}</span>
          </button>
        </div>

        <div v-if="editing.seo" class="space-y-6">
          <div class="space-y-1">
            <label
              for="meta_title"
              class="block text-sm font-medium text-slate-700"
              >Meta Title</label
            >
            <input
              type="text"
              id="meta_title"
              name="meta_title"
              v-model="form.seo_defaults.meta_title"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div class="space-y-1">
            <label
              for="meta_description"
              class="block text-sm font-medium text-slate-700"
              >Meta Description</label
            >
            <textarea
              id="meta_description"
              name="meta_description"
              rows="3"
              v-model="form.seo_defaults.meta_description"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            ></textarea>
          </div>
          <div class="space-y-1">
            <label
              for="seo_keywords"
              class="block text-sm font-medium text-slate-700"
              >Keywords (Comma separated)</label
            >
            <input
              type="text"
              id="seo_keywords"
              name="seo_keywords"
              v-model="keywordsString"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        <div v-else class="space-y-6">
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Meta Title</span
            >
            <p class="text-slate-800 font-medium">
              {{ form.seo_defaults.meta_title || '-' }}
            </p>
          </div>
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Meta Description</span
            >
            <p class="text-slate-800 font-medium">
              {{ form.seo_defaults.meta_description || '-' }}
            </p>
          </div>
          <div>
            <span class="block text-xs font-bold text-slate-500 uppercase mb-1"
              >Keywords</span
            >
            <div class="flex flex-wrap gap-2 mt-1">
              <span
                v-for="kw in form.seo_defaults.keywords"
                :key="kw"
                class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs"
                >{{ kw }}</span
              >
              <span
                v-if="!form.seo_defaults.keywords.length"
                class="text-slate-400"
                >-</span
              >
            </div>
          </div>
        </div>
      </section>

      <!-- Privacy Policy & Terms of Service Last Updated Date -->
      <div class="flex flex-col gap-1">
        <label
          for="policy-date"
          class="text-xs font-bold text-slate-500 uppercase"
        >
          Policy Last Updated
        </label>
        <input
          id="policy-date"
          v-model="settingsStore.settings.policy_last_updated"
          type="date"
          class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
        />
        <p class="text-[10px] text-slate-400">
          This date will appear on the Privacy Policy and Terms of Service
          pages.
        </p>
      </div>

      <!-- 6. System Status -->
      <section class="bg-white border border-slate-200 rounded-lg p-6">
        <div
          class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100"
        >
          <h3 class="text-lg font-medium text-slate-800">System Status</h3>
          <!-- No edit toggle for this one as it's just a switch -->
        </div>
        <div class="flex items-center justify-between">
          <div>
            <label
              for="maintenance_mode"
              class="text-sm font-medium text-slate-700"
              >Maintenance Mode</label
            >
            <p class="text-xs text-slate-500 mt-1">
              Enable to show a maintenance page to visitors.
            </p>
          </div>
          <button
            type="button"
            @click="form.maintenance_mode = !form.maintenance_mode"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :class="form.maintenance_mode ? 'bg-blue-600' : 'bg-slate-200'"
            role="switch"
            :aria-checked="form.maintenance_mode"
            id="maintenance_mode"
            name="maintenance_mode"
          >
            <span
              aria-hidden="true"
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="form.maintenance_mode ? 'translate-x-5' : 'translate-x-0'"
            ></span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
