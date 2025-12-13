import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus, Search, FileText, Eye, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageLayout } from '@/components/layout/PageLayout';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function TemplatesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TemplatesContent />;
}

function TemplatesContent() {
  const t = useTranslations();

  // Mock data - will be replaced with actual data from database
  const templates = [
    {
      id: '1',
      name: 'Newsletter Template',
      category: 'newsletter',
      thumbnail: null,
      createdAt: '2024-03-01',
    },
    {
      id: '2',
      name: 'Welcome Email',
      category: 'welcome',
      thumbnail: null,
      createdAt: '2024-03-05',
    },
    {
      id: '3',
      name: 'Product Announcement',
      category: 'announcement',
      thumbnail: null,
      createdAt: '2024-03-08',
    },
    {
      id: '4',
      name: 'Special Offer',
      category: 'promotional',
      thumbnail: null,
      createdAt: '2024-03-10',
    },
  ];

  const categories = [
    'all',
    'newsletter',
    'promotional',
    'transactional',
    'announcement',
    'welcome',
    'custom',
  ];

  return (
    <PageLayout
      title={t('templates.title')}
      subtitle={t('templates.subtitle')}
      actions={
        <Button asChild>
          <Link href="/templates/builder">
            <Plus className="mr-2 h-4 w-4" />
            {t('templates.newTemplate')}
          </Link>
        </Button>
      }
    >
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('templates.searchPlaceholder')}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={category === 'all' ? 'default' : 'outline'}
              size="sm"
            >
              {t(`templates.categories.${category}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <CardHeader className="text-center">
            <CardTitle>{t('templates.noTemplates')}</CardTitle>
            <CardDescription>{t('templates.noTemplatesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/templates/builder">
                <Plus className="mr-2 h-4 w-4" />
                {t('templates.createFirst')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              {/* Template Preview */}
              <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold">{template.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`templates.categories.${template.category}`)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-1 h-4 w-4" />
                    {t('templates.previewTemplate')}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="mt-2 w-full" size="sm">
                  {t('templates.useTemplate')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
