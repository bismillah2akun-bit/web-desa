const path = require('path')

const storageRoot = path.resolve(
  process.env.STORAGE_PATH || path.resolve(__dirname, '../../storage'),
)

const privateDirectory = path.join(storageRoot, 'private')
const templatesDirectory = path.join(privateDirectory, 'templates')
const publicDirectory = path.join(storageRoot, 'public')
const newsDirectory = path.join(publicDirectory, 'news')
const potentialsDirectory = path.join(publicDirectory, 'potentials')
const profileDirectory = path.join(publicDirectory, 'profile')
const officialsDirectory = path.join(publicDirectory, 'officials')
const areasDirectory = path.join(publicDirectory, 'areas')

module.exports = {
  storageRoot,
  privateDirectory,
  templatesDirectory,
  publicDirectory,
  newsDirectory,
  potentialsDirectory,
  profileDirectory,
  officialsDirectory,
  areasDirectory,
}
