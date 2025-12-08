import imageCompression from 'browser-image-compression'

export const useImageProcessor = () => {

  // Допоміжна функція: визначення кількості унікальних кольорів у зображенні
  const detectColorCount = (imageData) => {
    const colors = new Set()
    
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i]
      const g = imageData[i + 1]
      const b = imageData[i + 2]
      const a = imageData[i + 3]
      colors.add(`${r},${g},${b},${a}`)
    }
    
    return colors.size
  }

  // Допоміжна функція: перевірка чи зображення має прозорість
  const hasTransparency = (imageData) => {
    for (let i = 3; i < imageData.length; i += 4) {
      if (imageData[i] < 255) {
        return true
      }
    }
    return false
  }

  // Допоміжна функція: перевірка чи зображення має плавні переходи (для дітерінгу)
  const hasGradients = (imageData, width, height) => {
    let gradientCount = 0
    const threshold = 10 // Поріг для визначення плавного переходу
    
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        const idxRight = (y * width + (x + 1)) * 4
        const idxDown = ((y + 1) * width + x) * 4
        
        // Перевіряємо горизонтальний та вертикальний переходи
        const diffRight = Math.abs(imageData[idx] - imageData[idxRight]) +
                         Math.abs(imageData[idx + 1] - imageData[idxRight + 1]) +
                         Math.abs(imageData[idx + 2] - imageData[idxRight + 2])
        const diffDown = Math.abs(imageData[idx] - imageData[idxDown]) +
                         Math.abs(imageData[idx + 1] - imageData[idxDown + 1]) +
                         Math.abs(imageData[idx + 2] - imageData[idxDown + 2])
        
        if (diffRight < threshold || diffDown < threshold) {
          gradientCount++
        }
      }
    }
    
    // Якщо більше 5% пікселів мають плавні переходи - використовуємо дітерінг
    return gradientCount > (width * height * 0.05)
  }

  // Допоміжна функція для отримання розмірів зображення з blob
  const getImageDimensions = (blob) => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(blob)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.width, height: img.height })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      
      img.src = url
    })
  }

  // Допоміжна функція: застосування browser-image-compression для додаткової оптимізації
  const applyImageCompression = async (
    blob,
    originalSize,
    targetReduction = 0.7,
    width = null,
    height = null,
    maxSizeMBMultiplier = 1.0
  ) => {
    try {
      const targetSizeMB = (originalSize / 1024 / 1024) * (1 - targetReduction) * maxSizeMBMultiplier
      const file = new File([blob], 'temp.png', { type: 'image/png' })
      
      const compressionOptions = {
        maxSizeMB: targetSizeMB,
        useWebWorker: true,
        fileType: 'image/png',
        initialQuality: 0.8
      }
      
      // Додаємо maxWidthOrHeight для запобігання зміни розмірів
      if (width !== null && height !== null) {
        compressionOptions.maxWidthOrHeight = Math.max(width, height)
      }
      
      const compressed = await imageCompression(file, compressionOptions)
      
      // Перевіряємо, чи змінилися розміри
      let dimensionsChanged = false
      if (width !== null && height !== null) {
        const compressedDims = await getImageDimensions(compressed)
        if (compressedDims) {
          dimensionsChanged = compressedDims.width !== width || compressedDims.height !== height
        }
      }
      
      if (compressed.size < blob.size) {
        console.log(`Додаткова оптимізація: ${blob.size} -> ${compressed.size} байт (${((1 - compressed.size / blob.size) * 100).toFixed(1)}% додаткової економії)`)
        return { blob: compressed, dimensionsChanged }
      }
      
      return { blob, dimensionsChanged }
    } catch (error) {
      console.warn('Додаткова оптимізація через browser-image-compression не вдалася:', error)
      return { blob, dimensionsChanged: false }
    }
  }

  // Функція квантування кольору з дітерінгом (TinyPNG-подібний підхід)
  const quantizeImage = async (
    imageData,
    width,
    height,
    numColors,
    hasAlpha,
    optimizationLevel
  ) => {
    try {
      console.log(`Початок квантування: ${width}x${height}, ${numColors} кольорів, alpha=${hasAlpha}`)
      
      // Імпортуємо image-q з правильним синтаксисом для v4
      // У image-q v4 використовуються іменовані експорти
      const imageQModule = await import('image-q')
      
      // Для image-q v4 структура може бути різною, спробуємо різні варіанти
      // Спочатку перевіряємо default експорт, потім іменовані
      let imageQ = imageQModule
      
      // Якщо є default експорт, використовуємо його
      if (imageQModule.default) {
        imageQ = imageQModule.default
      }
      
      // Отримуємо необхідні класи та функції
      // У image-q v4 PointContainer знаходиться в utils
      // Спочатку перевіряємо utils в модулі
      const utils = imageQModule.utils || imageQ.utils
      let PointContainer = utils?.PointContainer || 
                                imageQ.PointContainer ||
                                imageQModule.PointContainer
      
      // У v4 може бути buildPalette замість buildPaletteSync
      let buildPaletteSync = imageQ.buildPaletteSync || 
                                  imageQ.buildPalette ||
                                  imageQModule.buildPaletteSync ||
                                  imageQModule.buildPalette
      
      // У v4 може бути applyPalette замість applyPaletteSync
      let applyPaletteSync = imageQ.applyPaletteSync || 
                                  imageQ.applyPalette ||
                                  imageQModule.applyPaletteSync ||
                                  imageQModule.applyPalette
      
      // Якщо функції асинхронні, створюємо синхронні обгортки
      if (buildPaletteSync && typeof buildPaletteSync === 'function' && buildPaletteSync.constructor.name === 'AsyncFunction') {
        const asyncBuild = buildPaletteSync
        buildPaletteSync = (...args) => {
          // Для синхронного використання спробуємо викликати без await
          try {
            return asyncBuild(...args)
          } catch (e) {
            // Якщо не спрацювало, повертаємо Promise
            return Promise.resolve(asyncBuild(...args))
          }
        }
      }
      
      if (applyPaletteSync && typeof applyPaletteSync === 'function' && applyPaletteSync.constructor.name === 'AsyncFunction') {
        const asyncApply = applyPaletteSync
        applyPaletteSync = (...args) => {
          try {
            return asyncApply(...args)
          } catch (e) {
            return Promise.resolve(asyncApply(...args))
          }
        }
      }
      
      // Перевіряємо наявність необхідних функцій
      if (!PointContainer) {
        console.error('PointContainer не знайдено. Доступні властивості image-q:', Object.keys(imageQ))
        console.error('Повний об\'єкт image-q:', imageQ)
        throw new Error('Не вдалося завантажити PointContainer з image-q. Перевірте версію бібліотеки.')
      }
      
      if (typeof PointContainer.fromUint8Array !== 'function') {
        console.error('PointContainer.fromUint8Array не знайдено. Доступні методи PointContainer:', Object.getOwnPropertyNames(PointContainer))
        console.error('PointContainer прототип:', Object.getOwnPropertyNames(Object.getPrototypeOf(PointContainer)))
        throw new Error('PointContainer не містить метод fromUint8Array')
      }
      
      if (!buildPaletteSync || !applyPaletteSync) {
        console.error('buildPaletteSync або applyPaletteSync не знайдено. Доступні функції:', Object.keys(imageQ).filter(k => k.includes('Palette')))
        throw new Error('Не вдалося завантажити buildPaletteSync або applyPaletteSync з image-q')
      }
      
      // Переконуємося, що дані правильного розміру
      if (imageData.length !== width * height * 4) {
        throw new Error(`Неправильний розмір даних для квантування: очікувалось ${width * height * 4}, отримано ${imageData.length}`)
      }
      
      // Створюємо PointContainer з ImageData
      const pointContainer = PointContainer.fromUint8Array(imageData, width, height)
      
      // Перевіряємо, чи pointContainer має метод getPointArray
      if (!pointContainer || typeof pointContainer.getPointArray !== 'function') {
        console.error('pointContainer не має методу getPointArray. Доступні методи:', Object.getOwnPropertyNames(pointContainer))
        throw new Error('PointContainer не містить метод getPointArray')
      }
      
      console.log(`PointContainer створено: ${pointContainer.getPointArray().length} точок`)
      
      // Визначаємо чи потрібен дітерінг
      const needsDithering = hasGradients(imageData, width, height) && optimizationLevel < 80
      console.log(`Дітерінг потрібен: ${needsDithering}`)
      
      // Визначаємо алгоритм квантування палітри
      // Для агресивної оптимізації (70%+) використовуємо wuquant (найефективніший)
      let paletteQuantization = 'wuquant'
      if (optimizationLevel >= 70) {
        paletteQuantization = 'wuquant' // Найефективніший для агресивної оптимізації
      } else if (optimizationLevel >= 50) {
        paletteQuantization = 'rgbquant'
      } else if (optimizationLevel <= 33) {
        paletteQuantization = 'wuquant'
      } else {
        paletteQuantization = 'neuquant'
      }
      
      console.log(`Алгоритм квантування: ${paletteQuantization}`)
      
      // Будуємо палітру
      // Перевіряємо, чи функція синхронна або асинхронна
      let palette
      if (buildPaletteSync && typeof buildPaletteSync === 'function') {
        try {
          // Спробуємо синхронний виклик
          palette = buildPaletteSync([pointContainer], {
            colors: numColors,
            paletteQuantization,
            colorDistanceFormula: hasAlpha ? 'euclidean-bt709' : 'euclidean-bt709-noalpha'
          })
          // Якщо повернуто Promise, чекаємо
          if (palette && typeof palette.then === 'function') {
            palette = await palette
          }
        } catch (e) {
          // Якщо синхронний виклик не спрацював, спробуємо асинхронний
          if (e && e.message && e.message.includes('await')) {
            palette = await buildPaletteSync([pointContainer], {
              colors: numColors,
              paletteQuantization,
              colorDistanceFormula: hasAlpha ? 'euclidean-bt709' : 'euclidean-bt709-noalpha'
            })
          } else {
            throw e
          }
        }
      } else {
        throw new Error('buildPaletteSync не є функцією')
      }
      
      // У image-q v4 структура Palette змінилася - використовуємо _pointArray замість getPointArray()
      if (!palette) {
        throw new Error('Palette не створено')
      }
      
      // Отримуємо точки палітри - в v4 це _pointArray або _pointContainer
      // _pointArray може бути масивом точок або _pointContainer може містити точки
      let palettePoints = null
      
      // Спробуємо отримати через _pointArray
      if (palette._pointArray && Array.isArray(palette._pointArray)) {
        palettePoints = palette._pointArray
      }
      // Якщо не спрацювало, спробуємо через _pointContainer
      else if (palette._pointContainer) {
        const pointContainer = palette._pointContainer
        if (typeof pointContainer.getPointArray === 'function') {
          palettePoints = pointContainer.getPointArray()
        } else if (pointContainer._pointArray && Array.isArray(pointContainer._pointArray)) {
          palettePoints = pointContainer._pointArray
        }
      }
      // Якщо є метод getPointArray (для зворотної сумісності)
      else if (typeof palette.getPointArray === 'function') {
        palettePoints = palette.getPointArray()
      }
      
      if (!palettePoints || !Array.isArray(palettePoints)) {
        console.error('Не вдалося отримати точки палітри. Доступні властивості:', Object.getOwnPropertyNames(palette))
        console.error('palette об\'єкт:', palette)
        console.error('palette._pointArray:', palette._pointArray)
        console.error('palette._pointContainer:', palette._pointContainer)
        throw new Error('Не вдалося отримати точки палітри')
      }
      
      console.log(`Палітра побудована: ${palettePoints.length} кольорів`)
      
      // Визначаємо алгоритм дітерінгу
      const imageQuantization = needsDithering 
        ? 'floyd-steinberg' 
        : 'nearest'
      
      console.log(`Алгоритм дітерінгу: ${imageQuantization}`)
      
      // Застосовуємо палітру з дітерінгом
      let quantizedPointContainer
      if (applyPaletteSync && typeof applyPaletteSync === 'function') {
        try {
          // Спробуємо синхронний виклик
          quantizedPointContainer = applyPaletteSync(pointContainer, palette, {
            imageQuantization,
            colorDistanceFormula: hasAlpha ? 'euclidean-bt709' : 'euclidean-bt709-noalpha'
          })
          // Якщо повернуто Promise, чекаємо
          if (quantizedPointContainer && typeof quantizedPointContainer.then === 'function') {
            quantizedPointContainer = await quantizedPointContainer
          }
        } catch (e) {
          // Якщо синхронний виклик не спрацював, спробуємо асинхронний
          if (e && e.message && e.message.includes('await')) {
            quantizedPointContainer = await applyPaletteSync(pointContainer, palette, {
              imageQuantization,
              colorDistanceFormula: hasAlpha ? 'euclidean-bt709' : 'euclidean-bt709-noalpha'
            })
          } else {
            throw e
          }
        }
      } else {
        throw new Error('applyPaletteSync не є функцією')
      }
      
      // Конвертуємо назад в Uint8Array
      const quantizedData = quantizedPointContainer.toUint8Array()
      console.log(`Квантування завершено: ${quantizedData.length} байт`)
      
      // Створюємо палітру для UPNG
      // Використовуємо вже отримані palettePoints з попереднього кроку
      const paletteArray = []
      
      for (const point of palettePoints) {
        if (!point || typeof point.r === 'undefined' || typeof point.g === 'undefined' || typeof point.b === 'undefined') {
          console.error('Невірний формат точки палітри:', point)
          continue
        }
        paletteArray.push([point.r, point.g, point.b, hasAlpha ? (point.a !== undefined ? point.a : 255) : 255])
      }
      
      return { quantizedData, palette: paletteArray }
    } catch (error) {
      console.error('Помилка в quantizeImage:', error)
      throw error
    }
  }

  // Допоміжна функція: видалення метаданих з PNG
  const stripMetadata = (png) => {
    // UPNG.js автоматично видаляє більшість метаданих при декодуванні
    // Але ми можемо переконатися, що не зберігаємо зайві чанки
    // Повертаємо очищений об'єкт PNG
    if (!png) {
      return null
    }
    
    // Якщо є frames, обробляємо їх
    if (png.frames && Array.isArray(png.frames) && png.frames.length > 0) {
      return {
        width: png.width,
        height: png.height,
        frames: png.frames.map((frame) => ({
          rect: frame.rect,
          delay: frame.delay,
          dispose: frame.dispose,
          blend: frame.blend,
          data: frame.data
        }))
      }
    }
    
    // Якщо frames немає, повертаємо базову структуру
    return {
      width: png.width,
      height: png.height,
      frames: []
    }
  }

  // Допоміжна функція: оптимізація палітри (сортування за частотою)
  const optimizePalette = (palette, imageData, width, height) => {
    // Підраховуємо частоту використання кожного кольору
    const colorFrequency = new Map()
    
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i]
      const g = imageData[i + 1]
      const b = imageData[i + 2]
      const a = imageData[i + 3]
      const colorKey = `${r},${g},${b},${a}`
      colorFrequency.set(colorKey, (colorFrequency.get(colorKey) || 0) + 1)
    }

    // Створюємо мапу кольорів палітри
    const paletteMap = new Map()
    palette.forEach((color, index) => {
      const key = `${color[0]},${color[1]},${color[2]},${color[3]}`
      paletteMap.set(key, index)
    })

    // Сортуємо палітру за частотою використання (найчастіші спочатку)
    const sortedPalette = [...palette].sort((a, b) => {
      const keyA = `${a[0]},${a[1]},${a[2]},${a[3]}`
      const keyB = `${b[0]},${b[1]},${b[2]},${b[3]}`
      const freqA = colorFrequency.get(keyA) || 0
      const freqB = colorFrequency.get(keyB) || 0
      return freqB - freqA // Сортуємо за спаданням
    })

    return sortedPalette
  }

  // Допоміжна функція: пошук найкращого PNG фільтру
  const findBestFilter = async (
    quantizedData,
    width,
    height,
    numColors,
    palette,
    originalSize
  ) => {
    const UPNGModule = await import('upng-js')
    const UPNG = (UPNGModule.default || UPNGModule)
    const filters = [0, 1, 2, 3, 4] // None, Sub, Up, Average, Paeth
    let bestBlob = null
    let bestSize = Infinity
    let bestFilter = 0

    // Переконуємося, що quantizedData має правильний розмір
    if (quantizedData.length !== width * height * 4) {
      console.error(`Неправильний розмір quantizedData: очікувалось ${width * height * 4}, отримано ${quantizedData.length}`)
      throw new Error(`Неправильний розмір даних для кодування: ${quantizedData.length} байт для ${width}x${height}`)
    }

    // Створюємо Canvas для конвертації квантованих даних
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Не вдалося отримати контекст Canvas')
    }

    // Створюємо ImageData з квантованих даних
    const imageData = ctx.createImageData(width, height)
    // Переконуємося, що дані правильно скопійовані
    if (quantizedData instanceof Uint8ClampedArray) {
      imageData.data.set(quantizedData)
    } else {
      imageData.data.set(new Uint8ClampedArray(quantizedData))
    }
    ctx.putImageData(imageData, 0, 0)

    // Отримуємо дані з Canvas у форматі для UPNG
    // UPNG.encode очікує масив кадрів, де кожен кадр - це Uint8Array або масив чисел
    const imageDataFromCanvas = ctx.getImageData(0, 0, width, height)
    const data = imageDataFromCanvas.data
    
    // UPNG може працювати з Uint8Array напряму, але також приймає масив чисел
    // Конвертуємо в масив чисел для сумісності
    const rgbaArray = Array.from(data)
    
    // Перевіряємо, що rgbaArray має правильний розмір
    if (rgbaArray.length !== width * height * 4) {
      console.error(`Неправильний розмір rgbaArray: очікувалось ${width * height * 4}, отримано ${rgbaArray.length}`)
      throw new Error(`Неправильний розмір rgbaArray для кодування`)
    }
    
    console.log(`Підготовка до кодування: ${width}x${height}, ${rgbaArray.length} значень, палітра: ${palette ? palette.length : 0} кольорів`)
    
    // Додаткова перевірка: переконуємося, що дані не всі нулі
    const nonZeroCount = rgbaArray.filter(v => v !== 0).length
    if (nonZeroCount === 0) {
      console.error('Всі значення в rgbaArray дорівнюють нулю!')
      throw new Error('Дані для кодування порожні')
    }
    console.log(`Перевірка даних: ${nonZeroCount} ненульових значень з ${rgbaArray.length}`)

    for (const filter of filters) {
      try {
        let encoded
        
        if (numColors > 0 && palette && palette.length > 0) {
          // Використовуємо палітру
          // Конвертуємо палітру в формат для UPNG (плоский масив RGBA)
          const flatPalette = []
          palette.forEach(color => {
            if (color && color.length >= 4) {
              flatPalette.push(color[0], color[1], color[2], color[3])
            }
          })
          
          // Перевіряємо, що палітра не пуста
          if (flatPalette.length === 0) {
            console.warn(`Палітра пуста для фільтру ${filter}, пропускаємо`)
            continue
          }
          
          // Перевіряємо, що кількість кольорів не перевищує 256
          const actualNumColors = Math.min(numColors, palette.length, 256)
          
          // UPNG.encode(imgs, w, h, cnum, dels, filter, plte)
          // imgs - масив кадрів, кожен кадр - це масив чисел [r, g, b, a, r, g, b, a, ...]
          // cnum - кількість кольорів у палітрі (1-256)
          // plte - палітра як плоский масив [r, g, b, a, r, g, b, a, ...] або undefined
          try {
            // Спробуємо різні варіанти виклику UPNG.encode
            // Варіант 1: з палітрою як останній параметр
            encoded = UPNG.encode(
              [rgbaArray],
              width,
              height,
              actualNumColors,
              [0], // dels: затримки для анімації (0 для статичних)
              filter,
              flatPalette.length > 0 ? flatPalette : undefined // plte: палітра
            )
            
            // Якщо результат пустий, спробуємо без палітри (можливо, UPNG не підтримує палітру в цьому форматі)
            if (!encoded || encoded.length === 0) {
              console.log(`Спроба кодування без палітри для фільтру ${filter}`)
              encoded = UPNG.encode(
                [rgbaArray],
                width,
                height,
                0, // Без палітри
                [0],
                filter
              )
            }
          } catch (encodeError) {
            console.warn(`Помилка кодування з фільтром ${filter}:`, encodeError?.message || encodeError)
            // Спробуємо без палітри як fallback
            try {
              encoded = UPNG.encode(
                [rgbaArray],
                width,
                height,
                0,
                [0],
                filter
              )
            } catch (e) {
              continue
            }
          }
        } else {
          // Використовуємо RGB режим (без палітри)
          // cnum: 0 = RGB без палітри
          try {
            encoded = UPNG.encode(
              [rgbaArray],
              width,
              height,
              0, // cnum: 0 = RGB (без палітри)
              [0], // dels: затримки
              filter // filter
            )
          } catch (encodeError) {
            console.warn(`Помилка кодування RGB з фільтром ${filter}:`, encodeError)
            continue
          }
        }
        
        // Перевіряємо, що encoded не пустий
        if (!encoded || encoded.length === 0) {
          console.warn(`Кодування з фільтром ${filter} повернуло пустий масив`)
          continue
        }
        
        const blob = new Blob([encoded], { type: 'image/png' })
        
        // Перевіряємо, що blob не пустий
        if (blob.size === 0) {
          console.warn(`Blob для фільтру ${filter} має розмір 0`)
          continue
        }
        
        if (blob.size < bestSize) {
          bestSize = blob.size
          bestBlob = blob
          bestFilter = filter
        }
      } catch (e) {
        // Продовжуємо з наступним фільтром
        console.warn(`Помилка при тестуванні фільтру ${filter}:`, e)
      }
    }

    if (bestBlob && bestBlob.size > 0) {
      console.log(`Найкращий фільтр: ${bestFilter}, розмір: ${bestSize} байт, розміри: ${width}x${height}`)
      return bestBlob
    }

    // Fallback: якщо всі фільтри не спрацювали, використовуємо Canvas для створення PNG
    console.warn('Не вдалося знайти найкращий фільтр через UPNG, використовуємо Canvas fallback')
    
    // Створюємо Canvas з квантованими даними
    const fallbackCanvas = document.createElement('canvas')
    fallbackCanvas.width = width
    fallbackCanvas.height = height
    const fallbackCtx = fallbackCanvas.getContext('2d')
    
    if (!fallbackCtx) {
      throw new Error('Не вдалося отримати контекст Canvas для fallback')
    }
    
    // Створюємо ImageData з квантованих даних
    const fallbackImageData = fallbackCtx.createImageData(width, height)
    fallbackImageData.data.set(quantizedData)
    fallbackCtx.putImageData(fallbackImageData, 0, 0)
    
    // Конвертуємо Canvas в Blob
    const canvasBlob = await new Promise((resolve, reject) => {
      fallbackCanvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          console.log(`Canvas fallback blob створено: ${blob.size} байт, розміри: ${width}x${height}`)
          resolve(blob)
        } else {
          reject(new Error('Canvas fallback не вдався - створений Blob має розмір 0'))
        }
      }, 'image/png', 1.0) // PNG завжди використовує максимальну якість
    })
    
    // Застосовуємо додаткову оптимізацію через browser-image-compression
    // Використовуємо originalSize якщо передано, інакше використовуємо розмір canvasBlob
    const targetSize = originalSize || canvasBlob.size
    try {
      // Зберігаємо blob до оптимізації на випадок, якщо розміри зміняться
      const blobBeforeCompression = canvasBlob
      let compressionResult = await applyImageCompression(canvasBlob, targetSize, 0.7, width, height)
      let optimizedBlob = compressionResult.blob
      
      // Якщо розміри змінилися, повторюємо оптимізацію з більшим maxSizeMB
      if (compressionResult.dimensionsChanged) {
        console.warn('Розміри зображення змінилися після оптимізації в findBestFilter, повторюємо з більшим maxSizeMB')
        // Збільшуємо maxSizeMB в 2.5 рази для повторної спроби
        compressionResult = await applyImageCompression(blobBeforeCompression, targetSize, 0.7, width, height, 2.5)
        optimizedBlob = compressionResult.blob
        
        // Перевіряємо розміри після повторної оптимізації
        if (compressionResult.dimensionsChanged) {
          console.warn('Розміри все ще змінені після повторної оптимізації в findBestFilter, використовуємо blob до оптимізації')
          // Використовуємо blob до оптимізації, щоб зберегти оригінальні розміри
          optimizedBlob = blobBeforeCompression
        }
      }
      
      return optimizedBlob
    } catch (error) {
      console.warn('Додаткова оптимізація Canvas fallback не вдалася:', error)
      return canvasBlob
    }
  }

  const optimizeImage = async (
    file,
    optimizationLevel
  ) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.onload = () => {
          resolve(img)
        }
        img.onerror = () => {
          reject(new Error('Помилка завантаження зображення'))
        }
        img.src = e.target?.result
      }

      reader.onerror = () => {
        reject(new Error('Помилка читання файлу'))
      }

      reader.readAsDataURL(file)
    })
  }

  const optimizeOriginal = async (
    img,
    originalType,
    optimizationLevel,
    originalSize,
    originalFile
  ) => {
    const isPng = originalType.includes('png') || originalType.includes('PNG')
    
    if (isPng) {
      try {
        console.log(`Оптимізація PNG (TinyPNG-подібний підхід), рівень: ${optimizationLevel}%`)
        
        const UPNGModule = await import('upng-js')
        const UPNG = (UPNGModule.default || UPNGModule)
        const arrayBuffer = await originalFile.arrayBuffer()
        const png = UPNG.decode(arrayBuffer)
        
        // Перевіряємо, чи PNG декодовано правильно
        if (!png || !png.width || !png.height) {
          throw new Error('Не вдалося декодувати PNG файл')
        }
        
        const width = png.width
        const height = png.height
        
        // Видаляємо метадані
        const cleanedPng = stripMetadata(png)
        
        // Отримуємо дані зображення
        let imageDataArray
        
        // Спробуємо отримати дані з frames, якщо вони є
        if (cleanedPng && cleanedPng.frames && cleanedPng.frames.length > 0 && cleanedPng.frames[0] && cleanedPng.frames[0].data) {
          const frameData = cleanedPng.frames[0].data
          
          // Конвертуємо frameData в Uint8Array
          if (frameData instanceof Uint8Array) {
            imageDataArray = frameData
          } else if (frameData instanceof Uint8ClampedArray) {
            imageDataArray = new Uint8Array(frameData)
          } else if (Array.isArray(frameData)) {
            imageDataArray = new Uint8Array(frameData)
          } else {
            // Якщо формат невідомий, використовуємо Canvas як fallback
            console.log('Невідомий формат даних у frame, використовуємо Canvas')
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              throw new Error('Не вдалося отримати контекст Canvas')
            }
            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, width, height)
            imageDataArray = new Uint8Array(imageData.data)
          }
        } else {
          // Якщо frames немає, використовуємо Canvas для отримання даних
          console.log('PNG не містить frames, використовуємо Canvas для отримання даних')
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            throw new Error('Не вдалося отримати контекст Canvas')
          }
          
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, width, height)
          imageDataArray = new Uint8Array(imageData.data)
        }
        
        
        // Переконуємося, що дані в правильному форматі (RGBA, 4 байти на піксель)
        if (imageDataArray.length !== width * height * 4) {
          console.warn(`Неправильний розмір даних: очікувалось ${width * height * 4}, отримано ${imageDataArray.length}`)
          // Спробуємо використати Canvas для отримання правильних даних
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, width, height)
            imageDataArray = new Uint8Array(imageData.data)
          }
        }
        
        // Аналізуємо зображення
        const uniqueColors = detectColorCount(imageDataArray)
        const hasAlpha = hasTransparency(imageDataArray)
        
        console.log(`Аналіз PNG: унікальних кольорів=${uniqueColors}, має прозорість=${hasAlpha}, розмір даних=${imageDataArray.length}`)
        
        // Визначаємо оптимальну кількість кольорів для палітри
        // Агресивна оптимізація для досягнення 70% зменшення розміру
        let numColors = 256
        
        if (optimizationLevel >= 70) {
          // Для високого рівня оптимізації використовуємо агресивне зменшення кольорів
          if (uniqueColors <= 64) {
            numColors = uniqueColors
          } else if (uniqueColors <= 128) {
            numColors = Math.max(32, Math.min(64, Math.floor(uniqueColors * 0.5)))
          } else {
            numColors = Math.max(64, Math.min(128, Math.floor(uniqueColors * 0.4)))
          }
        } else if (optimizationLevel >= 50) {
          // Для середнього рівня оптимізації
          numColors = Math.max(64, Math.min(128, Math.floor(uniqueColors * 0.6)))
        } else if (optimizationLevel <= 33) {
          numColors = Math.max(32, Math.min(128, Math.ceil(256 * (optimizationLevel / 33))))
        } else {
          numColors = Math.max(128, Math.min(192, Math.ceil(128 + (optimizationLevel - 33) / 33 * 64)))
        }
        
        if (uniqueColors < numColors) {
          numColors = uniqueColors > 0 ? uniqueColors : 256
        }
        
        console.log(`Обрано режим: Палітра (${numColors} кольорів) для ${optimizationLevel}% оптимізації`)
        
        // Виконуємо квантування кольору з дітерінгом
        let quantizedData
        let palette
        
        try {
          const result = await quantizeImage(
            imageDataArray,
            width,
            height,
            numColors,
            hasAlpha,
            optimizationLevel
          )
          quantizedData = result.quantizedData
          palette = result.palette
          console.log(`Квантування завершено. Палітра: ${palette.length} кольорів`)
        } catch (quantizeError) {
          console.error('Помилка квантування:', quantizeError)
          // Якщо квантування не вдалося, використовуємо оригінальні дані
          throw quantizeError
        }
        
        // Оптимізуємо палітру (сортування за частотою)
        const optimizedPalette = optimizePalette(palette, quantizedData, width, height)
        
        // Тестуємо різні PNG фільтри та вибираємо найкращий
        let optimizedBlob = await findBestFilter(
          quantizedData,
          width,
          height,
          optimizedPalette.length,
          optimizedPalette,
          originalSize
        )
        
        // Перевіряємо, що optimizedBlob не пустий
        if (optimizedBlob.size === 0) {
          console.error('Оптимізований файл має розмір 0, повертаємо оригінал')
          return originalFile
        }
        
        // Застосовуємо додаткову оптимізацію через browser-image-compression
        const targetReduction = optimizationLevel / 100
        // Зберігаємо blob до оптимізації на випадок, якщо розміри зміняться
        const blobBeforeCompression = optimizedBlob
        let compressionResult = await applyImageCompression(optimizedBlob, originalSize, targetReduction, width, height)
        optimizedBlob = compressionResult.blob
        
        // Якщо розміри змінилися, повторюємо оптимізацію з більшим maxSizeMB
        if (compressionResult.dimensionsChanged) {
          console.warn('Розміри зображення змінилися після оптимізації, повторюємо з більшим maxSizeMB')
          // Збільшуємо maxSizeMB в 2.5 рази для повторної спроби
          compressionResult = await applyImageCompression(blobBeforeCompression, originalSize, targetReduction, width, height, 2.5)
          optimizedBlob = compressionResult.blob
          
          // Перевіряємо розміри після повторної оптимізації
          if (compressionResult.dimensionsChanged) {
            console.warn('Розміри все ще змінені після повторної оптимізації, використовуємо blob до оптимізації')
            // Використовуємо blob до оптимізації, щоб зберегти оригінальні розміри
            optimizedBlob = blobBeforeCompression
          }
        }
        
        const savings = ((1 - optimizedBlob.size / originalSize) * 100).toFixed(1)
        console.log(`Результат оптимізації: Оригінальний=${originalSize}, Оптимізований=${optimizedBlob.size}, Економія=${savings}%`)
        
        // Перевіряємо, чи досягнуто цільове зменшення
        const achievedReduction = (1 - optimizedBlob.size / originalSize) * 100
        if (achievedReduction >= optimizationLevel * 0.9) {
          console.log(`Досягнуто цільове зменшення: ${achievedReduction.toFixed(1)}% (ціль: ${optimizationLevel}%)`)
        } else {
          console.warn(`Не досягнуто цільового зменшення: ${achievedReduction.toFixed(1)}% (ціль: ${optimizationLevel}%)`)
        }
        
        if (optimizedBlob.size < originalSize) {
          console.log(`Оптимізація успішна: ${originalSize} -> ${optimizedBlob.size} байт (${((1 - optimizedBlob.size / originalSize) * 100).toFixed(1)}% економії)`)
          return optimizedBlob
        }
        
        console.warn(`Оптимізований файл більший за оригінал (${optimizedBlob.size} > ${originalSize}), повертаємо оригінал`)
        return originalFile
        
      } catch (error) {
        console.error('Помилка оптимізації PNG:', error)
        console.error('Деталі помилки:', error instanceof Error ? error.stack : error)
        // У випадку помилки спробуємо створити простий PNG через Canvas
        try {
          console.log('Спроба створити PNG через Canvas fallback...')
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            // Конвертуємо в Blob з правильними розмірами
            return new Promise((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob && blob.size > 0) {
                  console.log(`Canvas fallback створено: ${blob.size} байт, розміри: ${img.width}x${img.height}`)
                  resolve(blob)
                } else {
                  console.warn('Canvas fallback не вдався, повертаємо оригінал')
                  resolve(originalFile)
                }
              }, 'image/png')
            })
          }
        } catch (canvasError) {
          console.error('Помилка Canvas fallback:', canvasError)
        }
        // Якщо все не вдалося, повертаємо оригінал
        return originalFile
      }
    }
    
    // Для JPEG або якщо Squoosh не спрацював - використовуємо canvas
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Не вдалося отримати контекст Canvas'))
        return
      }
      
      // Зберігаємо оригінальний формат
      const outputMimeType = isPng ? 'image/png' : 'image/jpeg'

      // Визначаємо якість залежно від рівня оптимізації (0-100)
      let quality = 1.0
      if (!isPng) {
        // Для JPEG конвертуємо 0-100 в якість 0.3-0.9
        quality = 0.3 + (optimizationLevel / 100) * 0.6
      }

      // Зберігаємо оригінальний розмір зображення
      canvas.width = img.width
      canvas.height = img.height

      // Використовуємо smooth scaling для кращої якості
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0)

      // Функція для спроби оптимізації з певною якістю
      const tryOptimize = (targetQuality, attempt = 0) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Помилка оптимізації оригінального файлу'))
              return
            }

            // Якщо розмір зменшився - використовуємо цей файл
            if (blob.size < originalSize) {
              resolve(blob)
            } else if (!isPng && attempt < 4 && targetQuality > 0.3) {
              // Для JPEG спробуємо з меншою якістю
              tryOptimize(targetQuality - 0.1, attempt + 1)
            } else {
              // Для PNG через canvas завжди отримуємо більший розмір
              if (!isPng) {
                canvas.toBlob(
                  (finalBlob) => {
                    if (finalBlob) {
                      resolve(finalBlob)
                    } else {
                      reject(new Error('Помилка оптимізації оригінального файлу'))
                    }
                  },
                  outputMimeType,
                  0.4
                )
              } else {
                // Для PNG через canvas не можемо оптимізувати
                reject(new Error('PNG не може бути оптимізований через canvas'))
              }
            }
          },
          outputMimeType,
          targetQuality
        )
      }

      tryOptimize(quality)
    })
  }

  const convertToWebP = async (
    img,
    quality
  ) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Не вдалося отримати контекст Canvas'))
        return
      }

      canvas.width = img.width
      canvas.height = img.height

      ctx.drawImage(img, 0, 0)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Помилка конвертації в WebP'))
          }
        },
        'image/webp',
        quality / 100
      )
    })
  }

  const processFile = async (
    file,
    quality,
    optimizationLevel
  ) => {
    // Завантажити зображення
    const img = await optimizeImage(file, optimizationLevel)

    // Зберігаємо розміри оригіналу
    const originalWidth = img.width
    const originalHeight = img.height

    // Створити назви файлів (зберігаємо оригінальну назву)
    const originalName = file.name
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
    const webpName = `${nameWithoutExt}.webp`
    const optimizedName = originalName

    // Оптимізувати оригінальний файл (передаємо file.type, оригінальний розмір та файл)
    let optimizedBlob
    let finalOptimizedBlob
    let finalOptimizedSize
    let optimizedDimensions = { width: originalWidth, height: originalHeight }
    
    try {
      optimizedBlob = await optimizeOriginal(img, file.type || file.name, optimizationLevel, file.size, file)
      
      // Якщо оптимізований файл більший за оригінал - використовуємо оригінал
      if (optimizedBlob.size >= file.size) {
        finalOptimizedBlob = file
        finalOptimizedSize = file.size
        optimizedDimensions = { width: originalWidth, height: originalHeight }
      } else {
        finalOptimizedBlob = optimizedBlob
        finalOptimizedSize = optimizedBlob.size
        // Отримуємо реальні розміри оптимізованого файлу
        const dims = await getImageDimensions(optimizedBlob)
        if (dims) {
          optimizedDimensions = dims
        }
      }
    } catch (error) {
      // Для PNG якщо не вдалося оптимізувати (через canvas завжди більший) - використовуємо оригінал
      finalOptimizedBlob = file
      finalOptimizedSize = file.size
      optimizedDimensions = { width: originalWidth, height: originalHeight }
    }

    // Конвертувати в WebP
    const webpBlob = await convertToWebP(img, quality)
    
    // Отримуємо реальні розміри WebP файлу
    let webpDimensions = { width: originalWidth, height: originalHeight }
    const webpDims = await getImageDimensions(webpBlob)
    if (webpDims) {
      webpDimensions = webpDims
    }

    return {
      originalName,
      originalSize: file.size,
      optimizedName,
      optimizedSize: finalOptimizedSize,
      optimizedBlob: finalOptimizedBlob,
      webpName,
      webpSize: webpBlob.size,
      webpBlob,
      width: originalWidth,
      height: originalHeight,
      optimizedWidth: optimizedDimensions.width,
      optimizedHeight: optimizedDimensions.height,
      webpWidth: webpDimensions.width,
      webpHeight: webpDimensions.height
    }
  }

  const processBatch = async (
    files,
    quality,
    optimizationLevel,
    onProgress
  ) => {
    const results = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (onProgress) {
        onProgress(i + 1, files.length, file.name)
      }

      try {
        const processed = await processFile(file, quality, optimizationLevel)
        results.push(processed)
      } catch (error) {
        console.error(`Помилка обробки файлу ${file.name}:`, error)
        // Продовжуємо обробку інших файлів навіть якщо один не вдався
      }
    }

    return results
  }

  return {
    optimizeImage,
    optimizeOriginal,
    convertToWebP,
    processFile,
    processBatch
  }
}


