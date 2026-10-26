import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['tests/**/*.test.*'],
        env: {
            DATA_FOLDER: './test-data'
        },
        testTimeout: 10000
    }
})
