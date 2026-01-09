import { readFileSync } from 'fs';
import { join } from 'path';

import packageConfig from './package.config';

// Mock fs module
jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('PackageConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('packageConfig', () => {
    it('should load and validate package.json successfully', () => {
      // Arrange
      const mockPackageJson = {
        name: 'test-api',
        version: '1.0.0',
        description: 'Test API description',
        author: 'Test Author',
        license: 'MIT',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      // Act
      const config = packageConfig();

      // Assert
      expect(mockReadFileSync).toHaveBeenCalledWith(
        join(process.cwd(), 'package.json'),
        'utf8'
      );
      expect(config).toEqual(mockPackageJson);
    });

    it('should validate required fields', () => {
      // Arrange
      const mockPackageJson = {
        name: 'test-api',
        version: '1.0.0',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      // Act
      const config = packageConfig();

      // Assert
      expect(config.name).toBe('test-api');
      expect(config.version).toBe('1.0.0');
      expect(config.description).toBeUndefined();
      expect(config.author).toBeUndefined();
      expect(config.license).toBeUndefined();
    });

    it('should throw error when package.json cannot be read', () => {
      // Arrange
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      // Act & Assert
      expect(() => packageConfig()).toThrow('Failed to load package.json: File not found');
    });

    it('should throw error when package.json contains invalid JSON', () => {
      // Arrange
      mockReadFileSync.mockReturnValue('invalid json');

      // Act & Assert
      expect(() => packageConfig()).toThrow('Failed to load package.json:');
    });

    it('should throw validation error when required fields are missing', () => {
      // Arrange
      const mockPackageJson = {
        description: 'Missing name and version',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      // Act & Assert
      expect(() => packageConfig()).toThrow();
    });

    it('should throw validation error when required fields are empty', () => {
      // Arrange
      const mockPackageJson = {
        name: '',
        version: '',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      // Act & Assert
      expect(() => packageConfig()).toThrow();
    });
  });
});