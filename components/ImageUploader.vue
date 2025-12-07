<template>
  <div 
    class="uploader"
    :class="{ 'is-dragging': isDragging, 'is-processing': isProcessing }"
    @drop="handleDrop"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @click="triggerFileInput"
  >
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/png,image/jpeg,image/jpg"
      class="file-input"
      @change="handleFileSelect"
    />
    
    <div class="uploader-content">
      <div class="upload-icon">📤</div>
      <h3 class="upload-title">
        {{ isDragging ? 'Відпустіть файли тут' : 'Перетягніть файли або натисніть для вибору' }}
      </h3>
      <p class="upload-subtitle">
        Підтримуються формати: PNG, JPG
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFileHandler } from '~/composables/useFileHandler'

const props = defineProps({
  isProcessing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['filesSelected'])

const fileInputRef = ref(null)
const isDragging = ref(false)

const { validateFiles } = useFileHandler()

const triggerFileInput = () => {
  if (!props.isProcessing) {
    fileInputRef.value?.click()
  }
}

const handleFileSelect = (event) => {
  const target = event.target
  const selectedFiles = Array.from(target.files || [])
  processFiles(selectedFiles)
}

const handleDragOver = (event) => {
  if (!props.isProcessing) {
    event.preventDefault()
    isDragging.value = true
  }
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false

  if (props.isProcessing) return

  const droppedFiles = Array.from(event.dataTransfer?.files || [])
  processFiles(droppedFiles)
}

const processFiles = (files) => {
  const validFiles = validateFiles(files)
  
  if (validFiles.length === 0) {
    alert('Будь ласка, виберіть файли формату PNG або JPG')
    return
  }

  if (validFiles.length !== files.length) {
    alert('Деякі файли були пропущені. Підтримуються лише PNG та JPG формати.')
  }

  emit('filesSelected', validFiles)
  
  // Очистити input для можливості повторного вибору тих самих файлів
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}
</script>

<style scoped lang="scss">
.uploader {
  border: 3px dashed $border-color;
  border-radius: $border-radius;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: $background-secondary;

  &:hover:not(.is-processing) {
    border-color: $primary-color;
    background: rgba($primary-color, 0.05);
  }

  &.is-dragging {
    border-color: $primary-color;
    background: rgba($primary-color, 0.1);
    transform: scale(1.02);
  }

  &.is-processing {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.file-input {
  display: none;
}

.uploader-content {
  pointer-events: none;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.upload-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 0.5rem;
}

.upload-subtitle {
  font-size: 1rem;
  color: $text-secondary;
}
</style>

