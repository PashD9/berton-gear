<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
} from 'chart.js'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler
)

const props = defineProps({
  products: {
    type: Array,
    required: true
  }
})

const chartData = computed(() => {
  const labels = []
  const monthlyCounts = {}

  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const month = d.toLocaleString('default', { month: 'short' })
    const year = d.getFullYear().toString().slice(-2)
    const key = `${month} '${year}`
    labels.push(key)
    monthlyCounts[key] = 0
  }

  // Populate counts from products
  props.products.forEach(product => {
    if (product.createdAt?.seconds) {
      const createdDate = new Date(product.createdAt.seconds * 1000)
      const month = createdDate.toLocaleString('default', { month: 'short' })
      const year = createdDate.getFullYear().toString().slice(-2)
      const key = `${month} '${year}`
      if (key in monthlyCounts) {
        monthlyCounts[key]++
      }
    }
  })

  return {
    labels,
    datasets: [
      {
        label: 'Products Added',
        backgroundColor: 'rgba(30, 144, 255, 0.1)',
        borderColor: 'rgb(30, 144, 255)',
        data: labels.map(key => monthlyCounts[key]),
        fill: true,
        tension: 0.4,
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
    x: { grid: { display: false } }
  },
  plugins: {
    legend: { display: false }
  }
}
</script>

<template>
  <div style="height: 300px">
    <Line v-if="products.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="flex items-center justify-center h-full text-slate-400">
        Not enough data to display chart.
    </div>
  </div>
</template>