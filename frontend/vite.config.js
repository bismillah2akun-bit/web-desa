import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'node:fs'

function documentEditorLicenses() {
  return {
    name: 'document-editor-licenses',
    generateBundle() {
      for (const name of ['core', 'react', 'fonts']) {
        const directory = path.resolve(import.meta.dirname, `node_modules/@docx-editor.dev/${name}`)
        const files = ['LICENSE', 'THIRD_PARTY_NOTICES.md']
        const licenses = path.join(directory, 'licenses')
        if (fs.existsSync(licenses)) files.push(...fs.readdirSync(licenses).map((file) => `licenses/${file}`))
        for (const file of files) {
          const source = path.join(directory, file)
          if (fs.existsSync(source)) this.emitFile({ type: 'asset', fileName: `licenses/docx-editor/${name}/${file}`, source: fs.readFileSync(source) })
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), documentEditorLicenses()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
