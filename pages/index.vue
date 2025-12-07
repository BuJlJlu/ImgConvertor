<template>
  <div class="container">
    <header class="header">
      <h1 class="title">Image Optimizer & WebP Converter</h1>
      <p class="subtitle">
        Створено 
        <a href="https://github.com/BuJlJlu" target="_blank" rel="noopener noreferrer" class="author-link">
          Mukola Golovashchenko
        </a>
      </p>
    </header>

    <main class="main-content">
      <SettingsPanel
        :skip-larger-web-p="skipLargerWebP"
        :skip-small-optimized="skipSmallOptimized"
        :min-size-threshold="minSizeThreshold"
        :skip-webp-if-not-much-smaller="skipWebpIfNotMuchSmaller"
        :webp-size-difference-threshold="webpSizeDifferenceThreshold"
        @update:skip-larger-web-p="skipLargerWebP = $event"
        @update:skip-small-optimized="skipSmallOptimized = $event"
        @update:min-size-threshold="minSizeThreshold = $event"
        @update:skip-webp-if-not-much-smaller="skipWebpIfNotMuchSmaller = $event"
        @update:webp-size-difference-threshold="webpSizeDifferenceThreshold = $event"
      />

      <ImageUploader 
        @files-selected="handleFilesSelected"
        :is-processing="isProcessing"
      />

      <ProgressBar 
        v-if="isProcessing"
        :progress="progress"
        :current-file="currentFileName"
      />

      <ResultsList 
        v-if="results.length > 0"
        :results="results"
        :skip-larger-web-p="skipLargerWebP"
        :skip-small-optimized="skipSmallOptimized"
        :min-size-threshold="minSizeThreshold"
        :skip-webp-if-not-much-smaller="skipWebpIfNotMuchSmaller"
        :webp-size-difference-threshold="webpSizeDifferenceThreshold"
        @download-optimized="handleDownloadOptimized"
        @download-webp="handleDownloadWebP"
        @download-all="handleDownloadAll"
        @clear="handleClear"
      />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useImageProcessor } from '~/composables/useImageProcessor'
import { useFileHandler } from '~/composables/useFileHandler'

// Значення за замовчуванням
const DEFAULT_QUALITY = 70
const DEFAULT_OPTIMIZATION_LEVEL = 70
const DEFAULT_SKIP_LARGER_WEBP = false
const DEFAULT_SKIP_SMALL_OPTIMIZED = false
const DEFAULT_MIN_SIZE_THRESHOLD = 20 // в КБ
const DEFAULT_SKIP_WEBP_IF_NOT_MUCH_SMALLER = false
const DEFAULT_WEBP_SIZE_DIFFERENCE_THRESHOLD = 10 // в КБ

const files = ref([])
const results = ref([])
const isProcessing = ref(false)
const progress = ref(0)
const currentFileName = ref('')
const skipLargerWebP = ref(DEFAULT_SKIP_LARGER_WEBP)
const skipSmallOptimized = ref(DEFAULT_SKIP_SMALL_OPTIMIZED)
const minSizeThreshold = ref(DEFAULT_MIN_SIZE_THRESHOLD)
const skipWebpIfNotMuchSmaller = ref(DEFAULT_SKIP_WEBP_IF_NOT_MUCH_SMALLER)
const webpSizeDifferenceThreshold = ref(DEFAULT_WEBP_SIZE_DIFFERENCE_THRESHOLD)

const { processBatch } = useImageProcessor()
const { createZipArchive } = useFileHandler()

const handleFilesSelected = async (selectedFiles) => {
  files.value = selectedFiles
  isProcessing.value = true
  progress.value = 0
  results.value = []

  try {
    const processed = await processBatch(
      selectedFiles,
      DEFAULT_QUALITY,
      DEFAULT_OPTIMIZATION_LEVEL,
      (current, total, fileName) => {
        progress.value = Math.round((current / total) * 100)
        currentFileName.value = fileName
      }
    )

    results.value = processed
  } catch (error) {
    console.error('Помилка обробки файлів:', error)
    alert('Сталася помилка під час обробки файлів')
  } finally {
    isProcessing.value = false
    progress.value = 0
    currentFileName.value = ''
  }
}

const handleDownloadOptimized = (result) => {
  const url = URL.createObjectURL(result.optimizedBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.optimizedName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleDownloadWebP = (result) => {
  const url = URL.createObjectURL(result.webpBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.webpName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleDownloadAll = async () => {
  if (results.value.length === 0) return

  try {
    const zipBlob = await createZipArchive(
      results.value, 
      skipLargerWebP.value,
      skipSmallOptimized.value,
      minSizeThreshold.value,
      skipWebpIfNotMuchSmaller.value,
      webpSizeDifferenceThreshold.value
    )
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'converted-images.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Помилка створення ZIP:', error)
    alert('Сталася помилка під час створення архіву')
  }
}

const handleClear = () => {
  results.value = []
  files.value = []
}
</script>

<style scoped lang="scss">
.container {
  min-height: 100vh;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 3rem;

  .title {
    font-size: 2.5rem;
    font-weight: 700;
    color: $primary-color;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1.1rem;
    color: $text-secondary;
  }

  .author-link {
    color: $primary-color;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;

    &:hover {
      text-decoration: underline;
      color: darken($primary-color, 10%);
    }
  }
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>

