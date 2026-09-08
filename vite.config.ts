import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { metadataCopy } from './src/copies/app/metadata.ts'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'connect-document-copy',
      transformIndexHtml: () => [
        { tag: 'title', children: metadataCopy.title, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'description', content: metadataCopy.description }, injectTo: 'head' },
      ],
    },
  ],
})
