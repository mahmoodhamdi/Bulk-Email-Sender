import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createContactSchema, listContactsSchema, bulkImportContactsSchema } from '@/lib/validations/contact';
import { apiRateLimiter } from '@/lib/rate-limit';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/contacts
 * List contacts with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('contacts-list');
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      tag: searchParams.get('tag') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    // Validate parameters
    const validated = listContactsSchema.parse(params);
    const { page, limit, status, search, tag, sortBy, sortOrder } = validated;

    // Build where clause
    const where: Prisma.ContactWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tag) {
      where.tags = { has: tag };
    }

    // Get total count
    const total = await prisma.contact.count({ where });

    // Get contacts
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { recipients: true, listMembers: true },
        },
      },
    });

    return NextResponse.json({
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error listing contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts
 * Create a new contact or bulk import contacts
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('contacts-create');
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Parse body
    const body = await request.json();

    // Check if this is a bulk import (has 'contacts' array)
    if (body.contacts && Array.isArray(body.contacts)) {
      return handleBulkImport(body);
    }

    // Single contact creation
    const validated = createContactSchema.parse(body);

    // Check for existing contact (email must be unique per user, or globally if no user)
    const existing = await prisma.contact.findFirst({
      where: { email: validated.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Contact with this email already exists' },
        { status: 409 }
      );
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        email: validated.email,
        firstName: validated.firstName,
        lastName: validated.lastName,
        company: validated.company,
        customField1: validated.customField1,
        customField2: validated.customField2,
        tags: validated.tags,
        status: validated.status,
      },
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle bulk import of contacts with optimized batch operations
 */
async function handleBulkImport(body: unknown) {
  try {
    const validated = bulkImportContactsSchema.parse(body);
    const { contacts, updateExisting, defaultTags } = validated;

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { email: string; error: string }[],
    };

    // Extract all unique emails from import data
    const importEmails = [...new Set(contacts.map(c => c.email.toLowerCase()))];

    // Single query to find all existing contacts by email
    const existingContacts = await prisma.contact.findMany({
      where: { email: { in: importEmails, mode: 'insensitive' } },
      select: { id: true, email: true, firstName: true, lastName: true, company: true, customField1: true, customField2: true },
    });

    // Build map of existing emails -> contact data for O(1) lookup
    const existingMap = new Map(
      existingContacts.map(c => [c.email.toLowerCase(), c])
    );

    // Separate contacts into new vs existing
    const contactsToCreate: typeof contacts = [];
    const contactsToUpdate: { id: string; data: typeof contacts[0]; existing: typeof existingContacts[0] }[] = [];

    for (const contactData of contacts) {
      const emailLower = contactData.email.toLowerCase();
      const existing = existingMap.get(emailLower);

      if (existing) {
        if (updateExisting) {
          contactsToUpdate.push({ id: existing.id, data: contactData, existing });
        } else {
          results.skipped++;
        }
      } else {
        contactsToCreate.push(contactData);
      }
    }

    // Batch create new contacts using createMany (much faster than individual creates)
    if (contactsToCreate.length > 0) {
      const createData = contactsToCreate.map(contactData => ({
        email: contactData.email,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        company: contactData.company,
        customField1: contactData.customField1,
        customField2: contactData.customField2,
        tags: [...new Set([...contactData.tags, ...(defaultTags || [])])],
      }));

      try {
        const createResult = await prisma.contact.createMany({
          data: createData,
          skipDuplicates: true,
        });
        results.created = createResult.count;
      } catch (err) {
        // If batch create fails, fall back to individual creates to track errors
        for (const contactData of contactsToCreate) {
          try {
            await prisma.contact.create({
              data: {
                email: contactData.email,
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                company: contactData.company,
                customField1: contactData.customField1,
                customField2: contactData.customField2,
                tags: [...new Set([...contactData.tags, ...(defaultTags || [])])],
              },
            });
            results.created++;
          } catch (createErr) {
            results.errors.push({
              email: contactData.email,
              error: createErr instanceof Error ? createErr.message : 'Unknown error',
            });
          }
        }
      }
    }

    // Batch update existing contacts using transaction
    if (contactsToUpdate.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < contactsToUpdate.length; i += BATCH_SIZE) {
        const batch = contactsToUpdate.slice(i, i + BATCH_SIZE);
        try {
          await prisma.$transaction(
            batch.map(({ id, data, existing }) => {
              const tags = [...new Set([...data.tags, ...(defaultTags || [])])];
              return prisma.contact.update({
                where: { id },
                data: {
                  firstName: data.firstName ?? existing.firstName,
                  lastName: data.lastName ?? existing.lastName,
                  company: data.company ?? existing.company,
                  customField1: data.customField1 ?? existing.customField1,
                  customField2: data.customField2 ?? existing.customField2,
                  tags,
                },
              });
            })
          );
          results.updated += batch.length;
        } catch (err) {
          // If batch fails, try individual updates
          for (const { id, data, existing } of batch) {
            try {
              const tags = [...new Set([...data.tags, ...(defaultTags || [])])];
              await prisma.contact.update({
                where: { id },
                data: {
                  firstName: data.firstName ?? existing.firstName,
                  lastName: data.lastName ?? existing.lastName,
                  company: data.company ?? existing.company,
                  customField1: data.customField1 ?? existing.customField1,
                  customField2: data.customField2 ?? existing.customField2,
                  tags,
                },
              });
              results.updated++;
            } catch (updateErr) {
              results.errors.push({
                email: data.email,
                error: updateErr instanceof Error ? updateErr.message : 'Unknown error',
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      data: results,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
    }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
