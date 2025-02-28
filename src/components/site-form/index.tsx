'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { z } from 'zod'

interface SiteFormProps {
  onSubmit: (urls: string[]) => Promise<void>
  isLoading: boolean
  error?: string
}

const urlSchema = z.string().min(1, 'URL не может быть пустым')

export function SiteForm({ onSubmit, isLoading, error }: SiteFormProps) {
  const [urls, setUrls] = useState('')
  const [progress, setProgress] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Разбиваем введенный текст на отдельные URL
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    if (urlList.length === 0) {
      return
    }

    try {
      // Валидируем каждый URL
      urlList.forEach(url => urlSchema.parse(url))
      
      // Сбрасываем прогресс
      setProgress(0)
      
      // Запускаем сканирование
      await onSubmit(urlList)
    } catch (error) {
      console.error('Ошибка валидации URL:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Введите URL сайтов (по одному на строку)&#10;Например:&#10;example.com&#10;сайт.рф"
        value={urls}
        onChange={e => setUrls(e.target.value)}
        disabled={isLoading}
        className="min-h-[200px] font-mono"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">
            Сканирование сайтов... {Math.round(progress)}%
          </p>
        </div>
      )}

      <Button type="submit" disabled={isLoading || !urls.trim()}>
        {isLoading ? 'Сканирование...' : 'Начать сканирование'}
      </Button>
    </form>
  )
} 