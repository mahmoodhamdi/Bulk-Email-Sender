import { describe, it, expect } from 'vitest';
import {
  createContactSchema,
  updateContactSchema,
  contactIdSchema,
  listContactsSchema,
  bulkImportContactsSchema,
  bulkOperationSchema,
  addToListSchema,
  ContactStatusEnum,
} from '@/lib/validations/contact';

describe('Contact Validation Schemas', () => {
  describe('ContactStatusEnum', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED'];
      validStatuses.forEach((status) => {
        expect(() => ContactStatusEnum.parse(status)).not.toThrow();
      });
    });

    it('should reject invalid status values', () => {
      expect(() => ContactStatusEnum.parse('INVALID')).toThrow();
      expect(() => ContactStatusEnum.parse('active')).toThrow();
      expect(() => ContactStatusEnum.parse('')).toThrow();
    });
  });

  describe('createContactSchema', () => {
    const validContact = {
      email: 'test@example.com',
    };

    it('should accept valid contact with minimal data', () => {
      const result = createContactSchema.parse(validContact);
      expect(result.email).toBe('test@example.com');
      expect(result.status).toBe('ACTIVE');
      expect(result.tags).toEqual([]);
    });

    it('should accept valid contact with all fields', () => {
      const fullContact = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        customField1: 'Custom value 1',
        customField2: 'Custom value 2',
        tags: ['customer', 'vip'],
        status: 'ACTIVE',
      };
      const result = createContactSchema.parse(fullContact);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.company).toBe('Acme Inc');
      expect(result.tags).toHaveLength(2);
    });

    it('should reject invalid email', () => {
      expect(() => createContactSchema.parse({ email: 'invalid' })).toThrow();
      expect(() => createContactSchema.parse({ email: '' })).toThrow();
      expect(() => createContactSchema.parse({ email: 'test@' })).toThrow();
    });

    it('should reject firstName over 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(() => createContactSchema.parse({ ...validContact, firstName: longName })).toThrow();
    });

    it('should reject lastName over 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(() => createContactSchema.parse({ ...validContact, lastName: longName })).toThrow();
    });

    it('should reject company over 255 characters', () => {
      const longCompany = 'a'.repeat(256);
      expect(() => createContactSchema.parse({ ...validContact, company: longCompany })).toThrow();
    });

    it('should reject customField1 over 500 characters', () => {
      const longField = 'a'.repeat(501);
      expect(() => createContactSchema.parse({ ...validContact, customField1: longField })).toThrow();
    });

    it('should reject more than 20 tags', () => {
      const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
      expect(() => createContactSchema.parse({ ...validContact, tags: tooManyTags })).toThrow();
    });

    it('should reject tag over 50 characters', () => {
      const longTag = 'a'.repeat(51);
      expect(() => createContactSchema.parse({ ...validContact, tags: [longTag] })).toThrow();
    });

    it('should accept null values for optional fields', () => {
      const result = createContactSchema.parse({
        ...validContact,
        firstName: null,
        lastName: null,
        company: null,
      });
      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
      expect(result.company).toBeNull();
    });
  });

  describe('updateContactSchema', () => {
    it('should accept partial updates', () => {
      const result = updateContactSchema.parse({ firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
    });

    it('should accept empty object', () => {
      const result = updateContactSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept email update', () => {
      const result = updateContactSchema.parse({ email: 'new@example.com' });
      expect(result.email).toBe('new@example.com');
    });

    it('should accept status update', () => {
      const result = updateContactSchema.parse({ status: 'UNSUBSCRIBED' });
      expect(result.status).toBe('UNSUBSCRIBED');
    });

    it('should accept tags update', () => {
      const result = updateContactSchema.parse({ tags: ['new-tag'] });
      expect(result.tags).toEqual(['new-tag']);
    });

    it('should reject invalid email in update', () => {
      expect(() => updateContactSchema.parse({ email: 'invalid' })).toThrow();
    });

    it('should accept null values for optional fields', () => {
      const result = updateContactSchema.parse({ firstName: null, company: null });
      expect(result.firstName).toBeNull();
      expect(result.company).toBeNull();
    });
  });

  describe('contactIdSchema', () => {
    it('should accept valid ID', () => {
      const result = contactIdSchema.parse({ id: 'clxxxxxxxxxxxxxxxxxx' });
      expect(result.id).toBe('clxxxxxxxxxxxxxxxxxx');
    });

    it('should reject empty ID', () => {
      expect(() => contactIdSchema.parse({ id: '' })).toThrow();
    });

    it('should reject missing ID', () => {
      expect(() => contactIdSchema.parse({})).toThrow();
    });
  });

  describe('listContactsSchema', () => {
    it('should use defaults for empty object', () => {
      const result = listContactsSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should coerce string numbers', () => {
      const result = listContactsSchema.parse({ page: '5', limit: '25' });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(25);
    });

    it('should reject limit over 100', () => {
      expect(() => listContactsSchema.parse({ limit: '101' })).toThrow();
    });

    it('should accept status filter', () => {
      const result = listContactsSchema.parse({ status: 'ACTIVE' });
      expect(result.status).toBe('ACTIVE');
    });

    it('should accept search filter', () => {
      const result = listContactsSchema.parse({ search: 'john' });
      expect(result.search).toBe('john');
    });

    it('should accept tag filter', () => {
      const result = listContactsSchema.parse({ tag: 'vip' });
      expect(result.tag).toBe('vip');
    });

    it('should accept valid sortBy values', () => {
      const validSortBy = ['email', 'firstName', 'lastName', 'company', 'createdAt', 'updatedAt'];
      validSortBy.forEach((sortBy) => {
        expect(() => listContactsSchema.parse({ sortBy })).not.toThrow();
      });
    });

    it('should reject invalid sortBy value', () => {
      expect(() => listContactsSchema.parse({ sortBy: 'invalid' })).toThrow();
    });

    it('should reject search over 255 characters', () => {
      const longSearch = 'a'.repeat(256);
      expect(() => listContactsSchema.parse({ search: longSearch })).toThrow();
    });
  });

  describe('bulkImportContactsSchema', () => {
    const validContacts = [
      { email: 'test1@example.com' },
      { email: 'test2@example.com' },
    ];

    it('should accept valid bulk import', () => {
      const result = bulkImportContactsSchema.parse({ contacts: validContacts });
      expect(result.contacts).toHaveLength(2);
      expect(result.updateExisting).toBe(false);
    });

    it('should accept bulk import with options', () => {
      const result = bulkImportContactsSchema.parse({
        contacts: validContacts,
        updateExisting: true,
        defaultTags: ['imported', 'batch-1'],
      });
      expect(result.updateExisting).toBe(true);
      expect(result.defaultTags).toEqual(['imported', 'batch-1']);
    });

    it('should reject empty contacts array', () => {
      expect(() => bulkImportContactsSchema.parse({ contacts: [] })).toThrow();
    });

    it('should reject more than 1000 contacts', () => {
      const tooManyContacts = Array.from({ length: 1001 }, (_, i) => ({
        email: `test${i}@example.com`,
      }));
      expect(() => bulkImportContactsSchema.parse({ contacts: tooManyContacts })).toThrow();
    });

    it('should reject contacts with invalid email', () => {
      expect(() => bulkImportContactsSchema.parse({
        contacts: [{ email: 'invalid' }],
      })).toThrow();
    });

    it('should accept contacts with full data', () => {
      const result = bulkImportContactsSchema.parse({
        contacts: [{
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Acme',
          customField1: 'Value 1',
          customField2: 'Value 2',
          tags: ['vip'],
        }],
      });
      expect(result.contacts[0].firstName).toBe('John');
    });
  });

  describe('bulkOperationSchema', () => {
    const validIds = ['id1', 'id2', 'id3'];

    it('should accept valid delete operation', () => {
      const result = bulkOperationSchema.parse({
        contactIds: validIds,
        operation: 'delete',
      });
      expect(result.operation).toBe('delete');
      expect(result.contactIds).toHaveLength(3);
    });

    it('should accept addTag operation with tag', () => {
      const result = bulkOperationSchema.parse({
        contactIds: validIds,
        operation: 'addTag',
        tag: 'new-tag',
      });
      expect(result.operation).toBe('addTag');
      expect(result.tag).toBe('new-tag');
    });

    it('should accept removeTag operation', () => {
      const result = bulkOperationSchema.parse({
        contactIds: validIds,
        operation: 'removeTag',
        tag: 'old-tag',
      });
      expect(result.operation).toBe('removeTag');
    });

    it('should accept updateStatus operation', () => {
      const result = bulkOperationSchema.parse({
        contactIds: validIds,
        operation: 'updateStatus',
        status: 'UNSUBSCRIBED',
      });
      expect(result.operation).toBe('updateStatus');
      expect(result.status).toBe('UNSUBSCRIBED');
    });

    it('should reject empty contactIds array', () => {
      expect(() => bulkOperationSchema.parse({
        contactIds: [],
        operation: 'delete',
      })).toThrow();
    });

    it('should reject more than 100 contactIds', () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `id${i}`);
      expect(() => bulkOperationSchema.parse({
        contactIds: tooManyIds,
        operation: 'delete',
      })).toThrow();
    });

    it('should reject invalid operation', () => {
      expect(() => bulkOperationSchema.parse({
        contactIds: validIds,
        operation: 'invalid',
      })).toThrow();
    });
  });

  describe('addToListSchema', () => {
    it('should accept valid input', () => {
      const result = addToListSchema.parse({
        listId: 'list-id',
        contactIds: ['contact1', 'contact2'],
      });
      expect(result.listId).toBe('list-id');
      expect(result.contactIds).toHaveLength(2);
    });

    it('should reject empty listId', () => {
      expect(() => addToListSchema.parse({
        listId: '',
        contactIds: ['contact1'],
      })).toThrow();
    });

    it('should reject empty contactIds array', () => {
      expect(() => addToListSchema.parse({
        listId: 'list-id',
        contactIds: [],
      })).toThrow();
    });

    it('should reject more than 100 contactIds', () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `id${i}`);
      expect(() => addToListSchema.parse({
        listId: 'list-id',
        contactIds: tooManyIds,
      })).toThrow();
    });
  });
});
