import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // To pozwala Vite czytać folder lib, który jest poza src
      allow: ['.', './src', './lib'] 
    }
  }
})