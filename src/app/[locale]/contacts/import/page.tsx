import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default async function ImportContactsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ImportContactsContent />;
}

function ImportContactsContent() {
  const t = useTranslations();

  return (
    <PageLayout
      title={t('contacts.import.title')}
      subtitle={t('contacts.import.subtitle')}
      actions={
        <Button variant="outline" asChild>
          <Link href="/contacts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>{t('common.upload')}</CardTitle>
            <CardDescription>{t('contacts.import.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">{t('contacts.import.dropzone')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('common.or')}
              </p>
              <Button className="mt-4">
                <FileText className="mr-2 h-4 w-4" />
                {t('contacts.import.browse')}
              </Button>
            </div>
            <div className="mt-4 flex justify-center">
              <Button variant="link" size="sm">
                <Download className="mr-2 h-4 w-4" />
                {t('contacts.import.downloadSample')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CSV Format Info */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Format</CardTitle>
            <CardDescription>
              Your CSV file should include the following columns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4 font-mono text-sm">
              email,firstName,lastName,company,customField1,customField2
              <br />
              john@example.com,John,Doe,Acme Inc,value1,value2
              <br />
              jane@example.com,Jane,Smith,Tech Corp,value1,value2
            </div>
            <div className="mt-4">
              <h4 className="font-medium">{t('contacts.import.mapping')}</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('contacts.import.mapColumns')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/contacts">{t('common.cancel')}</Link>
          </Button>
          <Button disabled>
            <Upload className="mr-2 h-4 w-4" />
            {t('common.import')}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
