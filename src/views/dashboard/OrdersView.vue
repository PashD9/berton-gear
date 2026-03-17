<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useUtilityStore } from '@/stores/utilityStore'
import { useBreadcrumbStore } from '@/stores/breadcrumb'

const orderStore = useOrderStore()
const utils = useUtilityStore()
const breadcrumb = useBreadcrumbStore()

const filterStatus = ref('All')
const showModal = ref(false)
const selectedOrder = ref(null)
const startDate = ref('')
const endDate = ref('')

const currentPage = ref(1)
const itemsPerPage = 10

const filteredOrders = computed(() => {
  let orders = orderStore.orders

  if (filterStatus.value !== 'All') {
    orders = orders.filter((order) => order.status === filterStatus.value)
  }

  if (startDate.value || endDate.value) {
    const start = startDate.value ? new Date(startDate.value) : null
    const end = endDate.value ? new Date(endDate.value) : null
    if (start) start.setHours(0, 0, 0, 0)
    if (end) end.setHours(23, 59, 59, 999)

    orders = orders.filter((order) => {
      if (!order.createdAt) return false
      const date = order.createdAt.toDate
        ? order.createdAt.toDate()
        : new Date(order.createdAt)
      if (start && date < start) return false
      if (end && date > end) return false
      return true
    })
  }

  return orders
})

const totalPages = computed(
  () => Math.ceil(filteredOrders.value.length / itemsPerPage) || 1,
)

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredOrders.value.slice(start, start + itemsPerPage)
})

watch([filterStatus, startDate, endDate], () => {
  currentPage.value = 1
})

const openModal = (order) => {
  selectedOrder.value = order
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedOrder.value = null
}

onMounted(() => {
  breadcrumb.set([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Orders' },
  ])
  orderStore.fetchOrders()
})

const exportToCSV = () => {
  if (filteredOrders.value.length === 0) {
    utils.triggerToast('No orders to export', 'warning')
    return
  }

  const headers = [
    'Order ID',
    'Date',
    'Customer',
    'Email',
    'Type',
    'Total',
    'Status',
  ]
  const rows = filteredOrders.value.map((order) => [
    order.id,
    utils.formatDate(order.createdAt),
    `"${order.contact?.name || ''}"`,
    order.contact?.email || '',
    order.type,
    order.type === 'quote' ? '0' : order.total,
    order.status,
  ])

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join(
    '\n',
  )
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
}

const handleDelete = (orderId) => {
  utils.openConfirm(
    'Delete Order',
    'Are you sure you want to delete this order? This action cannot be undone.',
    () => orderStore.deleteOrder(orderId),
    'Delete',
    'bg-red-600',
  )
  closeModal()
}

const handleEmail = () => {
  if (!selectedOrder.value) return

  utils.openConfirm(
    'Email Customer',
    `Send order details to ${selectedOrder.value.contact.email}?`,
    async () => {
      await orderStore.sendOrderEmail(
        selectedOrder.value.contact,
        selectedOrder.value.type,
        selectedOrder.value.id,
      )
      utils.triggerToast('Email sent successfully', 'success')
    },
    'Send Email',
    'bg-blue-600',
  )
}

const handlePrint = () => {
  window.print()
}
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Orders</h2>
      <div class="flex flex-wrap items-center gap-4">
        <div
          class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1"
        >
          <input
            type="date"
            id="orders-start-date"
            name="orders_start_date"
            v-model="startDate"
            class="text-xs font-bold text-slate-600 outline-none bg-transparent cursor-pointer"
            aria-label="Start Date"
            title="Filter orders from this date"
          />
          <span class="text-slate-300">-</span>
          <input
            type="date"
            id="orders-end-date"
            name="orders_end_date"
            v-model="endDate"
            class="text-xs font-bold text-slate-600 outline-none bg-transparent cursor-pointer"
            aria-label="End Date"
            title="Filter orders to this date"
          />
        </div>

        <div class="relative">
          <select
            id="orders-filter-status"
            name="orders_filter_status"
            v-model="filterStatus"
            aria-label="Filter orders by status"
            class="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-8 rounded-lg text-sm font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div
            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500"
          >
            <span class="material-symbols-outlined text-sm">expand_more</span>
          </div>
        </div>
        <button
          type="button"
          @click="exportToCSV"
          class="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-700 transition-colors"
        >
          <span class="material-symbols-outlined text-sm">download</span>
          Export
        </button>
        <button
          type="button"
          @click="orderStore.fetchOrders()"
          class="p-2 text-slate-500 hover:text-blue-600 transition-colors"
          aria-label="Refresh Orders"
          title="Refresh Orders"
        >
          <span
            class="material-symbols-outlined"
            :class="{ 'animate-spin': orderStore.loading }"
            >refresh</span
          >
        </button>
      </div>
    </div>

    <div
      v-if="orderStore.loading && orderStore.orders.length === 0"
      class="text-center py-12 text-slate-400"
    >
      Loading orders...
    </div>

    <div
      v-else-if="orderStore.orders.length === 0"
      class="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200"
    >
      <p class="text-slate-500">No orders found.</p>
    </div>

    <div
      v-else
      class="bg-white rounded-xl border border-slate-200 overflow-hidden"
    >
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left text-sm">
          <thead
            class="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold"
          >
            <tr>
              <th class="px-6 py-4">Order ID</th>
              <th class="px-6 py-4">Date</th>
              <th class="px-6 py-4">Customer</th>
              <th class="px-6 py-4">Type</th>
              <th class="px-6 py-4">Total</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="order in paginatedOrders"
              :key="order.id"
              class="hover:bg-slate-50/50 transition-colors"
            >
              <td class="px-6 py-4 font-mono text-xs text-slate-500">
                {{ order.id.slice(0, 8) }}...
              </td>
              <td class="px-6 py-4">
                {{ utils.formatDate(order.createdAt) }}
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900">
                  {{ order.contact?.name || 'Unknown' }}
                </div>
                <div class="text-xs text-slate-500">
                  {{ order.contact?.email }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide"
                  :class="
                    order.type === 'quote'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-green-50 text-green-600'
                  "
                >
                  {{ order.type }}
                </span>
              </td>
              <td class="px-6 py-4 font-medium">
                {{
                  order.type === 'quote'
                    ? '-'
                    : utils.formatCurrency(order.total)
                }}
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  :class="{
                    'bg-yellow-100 text-yellow-700': order.status === 'pending',
                    'bg-green-100 text-green-700': order.status === 'completed',
                    'bg-red-100 text-red-700': order.status === 'cancelled',
                  }"
                >
                  {{ order.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  type="button"
                  @click="openModal(order)"
                  class="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wide"
                >
                  View Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center"
      >
        <span class="text-xs text-slate-500 font-bold">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-1 border border-slate-200 rounded bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 border border-slate-200 rounded bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Order Details Modal -->
    <div
      v-if="showModal && selectedOrder"
      id="order-modal-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @click.self="closeModal"
    >
      <div
        id="order-modal-card"
        class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div
          class="p-6 border-b border-slate-100 flex justify-between items-center shrink-0"
        >
          <div>
            <h3 class="text-xl font-bold text-slate-800">Order Details</h3>
            <p class="text-xs text-slate-500 font-mono mt-1">
              ID: {{ selectedOrder.id }}
            </p>
          </div>
          <div class="flex items-center gap-2 no-print">
            <button
              type="button"
              @click="handlePrint"
              class="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              aria-label="Print order"
              title="Print Order"
            >
              <span class="material-symbols-outlined">print</span>
            </button>
            <button
              type="button"
              @click="closeModal"
              class="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              aria-label="Close modal"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div class="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          <!-- Items List -->
          <div>
            <h4
              class="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2"
            >
              <span class="material-symbols-outlined text-sm"
                >shopping_cart</span
              >
              Order Items
            </h4>
            <div class="space-y-3">
              <div
                v-for="item in selectedOrder.items"
                :key="item.id"
                class="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100"
              >
                <div
                  class="w-12 h-12 bg-white rounded border border-slate-200 shrink-0 overflow-hidden"
                >
                  <img
                    v-if="item.imageURL"
                    :src="item.imageURL"
                    class="w-full h-full object-contain mix-blend-multiply"
                  />
                  <span
                    v-else
                    class="material-symbols-outlined text-slate-300 w-full h-full flex items-center justify-center"
                    >image</span
                  >
                </div>
                <div class="grow text-sm">
                  <div class="font-bold text-slate-900">{{ item.name }}</div>
                  <div class="text-slate-500 text-xs">
                    {{ item.product_code }}
                  </div>
                </div>
                <div class="text-right text-sm">
                  <div class="font-medium">
                    {{ item.quantity }} x
                    {{
                      selectedOrder.type === 'quote'
                        ? '-'
                        : utils.formatCurrency(item.price)
                    }}
                  </div>
                  <div
                    v-if="selectedOrder.type !== 'quote'"
                    class="text-slate-500 font-bold"
                  >
                    {{ utils.formatCurrency(item.price * item.quantity) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Customer Note -->
          <div
            v-if="selectedOrder.contact?.message"
            class="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800"
          >
            <span class="font-bold block mb-1 text-xs uppercase"
              >Customer Note:</span
            >
            {{ selectedOrder.contact.message }}
          </div>

          <!-- Contact Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="text-xs font-bold uppercase text-slate-500 mb-2">
                Customer
              </h4>
              <p class="font-bold text-slate-900">
                {{ selectedOrder.contact?.name }}
              </p>
              <p class="text-sm text-slate-600">
                {{ selectedOrder.contact?.email }}
              </p>
              <p class="text-sm text-slate-600">
                {{ selectedOrder.contact?.phone }}
              </p>
            </div>
            <div v-if="selectedOrder.contact?.company">
              <h4 class="text-xs font-bold uppercase text-slate-500 mb-2">
                Company
              </h4>
              <p class="text-sm text-slate-900">
                {{ selectedOrder.contact.company }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 no-print"
        >
          <div class="flex gap-2">
            <button
              type="button"
              @click="handleDelete(selectedOrder.id)"
              class="text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-md text-xs font-bold uppercase transition-colors"
            >
              Delete Order
            </button>
            <button
              type="button"
              @click="handleEmail"
              class="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-md text-xs font-bold uppercase transition-colors"
            >
              Email Customer
            </button>
          </div>

          <div class="flex items-center gap-3">
            <label
              class="text-xs font-bold text-slate-500 uppercase"
              for="modal-order-status"
              >Status:</label
            >
            <select
              id="modal-order-status"
              name="modal_order_status"
              :value="selectedOrder.status"
              @change="
                orderStore.updateOrderStatus(
                  selectedOrder.id,
                  $event.target.value,
                )
              "
              class="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-md px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #order-modal-card,
  #order-modal-card * {
    visibility: visible;
  }
  #order-modal-card {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 100% !important;
    max-height: none !important;
    overflow: visible !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
  }
  .no-print {
    display: none !important;
  }
}
</style>
