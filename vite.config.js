import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {name: 'firebase-firestore', test: /@firebase\/firestore/, priority: 30},
            {name: 'firebase-auth', test: /@firebase\/auth/, priority: 30},
            {name: 'firebase-core', test: /@firebase|firebase\//, priority: 20},
            {name: 'react', test: /node_modules\/(react|react-dom|scheduler)\//, priority: 20},
          ],
        },
      },
    },
  },
})
