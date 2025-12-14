'use client';

import { cn } from '@/lib/utils';
import { usePreviewStore, type Contact } from '@/stores/preview-store';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

// Sample contacts for preview
const SAMPLE_CONTACTS: Contact[] = [
  {
    id: '1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Corp',
    phone: '+1 (555) 123-4567',
    tags: ['customer', 'premium'],
  },
  {
    id: '2',
    email: 'jane.smith@company.com',
    firstName: 'Jane',
    lastName: 'Smith',
    company: 'Tech Solutions',
    phone: '+1 (555) 987-6543',
    tags: ['lead'],
  },
  {
    id: '3',
    email: 'ahmed.mohamed@business.sa',
    firstName: 'أحمد',
    lastName: 'محمد',
    company: 'شركة الأعمال',
    phone: '+966 55 123 4567',
    tags: ['customer'],
  },
  {
    id: '4',
    email: 'maria.garcia@empresa.es',
    firstName: 'Maria',
    lastName: 'Garcia',
    company: 'Empresa Tech',
    phone: '+34 612 345 678',
    tags: ['prospect'],
  },
];

export function PersonalizationPicker() {
  const t = useTranslations('preview');
  const { previewContact, setPreviewContact } = usePreviewStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentContact = previewContact || SAMPLE_CONTACTS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('previewAs')}</h4>
        <button onClick={() => setIsOpen(!isOpen)} className="text-sm text-primary hover:text-primary/80">
          {isOpen ? t('collapse') : t('changeContact')}
        </button>
      </div>

      {/* Current Contact Card */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
            {currentContact.firstName?.[0] || currentContact.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {currentContact.firstName} {currentContact.lastName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentContact.email}</p>
            {currentContact.company && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{currentContact.company}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact List */}
      {isOpen && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('selectContactToPreview')}</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {SAMPLE_CONTACTS.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  setPreviewContact(contact);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-start',
                  previewContact?.id === contact.id
                    ? 'bg-primary/5 border-primary'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/50'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium">
                  {contact.firstName?.[0] || contact.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {contact.firstName} {contact.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.email}</p>
                </div>
                {previewContact?.id === contact.id && (
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Merge Tags Reference */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('availableTags')}</h5>
        <div className="flex flex-wrap gap-2">
          {[
            { tag: '{{firstName}}', value: currentContact.firstName || '-' },
            { tag: '{{lastName}}', value: currentContact.lastName || '-' },
            { tag: '{{email}}', value: currentContact.email },
            { tag: '{{company}}', value: currentContact.company || '-' },
            { tag: '{{fullName}}', value: [currentContact.firstName, currentContact.lastName].filter(Boolean).join(' ') || '-' },
          ].map((item) => (
            <div
              key={item.tag}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
              title={`${t('currentValue')}: ${item.value}`}
            >
              <span className="font-mono text-primary">{item.tag}</span>
              <span className="text-gray-400 mx-1">→</span>
              <span className="text-gray-600 dark:text-gray-300">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
