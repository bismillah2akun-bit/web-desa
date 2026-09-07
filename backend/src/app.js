const cookieParser = require('cookie-parser')
const cors = require('cors')
const express = require('express')
const path = require('path')

const apiRoutes = require('./routes/api')
const { publicDirectory } = require('./config/storage')
const { errorHandler, notFound } = require('./middleware/errorHandler')

const app = express()
const frontendDirectory = path.resolve(__dirname, '../public')

app.disable('x-powered-by')
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(publicDirectory, {
  fallthrough: false,
  maxAge: '7d',
  immutable: true,
}))

app.use('/api', apiRoutes)

app.use(express.static(frontendDirectory, { maxAge: '1d' }))
app.use((req, res, next) => {
  if (req.method !== 'GET' || !req.accepts('html')) return next()
  return res.sendFile(path.join(frontendDirectory, 'index.html'))
})

app.use(notFound)
app.use(errorHandler)

module.exports = app
