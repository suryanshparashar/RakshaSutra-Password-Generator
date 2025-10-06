import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import webExtension from 'vite-plugin-web-extension'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    // webExtension({
    //   manifest: () => ({
    //     manifest_version: 3,
    //     name: 'RakshaSutra',
    //     version: '1.0.3',
    //     description: 'A Protective Formula for Strong Passwords',
    //     action: {
    //       default_popup: 'index.html',
    //       default_title: 'RakshaSutra Password Generator',
    //     },
    //     icons: {
    //       "128": "logo.png",
    //       "48": "logo.png",
    //       "16": "logo.png"
    //     },
    //     permissions: ["clipboardWrite"],
    //   }),
    //   webExtConfig: {
    //     target: "firefox-desktop",
    //     firefox: "firefoxdeveloperedition",
    //     browserConsole: false,
    //     startUrl: undefined,
    //   }
    // })
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`
      }
    },
  },
  server: {
    host: '0.0.0.0',
  }
})
