function imagesFor(news) {
  if (!news) return []
  let images = news.image_urls
  if (typeof images === 'string') {
    try { images = JSON.parse(images) } catch { images = null }
  }
  return Array.isArray(images) ? images : news.image_url ? [news.image_url] : []
}

function withImages(news) {
  return news ? { ...news, image_urls: imagesFor(news) } : null
}

module.exports = { imagesFor, withImages }
