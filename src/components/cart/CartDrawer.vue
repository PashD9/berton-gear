<script setup>
import { useCartStore } from '@/stores/cartStore'
import { useRouter } from 'vue-router'
import { useUtilityStore } from '@/stores/utilityStore'

const cart = useCartStore()
const router = useRouter()
const utils = useUtilityStore()

const goToCheckout = () => {
  cart.closeCart()
  router.push('/checkout')
}
</script>

<template>
  <div>
    <!-- Backdrop -->
    <div
      v-if="cart.isOpen"
      class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
      @click="cart.closeCart"
    ></div>

    <!-- Drawer -->
    <div
      class="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col overflow-hidden md:top-4 md:right-4 md:bottom-4 md:rounded-lg md:border md:border-slate-300"
      :class="cart.isOpen ? 'translate-x-0' : 'translate-x-[120%]'"
    >
      <!-- Header -->
      <div
        class="p-5 border-b border-slate-100 flex justify-between items-center"
      >
        <div>
          <h3 class="text-slate-800">Your Cart</h3>
          <p class="text-xs text-slate-500">
            {{ cart.items.length }} items selected
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="cart.items.length > 0"
            @click="cart.clearCart"
            class="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider mr-2"
          >
            Clear Cart
          </button>
          <button
            @click="cart.closeCart"
            class="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
        <div
          v-if="cart.items.length === 0"
          class="h-full flex flex-col items-center justify-center text-slate-400 space-y-4"
        >
          <div
            class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"
          >
            <span class="material-symbols-outlined text-3xl"
              >shopping_cart_off</span
            >
          </div>
          <p>Your cart is currently empty.</p>
          <button
            @click="cart.closeCart"
            class="text-sm text-blue-600 font-bold hover:underline"
          >
            Start Browsing
          </button>
        </div>

        <div v-else>
          <!-- Cart Items (With Price) -->
          <div v-if="cart.buyItems.length > 0" class="space-y-2 mb-8">
            <h4 class="text-slate-400 mb-2">Ready to Purchase</h4>
            <div
              v-for="item in cart.buyItems"
              :key="item.id"
              class="flex gap-4 bg-white border border-slate-100 p-1.5 rounded-md"
            >
              <div
                class="w-16 h-16 bg-slate-50 rounded-md shrink-0 overflow-hidden border border-slate-100"
              >
                <img
                  v-if="item.imageURL"
                  :src="item.imageURL"
                  class="w-full h-full object-contain p-1"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-slate-300"
                >
                  <span class="material-symbols-outlined">image</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 text-sm truncate">
                  {{ item.name }}
                </h4>
                <p class="text-xs text-slate-500 mb-2">
                  {{ item.product_code }}
                </p>
                <div class="flex justify-between items-center">
                  <span class="font-mono text-sm font-bold text-slate-700">{{
                    utils.formatCurrency(item.price)
                  }}</span>
                  <div
                    class="flex items-center border border-slate-200 rounded-md bg-slate-50"
                  >
                    <button
                      @click="cart.updateQuantity(item.id, -1)"
                      class="px-2 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-xs font-bold"
                    >
                      -
                    </button>
                    <span
                      class="text-xs font-bold text-slate-700 px-1 min-w-5 text-center"
                      >{{ item.quantity }}</span
                    >
                    <button
                      @click="cart.updateQuantity(item.id, 1)"
                      class="px-2 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    @click="cart.removeItem(item.id)"
                    class="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Quote Items (No Price) -->
          <div v-if="cart.quoteItems.length > 0" class="space-y-2">
            <h4 class="text-slate-400 mb-2">Request for Quote</h4>
            <div
              v-for="item in cart.quoteItems"
              :key="item.id"
              class="flex gap-4 bg-blue-50/50 border border-blue-100 p-1.5 rounded-md"
            >
              <div
                class="w-16 h-16 bg-white rounded-md shrink-0 overflow-hidden border border-blue-100"
              >
                <img
                  v-if="item.imageURL"
                  :src="item.imageURL"
                  class="w-full h-full object-contain p-1"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-blue-200"
                >
                  <span class="material-symbols-outlined">image</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 text-sm truncate">
                  {{ item.name }}
                </h4>
                <p class="text-xs text-slate-500 mb-2">
                  {{ item.product_code }}
                </p>
                <div class="flex justify-between items-center">
                  <div
                    class="flex items-center border border-blue-200 rounded-md bg-white"
                  >
                    <button
                      @click="cart.updateQuantity(item.id, -1)"
                      class="px-2 py-0.5 text-blue-600 hover:bg-blue-50 text-xs font-bold"
                    >
                      -
                    </button>
                    <span
                      class="text-xs font-bold text-blue-800 px-1 min-w-5 text-center"
                      >{{ item.quantity }}</span
                    >
                    <button
                      @click="cart.updateQuantity(item.id, 1)"
                      class="px-2 py-0.5 text-blue-600 hover:bg-blue-50 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    @click="cart.removeItem(item.id)"
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

      <!-- Footer -->
      <div
        v-if="cart.items.length > 0"
        class="p-5 border-t border-slate-100 bg-slate-50 space-y-4"
      >
        <div
          v-if="cart.buyItems.length > 0"
          class="flex justify-between items-center"
        >
          <span class="text-sm font-medium text-slate-600">Subtotal</span>
          <span class="text-lg font-black text-slate-900">{{
            utils.formatCurrency(cart.cartTotal)
          }}</span>
        </div>

        <div class="flex flex-col gap-3">
          <button
            v-if="cart.buyItems.length > 0"
            @click="goToCheckout"
            class="w-full btn btn-dark flex flex-row justify-center items-center gap-2 whitespace-normal text-center"
          >
            Checkout
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
          <button
            v-if="cart.quoteItems.length > 0"
            @click="goToCheckout"
            class="w-full btn btn-primary flex flex-row justify-center items-center gap-2 whitespace-normal text-center"
          >
            Request Quote
            <span class="material-symbols-outlined text-sm">mail</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
