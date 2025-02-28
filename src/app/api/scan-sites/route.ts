import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ScanSitesRequest, ScanSitesResponse, SiteMenu } from '@/types'
import { fetchHtml } from '@/lib/fetch-html'
import { parseMenu } from '@/lib/parse-menu'

// Функция для проверки URL
const isValidUrl = (url: string) => {
  try {
    // Удаляем пробелы в начале и конце
    const trimmedUrl = url.trim()

    // Удаляем протокол и слеш в конце, если они есть
    const urlWithoutProtocol = trimmedUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    // Базовая проверка структуры домена
    const parts = urlWithoutProtocol.split('.')
    if (parts.length < 2) {
      console.log('Invalid domain parts length:', parts.length)
      return false
    }

    // Проверяем, является ли домен кириллическим
    const isCyrillic = /[а-яё]/i.test(urlWithoutProtocol)

    let isValidDomain = false

    if (isCyrillic) {
      // Проверяем зону (.рф или другие)
      const tld = parts[parts.length - 1].toLowerCase()
      if (!tld.match(/^[а-яё]+$/i)) {
        console.log('Invalid Cyrillic TLD:', tld)
        return false
      }

      // Проверяем остальные части домена
      const domainParts = parts.slice(0, -1)
      isValidDomain = domainParts.every(part => {
        if (part.length === 0) {
          console.log('Empty domain part')
          return false
        }
        
        if (part.startsWith('-') || part.endsWith('-')) {
          console.log('Domain part starts or ends with hyphen:', part)
          return false
        }
        
        return /^[а-яё0-9][а-яё0-9-]*[а-яё0-9]$|^[а-яё0-9]$/i.test(part)
      })
    } else {
      // Для обычных доменов проверяем базовую структуру
      isValidDomain = parts.every(part => {
        if (part.length === 0) return false
        if (part.startsWith('-') || part.endsWith('-')) return false
        return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/i.test(part)
      })
    }

    if (!isValidDomain) {
      console.log('Invalid domain format:', urlWithoutProtocol)
      return false
    }

    // Для всех доменов пробуем создать URL объект
    const urlToTest = `http://${urlWithoutProtocol}`
    new URL(urlToTest)
    return true

  } catch (error) {
    console.error('URL validation error:', error)
    return false
  }
}

// Схема валидации запроса
const requestSchema = z.object({
  urls: z.array(z.string().refine(isValidUrl, {
    message: 'Неверный формат URL. Поддерживаются обычные и кириллические домены (например: example.com, сайт.рф)',
  })),
  options: z.object({
    batchSize: z.number().min(1).max(10).optional().default(3),
    timeout: z.number().min(1000).max(30000).optional().default(10000),
    retries: z.number().min(1).max(5).optional().default(3),
  }).optional().default({}),
}) satisfies z.ZodType<ScanSitesRequest>

// Функция для обработки одного URL с прогрессом
async function processSingleUrl(
  url: string,
  options: {
    timeout: number
    retries: number
  },
  onProgress?: (progress: number) => void
) {
  try {
    const html = await fetchHtml(url, {
      timeout: options.timeout,
      retries: options.retries,
      retryDelay: 1000,
    })
    const menuItems = await parseMenu(html)
    return {
      siteUrl: url,
      items: menuItems,
      scannedAt: new Date(),
      error: null,
    }
  } catch (error) {
    return {
      siteUrl: url,
      items: [],
      scannedAt: new Date(),
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }
  }
}

// Функция для пакетной обработки URL
async function processBatch(
  urls: string[],
  options: {
    batchSize: number
    timeout: number
    retries: number
  }
) {
  const results = []
  const batches = []
  
  // Разбиваем URLs на пакеты
  for (let i = 0; i < urls.length; i += options.batchSize) {
    batches.push(urls.slice(i, i + options.batchSize))
  }

  // Обрабатываем каждый пакет последовательно
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(url => processSingleUrl(url, options))
    )
    results.push(...batchResults)
  }

  return results
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { urls, options } = requestSchema.parse(body)

    const results = await processBatch(urls, {
      batchSize: options.batchSize,
      timeout: options.timeout,
      retries: options.retries,
    })

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: results.length,
      errors: results.filter(r => r.error).length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Ошибка валидации', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Ошибка при сканировании сайтов:', error)
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
} 