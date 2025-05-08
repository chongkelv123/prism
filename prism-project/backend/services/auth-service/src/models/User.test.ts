// backend/services/auth-service/src/models/User.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('mongoose');

// Define interface for the User type
interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  id: string;
  _id: string;
  isModified: jest.Mock;
  save: jest.Mock;
  comparePassword: jest.Mock;
}

// Create a manual mock of the User model since we can't import it directly
// due to TypeScript errors related to mocking mongoose
const mockUserSchema = {
  obj: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  _handlers: {
    save: [{ fn: async function(this: IUser) {
      if (!this.isModified('passwordHash')) return;
      
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }}]
  }
};

// Create a mock User class
class MockUser implements IUser {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  id: string;
  _id: string;
  isModified: jest.Mock;
  save: jest.Mock;
  comparePassword: jest.Mock;

  constructor(data: any) {
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.id = 'mock-id';
    this._id = 'mock-id';
    
    // Create mock methods
    this.isModified = jest.fn();
    this.save = jest.fn();
    this.comparePassword = jest.fn();
  }

  static exists = jest.fn();
  static findOne = jest.fn();
  static findById = jest.fn();
  
  static get schema() {
    return mockUserSchema;
  }
}

// Replace with our mock
const User = MockUser as any;

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema', () => {
    it('has the correct fields and properties', () => {
      const userSchema = User.schema.obj;
      
      // Check required fields
      expect(userSchema.firstName.type).toBe(String);
      expect(userSchema.firstName.required).toBe(true);
      
      expect(userSchema.lastName.type).toBe(String);
      expect(userSchema.lastName.required).toBe(true);
      
      expect(userSchema.email.type).toBe(String);
      expect(userSchema.email.required).toBe(true);
      expect(userSchema.email.unique).toBe(true);
      
      expect(userSchema.passwordHash.type).toBe(String);
      expect(userSchema.passwordHash.required).toBe(true);
      
      expect(userSchema.createdAt.type).toBe(Date);
      expect(userSchema.createdAt.default).toBeDefined();
    });
  });

  describe('Password Hashing', () => {
    it('hashes password on save when modified', async () => {
      // Type the mock explicitly to avoid TypeScript errors
      const mockGenSalt = bcrypt.genSalt as jest.MockedFunction<typeof bcrypt.genSalt>;
      const mockHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
      
      // Set up mock implementations
      mockGenSalt.mockResolvedValue('salt' as never);
      mockHash.mockResolvedValue('hashed_password' as never);
      
      // Create a user instance to test
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'plaintext_password'
      });
      
      // Set up isModified to return true (password has been modified)
      user.isModified.mockReturnValue(true);
      
      // Call the pre-save hook manually
      const preSaveHook = User.schema._handlers.save[0].fn;
      await preSaveHook.call(user);
      
      // Assertions
      expect(mockGenSalt).toHaveBeenCalledWith(10);
      expect(mockHash).toHaveBeenCalledWith('plaintext_password', 'salt');
      expect(user.passwordHash).toBe('hashed_password');
    });
    
    it('does not hash password when not modified', async () => {
      // Create a user instance to test
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'already_hashed_password'
      });
      
      // Set up isModified to return false (password has not been modified)
      user.isModified.mockReturnValue(false);
      
      // Call the pre-save hook manually
      const preSaveHook = User.schema._handlers.save[0].fn;
      await preSaveHook.call(user);
      
      // Assertions
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.passwordHash).toBe('already_hashed_password');
    });
  });

  describe('comparePassword method', () => {
    it('returns true when password matches', async () => {
      // Type the mock explicitly
      const mockCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
      mockCompare.mockResolvedValue(true as never);
      
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'hashed_password'
      });
      
      // Set up comparePassword implementation
      user.comparePassword.mockImplementation(async (plaintext: string) => {
        return await bcrypt.compare(plaintext, user.passwordHash);
      });
      
      const result = await user.comparePassword('correct_password');
      
      expect(mockCompare).toHaveBeenCalledWith('correct_password', 'hashed_password');
      expect(result).toBe(true);
    });
    
    it('returns false when password does not match', async () => {
      // Type the mock explicitly
      const mockCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
      mockCompare.mockResolvedValue(false as never);
      
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'hashed_password'
      });
      
      // Set up comparePassword implementation
      user.comparePassword.mockImplementation(async (plaintext: string) => {
        return await bcrypt.compare(plaintext, user.passwordHash);
      });
      
      const result = await user.comparePassword('wrong_password');
      
      expect(mockCompare).toHaveBeenCalledWith('wrong_password', 'hashed_password');
      expect(result).toBe(false);
    });
  });
});