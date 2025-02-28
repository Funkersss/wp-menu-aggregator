'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Download, ArrowUpDown } from 'lucide-react'
import { stringify } from 'csv-stringify/sync'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { MenuItem } from '@/types'
import { format } from 'date-fns'

interface SiteMenu {
  siteUrl: string
  items: MenuItem[]
  error?: string
  scannedAt: Date
}

interface LinksTableProps {
  data: SiteMenu[]
}

type SortField = 'siteUrl' | 'itemsCount' | 'scannedAt'
type SortOrder = 'asc' | 'desc'
type FilterField = 'siteUrl' | 'pageText' | 'pageUrl'

const ITEMS_PER_PAGE = 10

// Функция для нормализации текста (для сравнения)
const normalizeText = (text: string) => {
  return text.toLowerCase().trim()
}

// Функция для сравнения текстов
const compareTexts = (a: string, b: string) => {
  return normalizeText(a) === normalizeText(b)
}

export function LinksTable({ data }: LinksTableProps) {
  const [filterField, setFilterField] = useState<FilterField>('siteUrl')
  const [filterValue, setFilterValue] = useState('')
  const [sortField, setSortField] = useState<SortField>('scannedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Фильтрация данных
  const filteredData = useMemo(() => {
    return data.filter((site) => {
      const searchValue = filterValue.toLowerCase()
      switch (filterField) {
        case 'siteUrl':
          return site.siteUrl.toLowerCase().includes(searchValue)
        case 'pageText':
          return site.items.some(item => 
            item.text.toLowerCase().includes(searchValue)
          )
        case 'pageUrl':
          return site.items.some(item => 
            item.url.toLowerCase().includes(searchValue)
          )
        default:
          return true
      }
    })
  }, [data, filterField, filterValue])

  // Сортировка данных
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'siteUrl':
          comparison = a.siteUrl.localeCompare(b.siteUrl)
          break
        case 'itemsCount':
          comparison = a.items.length - b.items.length
          break
        case 'scannedAt':
          comparison = new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortField, sortOrder])

  // Пагинация
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE)
  const paginatedData = sortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Создаем общий список всех пунктов меню (регистронезависимый)
  const allMenuItems = useMemo(() => {
    const items = new Set<string>()
    data.forEach(site => {
      site.items.forEach(item => {
        items.add(item.text.toLowerCase())
      })
    })
    return Array.from(items).sort()
  }, [data])

  // Функция для проверки наличия пункта меню у сайта
  const hasMenuItem = (site: SiteMenu, itemText: string) => {
    return site.items.some(item => item.text.toLowerCase() === itemText.toLowerCase())
  }

  // Функция для экспорта в CSV
  const exportToCsv = () => {
    // Собираем все уникальные пункты меню
    const menuColumns = allMenuItems.map(item => ({
      text: item,
      column: `"${item}"`
    }))

    const rows: string[] = []
    
    // Формируем заголовок с текстами меню
    const headerColumns = ['Сайт', 'Дата сканирования', 'Статус', ...menuColumns.map(col => col.column)]
    rows.push(headerColumns.join(','))
    
    // Данные - только ссылки
    data.forEach(site => {
      const rowData = [
        `"${site.siteUrl}"`,
        `"${format(new Date(site.scannedAt), 'dd.MM.yyyy HH:mm')}"`,
        `"${site.error || 'OK'}"`,
      ]

      // Добавляем URL для каждого пункта меню
      menuColumns.forEach(col => {
        const menuItem = site.items.find(
          item => item.text.toLowerCase() === col.text.toLowerCase()
        )
        rowData.push(menuItem ? `"${menuItem.url}"` : '"-"')
      })

      rows.push(rowData.join(','))
    })
    
    // Добавляем BOM для корректного отображения кириллицы
    const bom = '\uFEFF'
    const csv = bom + rows.join('\n')
    
    // Создаем и скачиваем файл
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `menu-scan-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Результаты сканирования</CardTitle>
            <CardDescription>
              Найдено сайтов: {data.length}, страниц: {data.reduce((sum, site) => sum + site.items.length, 0)}
            </CardDescription>
          </div>
          <Button onClick={exportToCsv} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Экспорт CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4">
          <Select value={filterField} onValueChange={(value) => setFilterField(value as FilterField)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Поле для поиска" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="siteUrl">Сайт</SelectItem>
              <SelectItem value="pageText">Текст страницы</SelectItem>
              <SelectItem value="pageUrl">URL страницы</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Поиск..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Сайт</TableHead>
                <TableHead>Пункты меню</TableHead>
                <TableHead className="w-[150px]">Дата скана</TableHead>
                <TableHead className="w-[100px]">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((site, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{site.siteUrl}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {allMenuItems.map((itemText, itemIndex) => {
                        const hasItem = hasMenuItem(site, itemText)
                        return (
                          <span
                            key={itemIndex}
                            className={`inline-block mr-2 px-2 py-1 text-sm rounded ${
                              hasItem
                                ? 'bg-green-100 dark:bg-green-900/20'
                                : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {itemText}
                          </span>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(site.scannedAt), 'dd.MM.yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {site.error ? (
                      <span className="text-red-500">Ошибка</span>
                    ) : (
                      <span className="text-green-500">OK</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              Первая
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              Назад
            </Button>
            <span className="px-4 py-2">
              Страница {currentPage} из {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
            >
              Вперед
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Последняя
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 