import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { updateContactSchema, contactIdSchema } from '@/lib/validations/contact';
import { apiRateLimiter } from '@/lib/rate-limit';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contacts/[id]
 * Get a single contact by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`contact-get-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    contactIdSchema.parse({ id });

    // Get contact with related data
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        listMembers: {
          include: {
            list: {
              select: { id: true, name: true },
            },
          },
        },
        recipients: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            campaignId: true,
            status: true,
            sentAt: true,
            openedAt: true,
            clickedAt: true,
            campaign: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { recipients: true, listMembers: true },
        },
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: contact });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error getting contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contacts/[id]
 * Update an existing contact
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`contact-update-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    contactIdSchema.parse({ id });

    // Check if contact exists
    const existing = await prisma.contact.findUnique({
      where: { id },
      select: { id: true, email: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateContactSchema.parse(body);

    // If email is being updated, check for duplicates within the same user's contacts
    if (validated.email && validated.email !== existing.email) {
      const emailExists = await prisma.contact.findFirst({
        where: {
          email: validated.email,
          userId: existing.userId,
          id: { not: id },
        },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Contact with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
    if (validated.company !== undefined) updateData.company = validated.company;
    if (validated.customField1 !== undefined) updateData.customField1 = validated.customField1;
    if (validated.customField2 !== undefined) updateData.customField2 = validated.customField2;
    if (validated.tags !== undefined) updateData.tags = validated.tags;
    if (validated.status !== undefined) {
      updateData.status = validated.status;
      // Update timestamps based on status
      if (validated.status === 'UNSUBSCRIBED') {
        updateData.unsubscribedAt = new Date();
      } else if (validated.status === 'BOUNCED') {
        updateData.bouncedAt = new Date();
      }
    }

    // Update contact
    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: contact });
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
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/[id]
 * Delete a contact
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`contact-delete-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    contactIdSchema.parse({ id });

    // Check if contact exists
    const existing = await prisma.contact.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Delete contact (cascades to list memberships)
    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
