'use client';

import { cn } from '@/lib/utils';
import { usePreviewStore } from '@/stores/preview-store';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { DeviceToggle, DarkModeToggle, EmailClientSelector } from './DeviceToggle';
import { PersonalizationPicker } from './PersonalizationPicker';
import { SpamScoreCard } from './SpamScoreCard';
import { TestSendDialog } from './TestSendDialog';

interface EmailPreviewProps {
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
  className?: string;
}

export function EmailPreview({ subject, htmlContent, textContent, fromName, fromEmail, className }: EmailPreviewProps) {
  const t = useTranslations('preview');
  const {
    previewMode,
    darkMode,
    emailClient,
    showRawHtml,
    activeTab,
    isPreviewOpen,
    setSubject,
    setHtmlContent,
    setTextContent,
    setFromName,
    setFromEmail,
    setActiveTab,
    closePreview,
    toggleRawHtml,
    getRenderedContent,
    getRenderedSubject,
    getDeviceDimensions,
  } = usePreviewStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync props with store
  useEffect(() => {
    if (subject) setSubject(subject);
    if (htmlContent) setHtmlContent(htmlContent);
    if (textContent) setTextContent(textContent);
    if (fromName) setFromName(fromName);
    if (fromEmail) setFromEmail(fromEmail);
  }, [subject, htmlContent, textContent, fromName, fromEmail, setSubject, setHtmlContent, setTextContent, setFromName, setFromEmail]);

  // Update iframe content
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        const content = getRenderedContent();
        const clientStyles = getEmailClientStyles(emailClient, darkMode);
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  line-height: 1.6;
                  ${darkMode ? 'background: #1a1a1a; color: #e0e0e0;' : 'background: #ffffff; color: #333333;'}
                }
                ${clientStyles}
              </style>
            </head>
            <body>
              ${content}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [getRenderedContent, emailClient, darkMode]);

  const dimensions = getDeviceDimensions();

  const tabs = [
    { id: 'preview' as const, label: t('preview') },
    { id: 'test' as const, label: t('testSend') },
    { id: 'spam' as const, label: t('spamCheck') },
  ];

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('emailPreview')}</h2>
        {isPreviewOpen && (
          <button
            onClick={closePreview}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && (
          <div className="flex flex-col h-full">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <DeviceToggle />
                <DarkModeToggle />
                <EmailClientSelector />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleRawHtml}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg transition-colors',
                    showRawHtml
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {showRawHtml ? t('viewRendered') : t('viewSource')}
                </button>
              </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-800">
              {/* Subject Line Preview */}
              <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <span className="font-medium">{t('subject')}:</span>
                </div>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{getRenderedSubject() || t('noSubject')}</p>
              </div>

              {/* Email Preview Frame */}
              <div
                className="mx-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300"
                style={{
                  width: previewMode === 'desktop' ? '100%' : `${dimensions.width}px`,
                  maxWidth: '100%',
                }}
              >
                {showRawHtml ? (
                  <pre className="p-4 text-xs overflow-auto bg-gray-900 text-green-400 font-mono">
                    {getRenderedContent()}
                  </pre>
                ) : (
                  <iframe
                    ref={iframeRef}
                    title="Email Preview"
                    className="w-full border-0"
                    style={{ height: `${dimensions.height}px`, minHeight: '400px' }}
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
            </div>

            {/* Personalization */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <PersonalizationPicker />
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="p-6 overflow-auto">
            <TestSendDialog />
          </div>
        )}

        {activeTab === 'spam' && (
          <div className="p-6 overflow-auto">
            <SpamScoreCard />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get email client specific styles
function getEmailClientStyles(client: string, darkMode: boolean): string {
  const baseStyles = darkMode
    ? `
      a { color: #60a5fa; }
      img { max-width: 100%; height: auto; }
    `
    : `
      a { color: #2563eb; }
      img { max-width: 100%; height: auto; }
    `;

  switch (client) {
    case 'gmail':
      return `
        ${baseStyles}
        body { padding: 16px; }
        .gmail-quote { border-left: 2px solid #ccc; margin: 0 0 0 8px; padding: 0 0 0 8px; }
      `;
    case 'outlook':
      return `
        ${baseStyles}
        body { padding: 20px; font-family: Calibri, Arial, sans-serif; }
        table { border-collapse: collapse; }
      `;
    case 'apple':
      return `
        ${baseStyles}
        body { padding: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        a { color: #007aff; }
      `;
    default:
      return baseStyles;
  }
}

// Standalone Preview Modal
interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
}

export function PreviewModal({ isOpen, onClose, ...props }: PreviewModalProps) {
  const t = useTranslations('preview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        <EmailPreview {...props} />
      </div>
    </div>
  );
}

// Preview Button that opens the modal
interface PreviewButtonProps {
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
  className?: string;
}

export function PreviewButton({ className, ...props }: PreviewButtonProps) {
  const t = useTranslations('preview');
  const { openPreview, isPreviewOpen, closePreview } = usePreviewStore();

  const handleClick = () => {
    openPreview({ subject: props.subject, html: props.htmlContent, text: props.textContent });
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
          className
        )}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        {t('previewAndTest')}
      </button>
      <PreviewModal isOpen={isPreviewOpen} onClose={closePreview} {...props} />
    </>
  );
}
