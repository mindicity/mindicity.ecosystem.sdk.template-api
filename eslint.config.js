const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const jsdocPlugin = require('eslint-plugin-jsdoc');
const securityPlugin = require('eslint-plugin-security');
const sonarjsPlugin = require('eslint-plugin-sonarjs');

module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        ...require('globals').node,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import': importPlugin,
      'jsdoc': jsdocPlugin,
      'security': securityPlugin,
      'sonarjs': sonarjsPlugin,
    },
    rules: {
      // ESLint recommended rules
      ...require('@eslint/js').configs.recommended.rules,
      
      // TypeScript rules - Production Ready
      ...typescriptEslint.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      
      // Code Quality - Mindicity Standards
      'max-lines-per-function': ['error', { 
        max: 80, 
        skipBlankLines: true, 
        skipComments: true,
        IIFEs: true 
      }],
      'max-params': ['error', 5],
      'max-depth': ['error', 4],
      'complexity': ['error', 10],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 4], // Relaxed for test scenarios
      
      // Naming Conventions - Mindicity Standards
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'memberLike', format: ['camelCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        { selector: 'classProperty', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
      ],
      
      // Import Quality - Enhanced
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external', 
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [
            {
              pattern: '@nestjs/**',
              group: 'external',
              position: 'before'
            },
            {
              pattern: '@/**',
              group: 'internal'
            }
          ],
          pathGroupsExcludedImportTypes: ['builtin']
        },
      ],
      'import/no-default-export': 'error',
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      
      // Security - Production Ready
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      
      // Code Smells (SonarJS) - Enhanced
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }], // Relaxed threshold
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-unused-collection': 'error',
      'sonarjs/no-useless-catch': 'error',
      'sonarjs/prefer-immediate-return': 'warn', // Relaxed to warning
      'sonarjs/prefer-object-literal': 'error',
      'sonarjs/prefer-single-boolean-return': 'error',
      
      // Documentation - Mindicity Standards (Relaxed)
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: {
            FunctionDeclaration: false,
            MethodDefinition: false, // Relaxed for now
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration'
          ]
        },
      ],
      'jsdoc/require-description': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      
      // Additional Best Practices
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'no-return-await': 'error',
      'require-await': 'error',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
  
  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.spec.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        ...require('globals').node,
        ...require('globals').jest,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import': importPlugin,
      'security': securityPlugin,
      'sonarjs': sonarjsPlugin,
    },
    rules: {
      // Relaxed rules for test files
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      
      // Increased limits for test files
      'max-lines-per-function': ['warn', { 
        max: 300, 
        skipBlankLines: true, 
        skipComments: true 
      }],
      'max-params': ['error', 6],
      'max-lines': ['warn', { max: 800, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', 20],
      
      // Disabled for tests
      'jsdoc/require-jsdoc': 'off',
      'security/detect-object-injection': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'import/no-default-export': 'off',
      'no-console': 'off',
      
      // Import rules for tests
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.spec.json',
        },
      },
    },
  },
  
  {
    files: ['test/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: false, // Disable project-based linting for e2e tests
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        ...require('globals').node,
        ...require('globals').jest,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import': importPlugin,
    },
    rules: {
      // Very relaxed rules for E2E tests
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      
      // Very high limits for E2E tests
      'max-lines-per-function': ['warn', { 
        max: 500, 
        skipBlankLines: true, 
        skipComments: true 
      }],
      'max-params': ['error', 8],
      'max-lines': 'off',
      'complexity': 'off',
      
      // Disabled for E2E tests
      'jsdoc/require-jsdoc': 'off',
      'security/detect-object-injection': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'import/no-default-export': 'off',
      'no-console': 'off',
      
      // Basic import organization
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],
    },
  },
  
  // Configuration files - Allow default exports and relaxed rules
  {
    files: ['*.config.js', '*.config.ts', 'src/config/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        ...require('globals').node,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import': importPlugin,
    },
    rules: {
      // Allow default exports for config files
      'import/no-default-export': 'off',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
  
  // Main entry point - Allow longer functions
  {
    files: ['src/main.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        ...require('globals').node,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // Allow longer bootstrap function
      'max-lines-per-function': ['warn', { 
        max: 150, 
        skipBlankLines: true, 
        skipComments: true 
      }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      'complexity': ['warn', 15],
    },
  },
  
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'test/coverage/**',
      '*.js',
      '!eslint.config.js',
      '!jest.config.js',
      '*.d.ts',
      '.env*',
      '*.log',
      'logs/**',
      'tmp/**',
      '.husky/**',
    ],
  },
];