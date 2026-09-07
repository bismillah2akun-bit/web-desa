const path = require('path')

const storageRoot = path.resolve(
  process.env.STORAGE_PATH || path.resolve(__dirname, '../../storage'),
)

const privateDirectory = path.join(storageRoot, 'private')
const publicDirectory = path.join(storageRoot, 'public')
const newsDirectory = path.join(publicDirectory, 'news')
const potentialsDirectory = path.join(publicDirectory, 'potentials')
const profileDirectory = path.join(publicDirectory, 'profile')

module.exports = {
  storageRoot,
  privateDirectory,
  publicDirectory,
  newsDirectory,
  potentialsDirectory,
  profileDirectory,
}
