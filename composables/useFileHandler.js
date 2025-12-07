import JSZip from 'jszip'

export const useFileHandler = () => {
  const validateFiles = (files) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    
    return files.filter(file => {
      const isValidType = validTypes.includes(file.type.toLowerCase())
      const isValidExtension = /\.(png|jpg|jpeg)$/i.test(file.name)
      
      return isValidType || isValidExtension
    })
  }

  const createZipArchive = async (results, skipLargerWebP = false, skipSmallOptimized = false, minSizeThreshold = 20, skipWebpIfNotMuchSmaller = false, webpSizeDifferenceThreshold = 10) => {
    const zip = new JSZip()

    for (const result of results) {
      // Додаємо оптимізований оригінальний файл
      zip.file(result.optimizedName, result.optimizedBlob)
      
      let shouldAddWebP = true
      
      // Перевірка 1: Пропускаємо WebP, якщо він більший за оптимізований
      if (skipLargerWebP && result.webpSize > result.optimizedSize) {
        shouldAddWebP = false
      }
      
      // Перевірка 2: Пропускаємо WebP, якщо оптимізоване зображення менше порогу
      if (skipSmallOptimized && shouldAddWebP) {
        const optimizedSizeKB = result.optimizedSize / 1024
        if (optimizedSizeKB < minSizeThreshold) {
          shouldAddWebP = false
        }
      }
      
      // Перевірка 3: Пропускаємо WebP, якщо він менший за оптимізоване на менше порогу
      if (skipWebpIfNotMuchSmaller && shouldAddWebP) {
        const sizeDifference = result.optimizedSize - result.webpSize
        const thresholdBytes = webpSizeDifferenceThreshold * 1024 // Конвертуємо КБ в байти
        if (sizeDifference < thresholdBytes) {
          shouldAddWebP = false
        }
      }
      
      if (shouldAddWebP) {
        zip.file(result.webpName, result.webpBlob)
      }
    }

    return await zip.generateAsync({ type: 'blob' })
  }

  return {
    validateFiles,
    createZipArchive
  }
}


