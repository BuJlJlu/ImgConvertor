<template>
  <div class="results-list">
    <div class="results-header">
      <h2 class="results-title">Результати обробки</h2>
      <div class="results-actions">
        <button 
          v-if="results.length > 1"
          @click="handleDownloadAll"
          class="btn btn-primary"
        >
          Завантажити всі (ZIP)
        </button>
        <button 
          @click="handleClear"
          class="btn btn-secondary"
        >
          Очистити
        </button>
      </div>
    </div>

    <div class="results-grid">
      <div 
        v-for="(result, index) in results" 
        :key="index"
        class="result-item"
      >
        <div class="result-info">
          <h3 class="result-filename">
            {{ result.originalName }}
            <span class="file-format">{{ getFileFormat(result.originalName) }}</span>
          </h3>
          <div class="result-stats">
            <div class="stat-item">
              <span class="stat-label">Оригінал:</span>
              <div class="stat-value-wrapper">
                <span class="stat-value">{{ formatSize(result.originalSize) }}</span>
                <span v-if="result.width && result.height" class="stat-dimensions">{{ result.width }}×{{ result.height }}</span>
              </div>
            </div>
            <div class="stat-item">
              <span class="stat-label">Оптимізований:</span>
              <div class="stat-value-wrapper">
                <span class="stat-value success">{{ formatSize(result.optimizedSize) }}</span>
                <span 
                  v-if="result.optimizedWidth && result.optimizedHeight" 
                  class="stat-dimensions"
                  :class="{ 'stat-dimensions-different': hasDifferentDimensions(result, 'optimized') }"
                >
                  {{ result.optimizedWidth }}×{{ result.optimizedHeight }}
                </span>
                <span class="stat-savings">
                  ({{ calculateSavings(result.originalSize, result.optimizedSize) }}%)
                </span>
              </div>
            </div>
            <div class="stat-item">
              <span class="stat-label">WebP:</span>
              <div class="stat-value-wrapper">
                <span class="stat-value success">{{ formatSize(result.webpSize) }}</span>
                <span 
                  v-if="result.webpWidth && result.webpHeight" 
                  class="stat-dimensions"
                  :class="{ 'stat-dimensions-different': hasDifferentDimensions(result, 'webp') }"
                >
                  {{ result.webpWidth }}×{{ result.webpHeight }}
                </span>
                <span class="stat-savings">
                  ({{ calculateSavings(result.originalSize, result.webpSize) }}%)
                </span>
                <span v-if="!willWebPBeInArchive(result)" class="archive-excluded-badge" title="Не буде включено в архів">
                  ⚠️
                </span>
                <span v-else class="archive-included-badge" title="Буде включено в архів">
                  ✓
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="result-actions-buttons">
          <button 
            @click="handleDownloadOptimized(result)"
            class="btn btn-download-optimized"
            title="Завантажити оптимізований оригінальний файл"
          >
            Оптимізований
          </button>
          <button 
            @click="handleDownloadWebP(result)"
            class="btn btn-download"
            title="Завантажити WebP файл"
          >
            WebP
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  results: {
    type: Array,
    required: true
  },
  skipLargerWebP: {
    type: Boolean,
    default: false
  },
  skipSmallOptimized: {
    type: Boolean,
    default: false
  },
  minSizeThreshold: {
    type: Number,
    default: 20
  },
  skipWebpIfNotMuchSmaller: {
    type: Boolean,
    default: false
  },
  webpSizeDifferenceThreshold: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['download-optimized', 'download-webp', 'download-all', 'clear'])

// Функція для перевірки, чи розміри відрізняються від оригіналу
const hasDifferentDimensions = (result, type) => {
  if (!result.width || !result.height) return false
  
  if (type === 'optimized') {
    if (!result.optimizedWidth || !result.optimizedHeight) return false
    return result.optimizedWidth !== result.width || result.optimizedHeight !== result.height
  }
  
  if (type === 'webp') {
    if (!result.webpWidth || !result.webpHeight) return false
    return result.webpWidth !== result.width || result.webpHeight !== result.height
  }
  
  return false
}

// Функція для визначення, чи WebP буде в архіві
const willWebPBeInArchive = (result) => {
  let willIncludeWebP = true
  
  // Перевірка 1: Пропускаємо WebP, якщо він більший за оптимізований
  if (props.skipLargerWebP && result.webpSize > result.optimizedSize) {
    willIncludeWebP = false
  }
  
  // Перевірка 2: Пропускаємо WebP, якщо оптимізоване зображення менше порогу
  if (props.skipSmallOptimized && willIncludeWebP) {
    const optimizedSizeKB = result.optimizedSize / 1024
    if (optimizedSizeKB < props.minSizeThreshold) {
      willIncludeWebP = false
    }
  }
  
  // Перевірка 3: Пропускаємо WebP, якщо він менший за оптимізоване на менше порогу
  if (props.skipWebpIfNotMuchSmaller && willIncludeWebP) {
    const sizeDifference = result.optimizedSize - result.webpSize
    const thresholdBytes = props.webpSizeDifferenceThreshold * 1024 // Конвертуємо КБ в байти
    if (sizeDifference < thresholdBytes) {
      willIncludeWebP = false
    }
  }
  
  return willIncludeWebP
}

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const calculateSavings = (original, optimized) => {
  if (original === 0) return 0
  return Math.round(((original - optimized) / original) * 100)
}

const getFileFormat = (filename) => {
  const extension = filename.split('.').pop()?.toUpperCase()
  return extension || ''
}

const handleDownloadOptimized = (result) => {
  emit('download-optimized', result)
}

const handleDownloadWebP = (result) => {
  emit('download-webp', result)
}

const handleDownloadAll = () => {
  emit('download-all')
}

const handleClear = () => {
  emit('clear')
}
</script>

<style scoped lang="scss">
.results-list {
  background: $background-secondary;
  border-radius: $border-radius;
  padding: 2rem;
  box-shadow: $shadow;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.results-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: $text-primary;
}

.results-actions {
  display: flex;
  gap: 0.75rem;
}

.results-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border-radius: $border-radius;
  border: 1px solid $border-color;
  transition: all 0.2s ease;
  gap: 1rem;

  &:hover {
    box-shadow: $shadow-hover;
    transform: translateY(-2px);
  }
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-filename {
  font-size: 1.1rem;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 0.75rem;
  word-break: break-word;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-format {
  font-size: 0.875rem;
  font-weight: 500;
  color: $text-secondary;
  background: $background-tertiary;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.result-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value-wrapper {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.stat-label {
  font-size: 0.875rem;
  color: $text-secondary;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: $text-primary;

  &.success {
    color: $success-color;
  }
}

.stat-dimensions {
  font-size: 0.875rem;
  color: $text-secondary;
  font-weight: 500;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  background: $background-tertiary;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &.stat-dimensions-different {
    color: #dc3545;
    background: rgba(220, 53, 69, 0.1);
    font-weight: 600;
  }
}

.stat-savings {
  font-size: 0.875rem;
  color: $success-color;
  font-weight: 500;
  margin-left: 0.25rem;
}

.archive-included-badge {
  display: inline-block;
  margin-left: 0.5rem;
  color: $success-color;
  font-weight: 600;
  font-size: 0.875rem;
}

.archive-excluded-badge {
  display: inline-block;
  margin-left: 0.5rem;
  color: $text-secondary;
  font-size: 0.875rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: $border-radius;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-hover;
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-primary {
  background: $primary-color;
  color: white;

  &:hover {
    background: darken($primary-color, 10%);
  }
}

.btn-secondary {
  background: $background-tertiary;
  color: $text-primary;

  &:hover {
    background: darken($background-tertiary, 5%);
  }
}

.result-actions-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-download-optimized {
  background: $primary-color;
  color: white;

  &:hover {
    background: darken($primary-color, 10%);
  }
}

.btn-download {
  background: $success-color;
  color: white;

  &:hover {
    background: darken($success-color, 10%);
  }
}

@media (max-width: 768px) {
  .result-item {
    flex-direction: column;
    align-items: stretch;
  }

  .result-actions-buttons {
    flex-direction: column;
    width: 100%;
  }

  .btn-download,
  .btn-download-optimized {
    width: 100%;
  }

  .results-header {
    flex-direction: column;
    align-items: stretch;
  }

  .results-actions {
    flex-direction: column;
  }
}
</style>

