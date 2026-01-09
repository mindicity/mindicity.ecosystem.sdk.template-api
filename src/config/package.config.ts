import { readFileSync } from 'fs';
import { join } from 'path';

import { registerAs } from '@nestjs/config';

import { z } from 'zod';

/**
 * Zod schema for package information validation.
 * Validates package.json content to ensure required fields are present.
 */
const PackageConfigSchema = z.object({
  /** Package name from package.json */
  name: z.string().min(1, 'Package name cannot be empty'),
  /** Package version from package.json */
  version: z.string().min(1, 'Package version cannot be empty'),
  /** Package description from package.json */
  description: z.string().optional(),
  /** Package author from package.json */
  author: z.string().optional(),
  /** Package license from package.json */
  license: z.string().optional(),
});

/**
 * Type definition for package configuration.
 * Inferred from the Zod schema to ensure type safety.
 */
export type PackageConfig = z.infer<typeof PackageConfigSchema>;

/**
 * Load and parse package.json file.
 * 
 * @returns {object} Parsed package.json content
 * @throws {Error} When package.json cannot be read or parsed
 */
function loadPackageJson(): object {
  try {
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf8');
    return JSON.parse(packageContent);
  } catch (error) {
    throw new Error(`Failed to load package.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Package configuration factory function.
 *
 * Loads package information from package.json and validates it using Zod schema.
 * Provides fallback values for optional fields.
 *
 * @returns {PackageConfig} Validated and typed package configuration
 * @throws {ZodError} When package.json content fails validation
 * @throws {Error} When package.json cannot be read
 *
 * @example
 * ```typescript
 * // In a service or controller
 * constructor(private configService: ConfigService) {
 *   const packageConfig = this.configService.get<PackageConfig>('package');
 *   console.log(packageConfig.name); // Type-safe access to package name
 *   console.log(packageConfig.version); // Type-safe access to package version
 * }
 * ```
 */
export default registerAs('package', (): PackageConfig => {
  const packageJson = loadPackageJson();
  
  return PackageConfigSchema.parse(packageJson);
});