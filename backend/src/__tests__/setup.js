// Test setup file for Jest
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATA_FOLDER = './test-data'
process.env.PORT = '3001'

// Global test timeout
if (typeof jest !== 'undefined') {
  jest.setTimeout(10000)
}
