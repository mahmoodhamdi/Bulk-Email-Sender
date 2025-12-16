import { prisma } from '@/lib/db/prisma';

/**
 * Version change types - matches Prisma enum
 */
export const VERSION_CHANGE_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  REVERT: 'REVERT',
} as const;

export type VersionChangeType = (typeof VERSION_CHANGE_TYPES)[keyof typeof VERSION_CHANGE_TYPES];

/**
 * Template data for versioning
 */
export interface TemplateVersionData {
  name: string;
  subject?: string | null;
  content: string;
  thumbnail?: string | null;
  category?: string | null;
}

/**
 * Options for listing versions
 */
export interface ListVersionsOptions {
  page?: number;
  limit?: number;
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  version1: {
    version: number;
    name: string;
    subject: string | null;
    content: string;
    category: string | null;
    createdAt: Date;
  };
  version2: {
    version: number;
    name: string;
    subject: string | null;
    content: string;
    category: string | null;
    createdAt: Date;
  };
  changes: {
    name: boolean;
    subject: boolean;
    content: boolean;
    category: boolean;
  };
}

/**
 * Generate a human-readable change summary based on what fields changed
 */
export function generateChangeSummary(
  oldData: TemplateVersionData,
  newData: TemplateVersionData
): string {
  const changes: string[] = [];

  if (oldData.name !== newData.name) {
    changes.push('name');
  }
  if (oldData.subject !== newData.subject) {
    changes.push('subject');
  }
  if (oldData.content !== newData.content) {
    changes.push('content');
  }
  if (oldData.category !== newData.category) {
    changes.push('category');
  }

  if (changes.length === 0) {
    return 'No changes';
  }

  if (changes.length === 1) {
    return `Updated ${changes[0]}`;
  }

  if (changes.length === 2) {
    return `Updated ${changes[0]} and ${changes[1]}`;
  }

  const lastChange = changes.pop();
  return `Updated ${changes.join(', ')}, and ${lastChange}`;
}

/**
 * Check if template data has changed
 */
export function hasChanges(
  oldData: TemplateVersionData,
  newData: TemplateVersionData
): boolean {
  return (
    oldData.name !== newData.name ||
    oldData.subject !== newData.subject ||
    oldData.content !== newData.content ||
    oldData.category !== newData.category
  );
}

/**
 * Create the initial version (v1) when a template is created
 */
export async function createInitialVersion(
  templateId: string,
  data: TemplateVersionData,
  createdBy?: string
) {
  return prisma.templateVersion.create({
    data: {
      templateId,
      version: 1,
      name: data.name,
      subject: data.subject,
      content: data.content,
      thumbnail: data.thumbnail,
      category: data.category,
      changeType: VERSION_CHANGE_TYPES.CREATE,
      changeSummary: 'Initial version',
      createdBy,
    },
  });
}

/**
 * Create a new version when template is updated
 * Returns null if no changes detected
 */
export async function createVersion(
  templateId: string,
  oldData: TemplateVersionData,
  newData: TemplateVersionData,
  createdBy?: string,
  customSummary?: string
) {
  // Check if there are actual changes
  if (!hasChanges(oldData, newData)) {
    return null;
  }

  // Get the current version number
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { currentVersion: true },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  const newVersion = template.currentVersion + 1;
  const changeSummary = customSummary || generateChangeSummary(oldData, newData);

  // Create new version and update template's currentVersion in a transaction
  const [version] = await prisma.$transaction([
    prisma.templateVersion.create({
      data: {
        templateId,
        version: newVersion,
        name: newData.name,
        subject: newData.subject,
        content: newData.content,
        thumbnail: newData.thumbnail,
        category: newData.category,
        changeType: VERSION_CHANGE_TYPES.UPDATE,
        changeSummary,
        createdBy,
      },
    }),
    prisma.template.update({
      where: { id: templateId },
      data: { currentVersion: newVersion },
    }),
  ]);

  return version;
}

/**
 * List all versions for a template with pagination
 */
export async function getVersions(
  templateId: string,
  options: ListVersionsOptions = {}
) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [versions, total] = await Promise.all([
    prisma.templateVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        version: true,
        name: true,
        changeType: true,
        changeSummary: true,
        createdBy: true,
        createdAt: true,
      },
    }),
    prisma.templateVersion.count({
      where: { templateId },
    }),
  ]);

  return {
    versions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a specific version by version number
 */
export async function getVersion(templateId: string, version: number) {
  return prisma.templateVersion.findUnique({
    where: {
      templateId_version: {
        templateId,
        version,
      },
    },
  });
}

/**
 * Get the latest version for a template
 */
export async function getLatestVersion(templateId: string) {
  return prisma.templateVersion.findFirst({
    where: { templateId },
    orderBy: { version: 'desc' },
  });
}

/**
 * Revert template to a specific version
 * Creates a new version with the reverted content
 */
export async function revertToVersion(
  templateId: string,
  targetVersion: number,
  createdBy?: string,
  customSummary?: string
) {
  // Get the target version
  const targetVersionData = await getVersion(templateId, targetVersion);

  if (!targetVersionData) {
    throw new Error(`Version ${targetVersion} not found`);
  }

  // Get the current template
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      currentVersion: true,
      name: true,
      subject: true,
      content: true,
      thumbnail: true,
      category: true,
    },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  const newVersion = template.currentVersion + 1;
  const changeSummary = customSummary
    ? `Reverted to version ${targetVersion}: ${customSummary}`
    : `Reverted to version ${targetVersion}`;

  // Create new version with reverted content and update template
  const [version, updatedTemplate] = await prisma.$transaction([
    prisma.templateVersion.create({
      data: {
        templateId,
        version: newVersion,
        name: targetVersionData.name,
        subject: targetVersionData.subject,
        content: targetVersionData.content,
        thumbnail: targetVersionData.thumbnail,
        category: targetVersionData.category,
        changeType: VERSION_CHANGE_TYPES.REVERT,
        changeSummary,
        createdBy,
      },
    }),
    prisma.template.update({
      where: { id: templateId },
      data: {
        currentVersion: newVersion,
        name: targetVersionData.name,
        subject: targetVersionData.subject,
        content: targetVersionData.content,
        thumbnail: targetVersionData.thumbnail,
        category: targetVersionData.category,
      },
    }),
  ]);

  return {
    version,
    template: updatedTemplate,
  };
}

/**
 * Compare two versions
 */
export async function compareVersions(
  templateId: string,
  v1: number,
  v2: number
): Promise<VersionComparison | null> {
  const [version1, version2] = await Promise.all([
    getVersion(templateId, v1),
    getVersion(templateId, v2),
  ]);

  if (!version1 || !version2) {
    return null;
  }

  return {
    version1: {
      version: version1.version,
      name: version1.name,
      subject: version1.subject,
      content: version1.content,
      category: version1.category,
      createdAt: version1.createdAt,
    },
    version2: {
      version: version2.version,
      name: version2.name,
      subject: version2.subject,
      content: version2.content,
      category: version2.category,
      createdAt: version2.createdAt,
    },
    changes: {
      name: version1.name !== version2.name,
      subject: version1.subject !== version2.subject,
      content: version1.content !== version2.content,
      category: version1.category !== version2.category,
    },
  };
}

/**
 * Create initial versions for existing templates (migration helper)
 */
export async function migrateExistingTemplates() {
  const templatesWithoutVersions = await prisma.template.findMany({
    where: {
      versions: {
        none: {},
      },
    },
  });

  const results = await Promise.all(
    templatesWithoutVersions.map(async (template) => {
      const version = await prisma.templateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          name: template.name,
          subject: template.subject,
          content: template.content,
          thumbnail: template.thumbnail,
          category: template.category,
          changeType: VERSION_CHANGE_TYPES.CREATE,
          changeSummary: 'Initial version (migrated)',
          createdBy: template.userId,
          createdAt: template.createdAt,
        },
      });
      return { templateId: template.id, versionId: version.id };
    })
  );

  return {
    migratedCount: results.length,
    templates: results,
  };
}
