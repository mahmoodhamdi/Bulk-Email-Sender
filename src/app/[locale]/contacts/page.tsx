import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus, Search, Users, Upload, Download } from 'lucide-react';
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

export default async function ContactsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ContactsContent />;
}

function ContactsContent() {
  const t = useTranslations();

  // Mock data - will be replaced with actual data from database
  const contacts = [
    {
      id: '1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Inc',
      status: 'active',
      createdAt: '2024-03-01',
    },
    {
      id: '2',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Tech Corp',
      status: 'active',
      createdAt: '2024-03-02',
    },
    {
      id: '3',
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Johnson',
      company: 'StartUp LLC',
      status: 'unsubscribed',
      createdAt: '2024-03-03',
    },
    {
      id: '4',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Williams',
      company: 'Big Corp',
      status: 'bounced',
      createdAt: '2024-03-04',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'unsubscribed':
        return 'bg-yellow-100 text-yellow-800';
      case 'bounced':
        return 'bg-red-100 text-red-800';
      case 'complained':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageLayout
      title={t('contacts.title')}
      subtitle={t('contacts.subtitle')}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/contacts/import">
              <Upload className="mr-2 h-4 w-4" />
              {t('contacts.importContacts')}
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t('contacts.exportContacts')}
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('contacts.newContact')}
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('contacts.totalContacts')}</p>
            <p className="text-2xl font-bold">2,847</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('contacts.status.active')}</p>
            <p className="text-2xl font-bold text-green-600">2,650</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('contacts.status.unsubscribed')}</p>
            <p className="text-2xl font-bold text-yellow-600">150</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('contacts.status.bounced')}</p>
            <p className="text-2xl font-bold text-red-600">47</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('contacts.searchPlaceholder')}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            {t('common.all')}
          </Button>
          <Button variant="outline" size="sm">
            {t('contacts.status.active')}
          </Button>
          <Button variant="outline" size="sm">
            {t('contacts.status.unsubscribed')}
          </Button>
          <Button variant="outline" size="sm">
            {t('contacts.status.bounced')}
          </Button>
        </div>
      </div>

      {/* Contacts Table */}
      {contacts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Users className="h-12 w-12 text-muted-foreground" />
          <CardHeader className="text-center">
            <CardTitle>{t('contacts.noContacts')}</CardTitle>
            <CardDescription>{t('contacts.noContactsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline" asChild>
              <Link href="/contacts/import">
                <Upload className="mr-2 h-4 w-4" />
                {t('contacts.importContacts')}
              </Link>
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('contacts.newContact')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    {t('contacts.columns.email')}
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    {t('contacts.columns.firstName')}
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    {t('contacts.columns.lastName')}
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    {t('contacts.columns.company')}
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    {t('contacts.columns.status')}
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b">
                    <td className="p-4 text-sm">{contact.email}</td>
                    <td className="p-4 text-sm">{contact.firstName}</td>
                    <td className="p-4 text-sm">{contact.lastName}</td>
                    <td className="p-4 text-sm">{contact.company}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                          contact.status
                        )}`}
                      >
                        {t(`contacts.status.${contact.status}`)}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm">
                        {t('common.edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
