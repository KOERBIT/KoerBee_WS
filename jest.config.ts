import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default async () => {
  const jestConfig = await createJestConfig(config)()
  // Allow jose (ESM-only) to be transformed by Jest
  jestConfig.transformIgnorePatterns = [
    'node_modules/(?!jose/)',
  ]
  return jestConfig
}
