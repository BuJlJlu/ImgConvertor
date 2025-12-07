export default defineNuxtConfig({
  target: 'static',
  ssr: false,
  compatibilityDate: '2024-01-01',

  app: {
    baseURL: '/ImgConvertor/',
    buildAssetsDir: '/_nuxt/'
  },

  nitro: {
    prerender: {
      crawlLinks: true
    }
  },

  css: ['~/assets/styles/main.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@import "@/assets/styles/_variables.scss";'
        }
      }
    },
    optimizeDeps: {
      exclude: ['@squoosh/lib']
    }
  }
})