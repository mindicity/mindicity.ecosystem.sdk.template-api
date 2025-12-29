import {
  BaseException,
  NotFoundException,
  DatabaseException,
  InternalServerException,
  ValidationException,
} from './index';

describe('Exceptions Index', () => {
  it('should export BaseException', () => {
    expect(BaseException).toBeDefined();
    expect(typeof BaseException).toBe('function');
  });

  it('should export NotFoundException', () => {
    expect(NotFoundException).toBeDefined();
    expect(typeof NotFoundException).toBe('function');
  });

  it('should export DatabaseException', () => {
    expect(DatabaseException).toBeDefined();
    expect(typeof DatabaseException).toBe('function');
  });

  it('should export InternalServerException', () => {
    expect(InternalServerException).toBeDefined();
    expect(typeof InternalServerException).toBe('function');
  });

  it('should export ValidationException', () => {
    expect(ValidationException).toBeDefined();
    expect(typeof ValidationException).toBe('function');
  });

  it('should create instances of each exception', () => {
    const notFoundException = new NotFoundException('resource', 'test');
    const databaseException = new DatabaseException('test', 'test');
    const internalServerException = new InternalServerException('test', 'test');
    const validationException = new ValidationException('test', 'test');

    expect(notFoundException).toBeInstanceOf(NotFoundException);
    expect(databaseException).toBeInstanceOf(DatabaseException);
    expect(internalServerException).toBeInstanceOf(InternalServerException);
    expect(validationException).toBeInstanceOf(ValidationException);
    
    // Test that they all inherit from BaseException
    expect(notFoundException).toBeInstanceOf(BaseException);
    expect(databaseException).toBeInstanceOf(BaseException);
    expect(internalServerException).toBeInstanceOf(BaseException);
    expect(validationException).toBeInstanceOf(BaseException);
  });
});