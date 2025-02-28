import * as punycode from 'punycode'

/**
 * Преобразует URL в правильный формат, включая кириллические домены
 * @param url URL для преобразования
 * @returns Преобразованный URL
 */
const normalizeUrl = (url: string): string => {
  try {
    // Удаляем пробелы
    const trimmedUrl = url.trim()

    // Если URL уже содержит протокол, используем его как есть
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl
    }

    // Проверяем, является ли домен кириллическим
    const isCyrillic = /[а-яё]/i.test(trimmedUrl)

    if (isCyrillic) {
      // Для кириллических доменов используем punycode
      const urlWithProtocol = `http://${trimmedUrl}`
      const urlObject = new URL(urlWithProtocol)
      // Преобразуем домен в punycode
      urlObject.hostname = urlObject.hostname
        .split('.')
        .map(part => {
          try {
            return /[а-яё]/i.test(part) ? 'xn--' + punycode.encode(part) : part
          } catch {
            return part
          }
        })
        .join('.')
      return urlObject.href
    }

    // Для обычных доменов просто добавляем протокол
    return `http://${trimmedUrl}`
  } catch (error) {
    // Если не удалось разобрать URL, возвращаем исходный с протоколом
    return `http://${url}`
  }
}

/**
 * Задержка выполнения на указанное количество миллисекунд
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Получает HTML-контент страницы по указанному URL с поддержкой повторных попыток
 * @param url URL страницы
 * @param options Опции запроса
 * @returns HTML-контент страницы
 */
export async function fetchHtml(
  url: string,
  options?: {
    timeout?: number
    retries?: number
    retryDelay?: number
    headers?: Record<string, string>
  }
): Promise<string> {
  const normalizedUrl = normalizeUrl(url)
  const maxRetries = options?.retries ?? 3
  const retryDelay = options?.retryDelay ?? 1000
  const timeout = options?.timeout ?? 10000

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      if (attempt > 0) {
        // Ждем перед повторной попыткой
        await delay(retryDelay * attempt)
      }

      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WPMenuScanner/1.0; +https://example.com/bot)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
          ...options?.headers,
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('text/html')) {
        throw new Error('Response is not HTML')
      }

      const html = await response.text()
      return html
    } catch (error) {
      lastError = error as Error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Попытка ${attempt + 1}/${maxRetries} для ${url} превысила таймаут ${timeout}ms`)
      } else {
        console.error(`Ошибка при попытке ${attempt + 1}/${maxRetries} для ${url}:`, error)
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw lastError || new Error(`Не удалось получить HTML после ${maxRetries} попыток`)
} 