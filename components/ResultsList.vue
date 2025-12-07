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
              <span class="stat-value">{{ formatSize(result.originalSize) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Оптимізований:</span>
              <div class="stat-value-wrapper">
                <span class="stat-value success">{{ formatSize(result.optimizedSize) }}</span>
                <span class="stat-savings">
                  ({{ calculateSavings(result.originalSize, result.optimizedSize) }}%)
                </span>
              </div>
            </div>
            <div class="stat-item">
              <span class="stat-label">WebP:</span>
              <div class="stat-value-wrapper">
                <span class="stat-value success">{{ formatSize(result.webpSize) }}</span>
                <span class="stat-savings">
                  ({{ calculateSavings(result.originalSize, result.webpSize) }}%)
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
defineProps({
  results: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['download-optimized', 'download-webp', 'download-all', 'clear'])

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

.stat-savings {
  font-size: 0.875rem;
  color: $success-color;
  font-weight: 500;
  margin-left: 0.25rem;
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

