import * as cheerio from 'cheerio'
import type { MenuItem } from '@/types'

/**
 * Извлекает ссылки из меню в хедере WordPress сайта
 * @param html HTML-контент страницы
 * @returns Массив найденных ссылок
 */
export function parseMenu(html: string): MenuItem[] {
  const $ = cheerio.load(html)
  const menuItems: MenuItem[] = []

  // Наиболее распространенные селекторы для меню WordPress
  const menuSelectors = [
    'header nav a', // Общий селектор для ссылок в навигации хедера
    '#site-navigation a', // Стандартный ID для основной навигации
    '.main-navigation a', // Стандартный класс для основной навигации
    '.menu-primary a', // Часто используемый класс для основного меню
    '.primary-menu a', // Альтернативный класс для основного меню
    '.nav-menu a', // Еще один распространенный класс
    '.header-menu a', // Меню в хедере
    '.top-menu a', // Верхнее меню
  ]

  // Объединяем все селекторы в один запрос
  const links = $(menuSelectors.join(', '))

  links.each((_, element) => {
    const link = $(element)
    const text = link.text().trim()
    const url = link.attr('href')

    // Пропускаем пустые ссылки и якоря
    if (!text || !url || url.startsWith('#')) {
      return
    }

    // Пропускаем ссылки на файлы
    if (url.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar|jpg|jpeg|png|gif)$/i)) {
      return
    }

    const menuItem: MenuItem = {
      text,
      url,
    }

    // Добавляем дополнительные атрибуты, если они есть
    const target = link.attr('target')
    if (target) {
      menuItem.target = target
    }

    const rel = link.attr('rel')
    if (rel) {
      menuItem.rel = rel
    }

    menuItems.push(menuItem)
  })

  // Удаляем дубликаты
  const uniqueItems = menuItems.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.url === item.url && t.text === item.text)
  )

  return uniqueItems
} 