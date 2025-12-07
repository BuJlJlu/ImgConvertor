<template>
  <div class="progress-container">
    <div class="progress-header">
      <h3 class="progress-title">Обробка файлів...</h3>
      <span class="progress-percentage">{{ progress }}%</span>
    </div>
    <div class="progress-bar-wrapper">
      <div 
        class="progress-bar"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
    <p v-if="currentFile" class="progress-file">
      {{ currentFile }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  progress: number
  currentFile?: string
}

withDefaults(defineProps<Props>(), {
  progress: 0,
  currentFile: ''
})
</script>

<style scoped lang="scss">
.progress-container {
  background: $background-secondary;
  border-radius: $border-radius;
  padding: 2rem;
  box-shadow: $shadow;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: $text-primary;
}

.progress-percentage {
  font-size: 1.2rem;
  font-weight: 700;
  color: $primary-color;
}

.progress-bar-wrapper {
  width: 100%;
  height: 12px;
  background: $border-color;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, $primary-color, lighten($primary-color, 10%));
  border-radius: 6px;
  transition: width 0.3s ease;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.progress-file {
  font-size: 0.875rem;
  color: $text-secondary;
  text-align: center;
  word-break: break-word;
}
</style>

