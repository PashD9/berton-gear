import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useUtilityStore } from '@/stores/utilityStore'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve) => {
      // Add a small delay to handle transitions/DOM updates smoothly across browsers (fixes Firefox jitter)
      setTimeout(() => {
        // If navigating between subcategories, do not change scroll position.
        if (to.name === 'Categories' && from.name === 'Categories') {
          resolve(false)
          return
        }

        // On page refresh, browsers often remember scroll position.
        // We want to override this and always go to the top.
        // A refresh is characterized by `from.name` being undefined.
        if (savedPosition && !from.name) {
          return resolve({ top: 0 })
        }

        if (to.hash) {
          const utils = useUtilityStore()
          utils.beginLoading()

          const checkElement = () => {
            const element = document.querySelector(to.hash)
            if (element) {
              utils.endLoading()
              resolve({ el: to.hash, behavior: 'smooth' })
              return true
            }
            return false
          }

          if (!checkElement()) {
            const observer = new MutationObserver(() => {
              if (checkElement()) {
                observer.disconnect()
              }
            })
            observer.observe(document.body, {
              childList: true,
              subtree: true,
            })

            // Safety timeout: stop looking after 2s
            setTimeout(() => {
              observer.disconnect()
              utils.endLoading()
              resolve(savedPosition || { top: 0, behavior: 'smooth' })
            }, 2000)
          }
          return
        }

        // Attempt to scroll the main dashboard content area if it exists
        const dashboardMain = document.querySelector('main')
        if (dashboardMain) {
          dashboardMain.scrollTo({ top: 0, behavior: 'smooth' })
        }
        resolve(savedPosition || { top: 0, behavior: 'smooth' })
      }, 100)
    })
  },
  routes: [
    {
      path: '/index',
      name: 'MainLayout',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        {
          path: '/',
          name: 'Home',
          component: () => import('@/views/HomeView.vue'),
          meta: {
            isPublic: true,
            // title: 'Engineered Water Flow Solutions',
            // description:
            //   'Discover our innovative water flow solutions designed to optimize efficiency and sustainability. Explore our range of products and services tailored to meet your water management needs.',
          },
        },
        {
          path: '/about',
          name: 'About',
          component: () => import('@/views/AboutView.vue'),
          meta: {
            isPublic: true,
            title: 'About Us',
          },
        },
        {
          path: '/contact',
          name: 'Contact',
          component: () => import('@/views/ContactView.vue'),
          meta: {
            isPublic: true,
            title: 'Contact Us',
          },
        },
        {
          path: '/privacy-policy',
          name: 'PrivacyPolicy',
          component: () => import('@/views/PrivacyPolicy.vue'),
          meta: { isPublic: true, title: 'Privacy Policy' },
        },
        {
          path: '/terms-of-service',
          name: 'TermsOfService',
          component: () => import('@/views/TermsOfService.vue'),
          meta: { isPublic: true, title: 'Terms of Service' },
        },
        {
          path: '/checkout',
          name: 'Checkout',
          component: () => import('@/views/CheckoutView.vue'),
          meta: { title: 'Checkout' },
        },
        {
          path: '/products',
          component: () => import('@/views/ProductsView.vue'),
          children: [
            {
              path: '',
              name: 'Products',
              component: () => import('@/components/Products.vue'),
              meta: { isPublic: true },
            },
            {
              path: ':slug',
              name: 'Product',
              props: true,
              component: () =>
                import(
                  /* webpackChunkName: "product" */ '@/views/ProductView.vue'
                ),
              meta: {},
            },
            {
              path: '/categories/:slug',
              name: 'Categories',
              props: true,
              component: () => import('@/views/CategoriesView.vue'),
              meta: {},
            },
          ],
        },
      ],
    },
    {
      path: '/dashboard',
      name: 'DashboardLayout',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Admin Dashboard',
      },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/DashboardView.vue'),
          children: [
            {
              path: '/dashboard',
              name: 'Admin Dashboard',
              component: () => import('@/views/dashboard/HomeView.vue'),
              meta: { isPublic: true },
            },
            {
              path: 'products',
              component: () => import('@/views/dashboard/ProductsView.vue'),
              meta: {},
              children: [
                {
                  path: '',
                  name: 'Dashboard | Products',
                  component: () =>
                    import('@/views/dashboard/components/Products.vue'),
                },
              ],
            },
            {
              path: 'categories',
              component: () => import('@/views/dashboard/CategoriesView.vue'),
              meta: {},
              children: [
                {
                  path: '',
                  name: 'Dashboard | Categories',
                  component: () =>
                    import('@/views/dashboard/components/Categories.vue'),
                },
                {
                  path: 'edit/:id',
                  name: 'Dashboard | Category',
                  props: true,
                  component: () => import('@/views/dashboard/CategoryView.vue'),
                  meta: {},
                },
              ],
            },
            {
              path: 'sections',
              name: 'Dashboard | Sections',
              component: () => import('@/views/dashboard/SectionsView.vue'),
              meta: {},
            },
            {
              path: 'messages',
              name: 'Dashboard | Messages',
              component: () => import('@/views/dashboard/MessagesView.vue'),
              meta: {},
            },
            {
              path: 'settings',
              name: 'Dashboard | Settings',
              component: () => import('@/views/dashboard/SettingsView.vue'),
              meta: {},
            },
            {
              path: 'orders',
              name: 'Dashboard | Orders',
              component: () => import('@/views/dashboard/OrdersView.vue'),
              meta: {},
            },
            {
              path: 'navigationmanager',
              name: 'Dashboard | Navigation Manager',
              component: () => import('@/views/dashboard/NavManager.vue'),
              meta: {},
            },
          ],
        },
      ],
    },
    {
      path: '/admin-management-portal/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Admin Login' },
    },
    {
      path: '/:catchAll(.*)',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const utils = useUtilityStore()
  utils.beginLoading()

  const authStore = useAuthStore()

  // Wait for Firebase to tell us if someone is logged in
  if (!authStore.isAuthReady) {
    await authStore.init()
  }

  const isLoggedIn = !!authStore.user
  const isAdmin = authStore.isAdmin
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)

  if (to.path === '/admin-management-portal/login' && isLoggedIn) {
    return next(isAdmin ? '/dashboard' : '/')
  }

  if (!requiresAuth) {
    return next()
  }

  if (!isLoggedIn) {
    return next('/admin-management-portal/login')
  }

  if (requiresAdmin && !isAdmin) {
    return next('/')
  }

  return next()
})

router.afterEach(() => {
  const utils = useUtilityStore()
  utils.endLoading()
})

export default router
