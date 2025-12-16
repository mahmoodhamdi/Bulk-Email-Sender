/**
 * A/B Testing Types
 */

import { z } from 'zod';
import type { ABTestType, ABTestStatus, WinnerCriteria } from '@prisma/client';

// Zod schemas for validation
export const createABTestSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  name: z.string().min(1, 'Name is required').max(100),
  testType: z.enum(['SUBJECT', 'CONTENT', 'FROM_NAME', 'SEND_TIME']),
  sampleSize: z.number().int().min(5).max(100).default(20),
  winnerCriteria: z.enum(['OPEN_RATE', 'CLICK_RATE', 'CONVERSION_RATE']).default('OPEN_RATE'),
  testDuration: z.number().int().min(1).max(168).default(4), // 1 hour to 7 days
  autoSelectWinner: z.boolean().default(true),
  variants: z.array(z.object({
    name: z.string().min(1).max(50),
    subject: z.string().optional(),
    content: z.string().optional(),
    fromName: z.string().optional(),
    sendTime: z.string().datetime().optional(),
  })).min(2, 'At least 2 variants are required').max(5, 'Maximum 5 variants allowed'),
});

export const updateABTestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sampleSize: z.number().int().min(5).max(100).optional(),
  winnerCriteria: z.enum(['OPEN_RATE', 'CLICK_RATE', 'CONVERSION_RATE']).optional(),
  testDuration: z.number().int().min(1).max(168).optional(),
  autoSelectWinner: z.boolean().optional(),
});

export const updateVariantSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  subject: z.string().optional(),
  content: z.string().optional(),
  fromName: z.string().optional(),
  sendTime: z.string().datetime().optional(),
});

export const addVariantSchema = z.object({
  name: z.string().min(1).max(50),
  subject: z.string().optional(),
  content: z.string().optional(),
  fromName: z.string().optional(),
  sendTime: z.string().datetime().optional(),
});

// TypeScript types
export type CreateABTestInput = z.infer<typeof createABTestSchema>;
export type UpdateABTestInput = z.infer<typeof updateABTestSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type AddVariantInput = z.infer<typeof addVariantSchema>;

export interface ABTestStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

export interface VariantStats {
  variantId: string;
  name: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  isWinner: boolean;
}

export interface ABTestWithStats {
  id: string;
  campaignId: string;
  name: string;
  testType: ABTestType;
  sampleSize: number;
  winnerCriteria: WinnerCriteria;
  testDuration: number;
  autoSelectWinner: boolean;
  status: ABTestStatus;
  winnerId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  stats: ABTestStats;
  variants: VariantStats[];
}
