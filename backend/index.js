require('dotenv').config()

const app = require('./src/app')
const { pool, testConnection, initializeDatabase } = require('./src/config/database')
const { ensureDefaultAdmin } = require('./src/services/authService')

const port = Number(process.env.PORT || 5000)
const databaseRetryDelay = Number(process.env.DB_RETRY_DELAY_MS || 3000)
const databaseMaxRetries = Number(process.env.DB_MAX_RETRIES || 20)
let server

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function connectToDatabase() {
  for (let attempt = 1; attempt <= databaseMaxRetries; attempt += 1) {
    try {
      await testConnection()
      return
    } catch (error) {
      if (attempt === databaseMaxRetries) throw error

      console.warn(
        `Database belum siap (${attempt}/${databaseMaxRetries}): ${error.message}. `
        + `Mencoba kembali dalam ${databaseRetryDelay / 1000} detik...`,
      )
      await wait(databaseRetryDelay)
    }
  }
}

async function startServer() {
  try {
    await connectToDatabase()
    await initializeDatabase()
    await ensureDefaultAdmin()

    server = app.listen(port, '0.0.0.0', () => {
      console.log(`API berjalan pada http://0.0.0.0:${port}`)
      console.log('Database terhubung dan akun admin siap')
    })
  } catch (error) {
    console.error('Gagal menjalankan API setelah beberapa percobaan:', error.message)
    process.exit(1)
  }
}

async function shutdown(signal) {
  console.log(`${signal} diterima, menghentikan server...`)

  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }

  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

startServer()
