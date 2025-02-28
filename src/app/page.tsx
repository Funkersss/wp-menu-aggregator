'use client'

import { useState } from 'react'
import { SiteForm } from '@/components/site-form'
import { LinksTable } from '@/components/links-table'
import type { SiteMenu } from '@/types'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [results, setResults] = useState<SiteMenu[]>([])

  const handleScan = async (urls: string[]) => {
    setIsLoading(true)
    setError(undefined)

    try {
      const response = await fetch('/api/scan-sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls,
          options: {
            batchSize: 3, // Обрабатываем по 3 сайта одновременно
            timeout: 15000, // 15 секунд на каждый запрос
            retries: 3, // 3 попытки для каждого сайта
          },
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Произошла ошибка при сканировании')
      }

      setResults(data.results)

      // Если есть ошибки, показываем их количество
      if (data.errors > 0) {
        setError(`Не удалось обработать ${data.errors} из ${data.totalProcessed} сайтов`)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Сканер меню WordPress</h1>
      
      <div className="mb-8">
        <SiteForm 
          onSubmit={handleScan}
          isLoading={isLoading}
          error={error}
        />
      </div>

      {results.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Результаты сканирования</h2>
          <LinksTable data={results} />
        </div>
      )}
    </main>
  )
}
