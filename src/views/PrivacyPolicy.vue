<script setup>
import { useHead } from '@unhead/vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUtilityStore } from '@/stores/utilityStore'

useHead({
  title: 'Privacy Policy',
  meta: [
    {
      name: 'description',
      content: 'Privacy Policy for PumpHaus. Learn how we handle your data.',
    },
  ],
})

const settingsStore = useSettingsStore()
const utils = useUtilityStore()
</script>

<template>
  <div class="bg-slate-50 min-h-screen py-12">
    <div class="container mx-auto px-4 max-w-4xl">
      <div
        class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12"
      >
        <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
          Privacy Policy
        </h1>

        <div class="space-y-6 text-slate-600 leading-relaxed">
          <p class="text-lg font-medium text-slate-700">
            Last updated:
            {{
              settingsStore.settings.policy_last_updated
                ? utils.formatDate(settingsStore.settings.policy_last_updated)
                : new Date().toLocaleDateString()
            }}
          </p>

          <section>
            <h2 class="text-xl font-bold text-slate-800 mb-3">
              1. Introduction
            </h2>
            <p>
              Welcome to PumpHaus. We respect your privacy and are committed to
              protecting your personal data. This privacy policy will inform you
              as to how we look after your personal data when you visit our
              website and tell you about your privacy rights and how the law
              protects you.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-800 mb-3">
              2. Data We Collect
            </h2>
            <p>
              We may collect, use, store and transfer different kinds of
              personal data about you which we have grouped together follows:
            </p>
            <ul class="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Identity Data</strong> includes first name, last name,
                username or similar identifier.
              </li>
              <li>
                <strong>Contact Data</strong> includes billing address, delivery
                address, email address and telephone numbers.
              </li>
              <li>
                <strong>Technical Data</strong> includes internet protocol (IP)
                address, your login data, browser type and version, time zone
                setting and location, browser plug-in types and versions,
                operating system and platform and other technology on the
                devices you use to access this website.
              </li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-800 mb-3">
              3. How We Use Your Data
            </h2>
            <p>
              We will only use your personal data when the law allows us to.
              Most commonly, we will use your personal data in the following
              circumstances:
            </p>
            <ul class="list-disc pl-5 mt-2 space-y-1">
              <li>
                Where we need to perform the contract we are about to enter into
                or have entered into with you.
              </li>
              <li>
                Where it is necessary for our legitimate interests (or those of
                a third party) and your interests and fundamental rights do not
                override those interests.
              </li>
              <li>
                Where we need to comply with a legal or regulatory obligation.
              </li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-800 mb-3">4. Cookies</h2>
            <p>
              You can set your browser to refuse all or some browser cookies, or
              to alert you when websites set or access cookies. If you disable
              or refuse cookies, please note that some parts of this website may
              become inaccessible or not function properly.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-800 mb-3">5. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our privacy
              practices, please contact us.
            </p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
