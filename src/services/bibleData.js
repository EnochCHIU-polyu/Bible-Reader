const staticMode = import.meta.env.VITE_STATIC_BIBLE === 'true'
const baseUrl = import.meta.env.BASE_URL

function staticPath(relativePath) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${relativePath.replace(/^\/+/, '')}`
}

async function fetchJson(url, { signal } = {}) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  const type = response.headers.get('content-type') || ''
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Bible data request failed (${response.status}) at ${url}. ${body.slice(0, 100)}`)
  }
  if (!type.toLowerCase().includes('application/json')) {
    const body = await response.text()
    throw new Error(`Expected JSON at ${url}, but received ${type || 'an unknown content type'}. Response starts: ${body.slice(0, 80)}`)
  }
  return response.json()
}

export function getManifest(signal) {
  return fetchJson(
    staticMode ? staticPath('bible/manifest.json') : '/api/manifest',
    { signal },
  )
}

export function getChapter(book, chapter, signal) {
  const safeBook = String(book).toUpperCase()
  const safeChapter = Number(chapter)
  if (!/^[1-3]?[A-Z]{2,3}$/.test(safeBook)) {
    return Promise.reject(new Error(`Invalid Bible book code: ${book}`))
  }
  if (!Number.isInteger(safeChapter) || safeChapter < 1) {
    return Promise.reject(new Error(`Invalid Bible chapter: ${chapter}`))
  }
  const url = staticMode
    ? staticPath(`bible/${safeBook}/${safeChapter}.json`)
    : `/api/chapters/${safeBook}/${safeChapter}`
  return fetchJson(url, { signal })
}
