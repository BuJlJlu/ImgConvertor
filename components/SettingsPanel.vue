<template>
  <div class="settings-panel">
    <h2 class="settings-title">Налаштування</h2>
    
    <div class="settings-content">
      <div class="setting-item">
        <label class="setting-label toggle-label">
          <span>Виключати WebP, якщо більші за оптимізовані</span>
          <label class="toggle-switch">
            <input
              v-model="localSkipLargerWebP"
              type="checkbox"
              @change="updateSkipLargerWebP"
            />
            <span class="toggle-slider"></span>
          </label>
        </label>
        <p class="setting-description">
          Якщо увімкнено, WebP файли не будуть додані до архіву, якщо вони більші за оптимізовані файли з джерела
        </p>
      </div>

      <div class="setting-item">
        <label class="setting-label toggle-label">
          <span>Виключати WebP, якщо оптимізоване менше порогу</span>
          <label class="toggle-switch">
            <input
              v-model="localSkipSmallOptimized"
              type="checkbox"
              @change="updateSkipSmallOptimized"
            />
            <span class="toggle-slider"></span>
          </label>
        </label>
        <div v-if="localSkipSmallOptimized" class="threshold-input-wrapper">
          <label class="threshold-label">
            Поріг розміру (КБ):
            <input
              v-model.number="localMinSizeThreshold"
              type="number"
              min="1"
              step="1"
              class="threshold-input"
              @change="updateMinSizeThreshold"
            />
          </label>
        </div>
        <p class="setting-description">
          Якщо увімкнено, WebP файли не будуть додані до архіву, якщо оптимізоване зображення менше вказаного порогу
        </p>
      </div>

      <div class="setting-item">
        <label class="setting-label toggle-label">
          <span>Виключати WebP, якщо менше оптимізованого на менше порогу</span>
          <label class="toggle-switch">
            <input
              v-model="localSkipWebpIfNotMuchSmaller"
              type="checkbox"
              @change="updateSkipWebpIfNotMuchSmaller"
            />
            <span class="toggle-slider"></span>
          </label>
        </label>
        <div v-if="localSkipWebpIfNotMuchSmaller" class="threshold-input-wrapper">
          <label class="threshold-label">
            Поріг різниці (КБ):
            <input
              v-model.number="localWebpSizeDifferenceThreshold"
              type="number"
              min="1"
              step="1"
              class="threshold-input"
              @change="updateWebpSizeDifferenceThreshold"
            />
          </label>
        </div>
        <p class="setting-description">
          Якщо увімкнено, WebP файли не будуть додані до архіву, якщо вони менші за оптимізоване зображення на менше вказаного порогу
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface Props {
  skipLargerWebP: boolean
  skipSmallOptimized: boolean
  minSizeThreshold: number
  skipWebpIfNotMuchSmaller: boolean
  webpSizeDifferenceThreshold: number
}

interface Emits {
  (e: 'update:skipLargerWebP', value: boolean): void
  (e: 'update:skipSmallOptimized', value: boolean): void
  (e: 'update:minSizeThreshold', value: number): void
  (e: 'update:skipWebpIfNotMuchSmaller', value: boolean): void
  (e: 'update:webpSizeDifferenceThreshold', value: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localSkipLargerWebP = ref(props.skipLargerWebP)
const localSkipSmallOptimized = ref(props.skipSmallOptimized)
const localMinSizeThreshold = ref(props.minSizeThreshold)
const localSkipWebpIfNotMuchSmaller = ref(props.skipWebpIfNotMuchSmaller)
const localWebpSizeDifferenceThreshold = ref(props.webpSizeDifferenceThreshold)

const updateSkipLargerWebP = () => {
  emit('update:skipLargerWebP', localSkipLargerWebP.value)
  saveSettings()
}

const updateSkipSmallOptimized = () => {
  emit('update:skipSmallOptimized', localSkipSmallOptimized.value)
  saveSettings()
}

const updateMinSizeThreshold = () => {
  emit('update:minSizeThreshold', localMinSizeThreshold.value)
  saveSettings()
}

const updateSkipWebpIfNotMuchSmaller = () => {
  emit('update:skipWebpIfNotMuchSmaller', localSkipWebpIfNotMuchSmaller.value)
  saveSettings()
}

const updateWebpSizeDifferenceThreshold = () => {
  emit('update:webpSizeDifferenceThreshold', localWebpSizeDifferenceThreshold.value)
  saveSettings()
}

const saveSettings = () => {
  if (import.meta.client) {
    localStorage.setItem('imgConverter_settings', JSON.stringify({
      skipLargerWebP: localSkipLargerWebP.value,
      skipSmallOptimized: localSkipSmallOptimized.value,
      minSizeThreshold: localMinSizeThreshold.value,
      skipWebpIfNotMuchSmaller: localSkipWebpIfNotMuchSmaller.value,
      webpSizeDifferenceThreshold: localWebpSizeDifferenceThreshold.value
    }))
  }
}

const loadSettings = () => {
  if (import.meta.client) {
    const saved = localStorage.getItem('imgConverter_settings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        if (settings.skipLargerWebP !== undefined) {
          localSkipLargerWebP.value = settings.skipLargerWebP
          emit('update:skipLargerWebP', settings.skipLargerWebP)
        }
        if (settings.skipSmallOptimized !== undefined) {
          localSkipSmallOptimized.value = settings.skipSmallOptimized
          emit('update:skipSmallOptimized', settings.skipSmallOptimized)
        }
        if (settings.minSizeThreshold !== undefined) {
          localMinSizeThreshold.value = settings.minSizeThreshold
          emit('update:minSizeThreshold', settings.minSizeThreshold)
        }
        if (settings.skipWebpIfNotMuchSmaller !== undefined) {
          localSkipWebpIfNotMuchSmaller.value = settings.skipWebpIfNotMuchSmaller
          emit('update:skipWebpIfNotMuchSmaller', settings.skipWebpIfNotMuchSmaller)
        }
        if (settings.webpSizeDifferenceThreshold !== undefined) {
          localWebpSizeDifferenceThreshold.value = settings.webpSizeDifferenceThreshold
          emit('update:webpSizeDifferenceThreshold', settings.webpSizeDifferenceThreshold)
        }
      } catch (e) {
        console.error('Помилка завантаження налаштувань:', e)
      }
    }
  }
}

watch(() => props.skipLargerWebP, (newVal) => {
  localSkipLargerWebP.value = newVal
})

watch(() => props.skipSmallOptimized, (newVal) => {
  localSkipSmallOptimized.value = newVal
})

watch(() => props.minSizeThreshold, (newVal) => {
  localMinSizeThreshold.value = newVal
})

watch(() => props.skipWebpIfNotMuchSmaller, (newVal) => {
  localSkipWebpIfNotMuchSmaller.value = newVal
})

watch(() => props.webpSizeDifferenceThreshold, (newVal) => {
  localWebpSizeDifferenceThreshold.value = newVal
})

onMounted(() => {
  loadSettings()
})
</script>

<style scoped lang="scss">
.settings-panel {
  background: $background-secondary;
  border-radius: $border-radius;
  padding: 2rem;
  box-shadow: $shadow;
}

.settings-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 1.5rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.setting-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  color: $text-primary;
  font-size: 1rem;
}

.setting-value {
  color: $primary-color;
  font-weight: 600;
}

.slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: $border-color;
  outline: none;
  -webkit-appearance: none;
  appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    -moz-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: $primary-color;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 4px rgba($primary-color, 0.2);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: $primary-color;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  &::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 4px rgba($primary-color, 0.2);
  }
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: $text-secondary;
}

.toggle-label {
  cursor: pointer;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: $border-color;
  transition: 0.3s;
  border-radius: 26px;

  &:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
}

.toggle-switch input:checked + .toggle-slider {
  background-color: $primary-color;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.setting-description {
  font-size: 0.875rem;
  color: $text-secondary;
  margin-top: 0.5rem;
  line-height: 1.4;
}

.threshold-input-wrapper {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba($primary-color, 0.05);
  border-radius: $border-radius;
}

.threshold-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  color: $text-primary;
  font-size: 0.95rem;
}

.threshold-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid $border-color;
  border-radius: $border-radius;
  background: $background-secondary;
  color: $text-primary;
  font-size: 1rem;
  width: 100px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: $primary-color;
    box-shadow: 0 0 0 3px rgba($primary-color, 0.1);
  }
}

</style>

