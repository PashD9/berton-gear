<script setup>
import { useCartStore } from '@/stores/cartStore'
import { onMounted, reactive } from 'vue'
import { useBreadcrumbStore } from '@/stores/breadcrumb'
import { useUtilityStore } from '@/stores/utilityStore'
import { useOrderStore } from '@/stores/orderStore'

const cart = useCartStore()
const breadcrumb = useBreadcrumbStore()
const utils = useUtilityStore()
const orderStore = useOrderStore()

const formData = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  message: '',
  honeypot: '', // Hidden field for bot prevention
})

onMounted(() => {
  breadcrumb.set([{ label: 'Checkout' }])
})

const handleCheckout = async (type) => {
  // Honeypot check: If this hidden field is filled, it's likely a bot.
  if (formData.honeypot) {
    console.warn('Honeypot triggered on checkout. Faking success.')
    // To fool the bot, we'll clear the cart and show a success message.
    cart.items = []
    utils.triggerToast('Your order has been submitted successfully!', 'success')
    return
  }

  if (!formData.name || !formData.email || !formData.phone) {
    utils.triggerToast('Please fill in all required fields.', 'error')
    return
  }

  if (!utils.validateEmail(formData.email)) {
    utils.triggerToast('Please enter a valid email address.', 'error')
    return
  }

  if (type === 'quote') {
    utils.openConfirm(
      'Confirm Quote Request',
      'Are you sure you want to submit this quote request?',
      async () => {
        await orderStore.createOrder(formData, type)
      },
      'Submit Quote',
      'bg-blue-600',
    )
  } else {
    await orderStore.createOrder(formData, type)
  }
}

const clearQuoteItems = () => {
  utils.openConfirm(
    'Clear Quote Items',
    'Are you sure you want to remove all quote items from your cart?',
    () => {
      cart.items = cart.items.filter((item) => item.price && item.price > 0)
      utils.triggerToast('Quote items cleared', 'success')
    },
    'Clear',
    'bg-red-600',
  )
}

const clearPurchaseItems = () => {
  utils.openConfirm(
    'Clear Cart',
    'Are you sure you want to remove all purchase items from your cart?',
    () => {
      cart.items = cart.items.filter((item) => !item.price || item.price === 0)
      utils.triggerToast('Purchase items cleared', 'success')
    },
    'Clear',
    'bg-red-600',
  )
}
</script>

<template>
  <div class="container py-6 min-h-[60vh]">
    <h2 class="text-2xl font-bold mb-6 text-slate-800">Checkout</h2>

    <div
      v-if="cart.items.length === 0"
      class="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200"
    >
      <div
        class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"
      >
        <span class="material-symbols-outlined text-3xl"
          >shopping_cart_off</span
        >
      </div>
      <p class="text-slate-500 mb-6">Your cart is currently empty.</p>
      <router-link
        to="/products"
        class="inline-block px-6 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors"
      >
        Continue Shopping
      </router-link>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Cart Items -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Contact Form -->
        <div class="bg-white border border-slate-200 rounded-lg p-6">
          <h3 class="text-base font-bold text-slate-800 mb-4">
            Contact Information
          </h3>
          <!-- Honeypot Field: Hidden from users, meant to catch bots -->
          <div class="absolute -left-2499.75" aria-hidden="true">
            <label for="checkout-hp-field">Do not fill this out</label>
            <input
              id="checkout-hp-field"
              name="hp-field"
              type="text"
              v-model="formData.honeypot"
              tabindex="-1"
              autocomplete="off"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label
                for="checkout-name"
                class="text-[10px] font-bold text-slate-500 uppercase"
                >Full Name</label
              >
              <input
                id="checkout-name"
                name="name"
                v-model="formData.name"
                type="text"
                class="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label
                for="checkout-email"
                class="text-[10px] font-bold text-slate-500 uppercase"
                >Email Address</label
              >
              <input
                id="checkout-email"
                name="email"
                v-model="formData.email"
                type="email"
                class="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label
                for="checkout-phone"
                class="text-[10px] font-bold text-slate-500 uppercase"
                >Phone Number</label
              >
              <input
                id="checkout-phone"
                name="phone"
                v-model="formData.phone"
                type="tel"
                @blur="formData.phone = utils.formatPhoneNumber(formData.phone)"
                class="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label
                for="checkout-company"
                class="text-[10px] font-bold text-slate-500 uppercase"
                >Company (Optional)</label
              >
              <input
                id="checkout-company"
                name="company"
                v-model="formData.company"
                type="text"
                class="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <div class="md:col-span-2 flex flex-col gap-1">
              <label
                for="checkout-message"
                class="text-[10px] font-bold text-slate-500 uppercase"
                >Message / Notes</label
              >
              <textarea
                id="checkout-message"
                name="message"
                v-model="formData.message"
                @input="utils.autoResize"
                rows="3"
                class="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-blue-500 transition-all text-sm resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Purchase Items -->
        <div
          v-if="cart.buyItems.length > 0"
          class="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div
            class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"
          >
            <h3
              class="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <span class="material-symbols-outlined text-slate-400 text-lg"
                >shopping_bag</span
              >
              Items for Purchase
            </h3>
            <button
              type="button"
              @click="clearPurchaseItems"
              class="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
            >
              Clear Cart
            </button>
          </div>
          <div class="divide-y divide-slate-100">
            <div
              v-for="item in cart.buyItems"
              :key="item.id"
              class="p-4 flex gap-4 sm:gap-6 items-start sm:items-center"
            >
              <div
                class="w-20 h-20 bg-slate-50 rounded-lg border border-slate-100 shrink-0 p-2"
              >
                <img
                  :src="item.imageURL || '/placeholder-pump.jpg'"
                  class="w-full h-full object-contain mix-blend-multiply"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-slate-800 truncate">
                  {{ item.name }}
                </h3>
                <p class="text-xs text-slate-500 mb-2">
                  {{ item.product_code }}
                </p>
                <div class="flex flex-wrap items-center gap-4">
                  <div
                    class="flex items-center border border-slate-200 rounded-lg bg-white"
                  >
                    <button
                      type="button"
                      @click="cart.updateQuantity(item.id, -1)"
                      aria-label="Decrease quantity"
                      class="px-3 py-1 hover:bg-slate-50 text-slate-500"
                    >
                      -
                    </button>
                    <span
                      class="px-2 text-sm font-bold text-slate-700 min-w-5 text-center"
                      >{{ item.quantity }}</span
                    >
                    <button
                      type="button"
                      @click="cart.updateQuantity(item.id, 1)"
                      aria-label="Increase quantity"
                      class="px-3 py-1 hover:bg-slate-50 text-slate-500"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    @click="cart.removeItem(item.id)"
                    aria-label="Remove item"
                    class="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-slate-900">
                  {{ utils.formatCurrency(item.price * item.quantity) }}
                </div>
                <div class="text-xs text-slate-400">
                  {{ utils.formatCurrency(item.price) }} ea
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quote Items -->
        <div
          v-if="cart.quoteItems.length > 0"
          class="bg-white border border-blue-200 rounded-lg overflow-hidden"
        >
          <div
            class="p-4 border-b border-blue-100 bg-blue-50/50 flex justify-between items-center"
          >
            <h3
              class="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <span class="material-symbols-outlined text-blue-500 text-lg"
                >request_quote</span
              >
              Items for Quote
            </h3>
            <button
              type="button"
              @click="clearQuoteItems"
              class="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
            >
              Clear Quote
            </button>
          </div>
          <div class="divide-y divide-blue-100">
            <div
              v-for="item in cart.quoteItems"
              :key="item.id"
              class="p-4 flex gap-4 sm:gap-6 items-center"
            >
              <div
                class="w-20 h-20 bg-white rounded-lg border border-blue-100 shrink-0 p-2"
              >
                <img
                  :src="item.imageURL || '/placeholder-pump.jpg'"
                  class="w-full h-full object-contain mix-blend-multiply"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-slate-800 truncate">
                  {{ item.name }}
                </h3>
                <p class="text-xs text-slate-500 mb-2">
                  {{ item.product_code }}
                </p>
                <div class="flex items-center gap-4">
                  <div
                    class="flex items-center border border-blue-200 rounded-lg bg-white"
                  >
                    <button
                      type="button"
                      @click="cart.updateQuantity(item.id, -1)"
                      aria-label="Decrease quantity"
                      class="px-3 py-1 hover:bg-blue-50 text-blue-600"
                    >
                      -
                    </button>
                    <span
                      class="px-2 text-sm font-bold text-blue-800 min-w-5 text-center"
                      >{{ item.quantity }}</span
                    >
                    <button
                      type="button"
                      @click="cart.updateQuantity(item.id, 1)"
                      aria-label="Increase quantity"
                      class="px-3 py-1 hover:bg-blue-50 text-blue-600"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    @click="cart.removeItem(item.id)"
                    aria-label="Remove item"
                    class="text-xs text-slate-400 hover:text-red-500 font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="lg:col-span-1">
        <div
          class="bg-white border border-slate-200 rounded-lg p-6 sticky top-24 shadow-sm"
        >
          <h3 class="text-base font-bold text-slate-800 mb-4">Order Summary</h3>

          <div
            v-if="cart.buyItems.length > 0"
            class="space-y-3 mb-6 pb-6 border-b border-slate-100"
          >
            <div class="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span class="font-medium">{{
                utils.formatCurrency(cart.cartTotal)
              }}</span>
            </div>
            <div class="flex justify-between text-sm text-slate-600">
              <span>Shipping</span>
              <span class="text-xs text-slate-400 italic"
                >Calculated next step</span
              >
            </div>
            <div class="flex justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span class="text-xs text-slate-400 italic"
                >Calculated next step</span
              >
            </div>
            <div class="flex justify-between items-end pt-2">
              <span class="font-bold text-slate-800">Total</span>
              <span class="text-2xl font-black text-slate-900">{{
                utils.formatCurrency(cart.cartTotal)
              }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button
              type="button"
              v-if="cart.buyItems.length > 0"
              @click="handleCheckout('order')"
              :disabled="orderStore.loading"
              :aria-busy="orderStore.loading"
              class="w-full btn btn-dark flex flex-row justify-center items-center gap-2 whitespace-normal text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                v-if="orderStore.loading"
                class="material-symbols-outlined animate-spin text-sm"
                >progress_activity</span
              >
              <span v-else>Proceed to Checkout</span>
              <span
                v-if="!orderStore.loading"
                class="material-symbols-outlined text-sm"
                >arrow_forward</span
              >
            </button>
            <button
              type="button"
              v-if="cart.quoteItems.length > 0"
              @click="handleCheckout('quote')"
              :disabled="orderStore.loading"
              :aria-busy="orderStore.loading"
              class="w-full btn btn-primary flex flex-row justify-center items-center gap-2 whitespace-normal text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                v-if="orderStore.loading"
                class="material-symbols-outlined animate-spin text-sm"
                >progress_activity</span
              >
              <span v-else>Request Quote</span>
              <span
                v-if="!orderStore.loading"
                class="material-symbols-outlined text-sm"
                >mail</span
              >
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
