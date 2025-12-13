'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageLayout } from '@/components/layout/PageLayout';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';

const SMTP_PROVIDERS = [
  'gmail',
  'outlook',
  'yahoo',
  'sendgrid',
  'mailgun',
  'ses',
  'zoho',
  'custom',
];

export default function SettingsPage() {
  const t = useTranslations();
  const {
    smtp,
    smtpTestStatus,
    smtpTestError,
    sending,
    theme,
    language,
    updateSmtp,
    setSmtpProvider,
    testSmtpConnection,
    updateSending,
    setTheme,
    setLanguage,
  } = useSettingsStore();

  const handleTestConnection = async () => {
    await testSmtpConnection();
  };

  const handleSaveSmtp = () => {
    // Already saved via Zustand persist
    alert(t('settings.smtp.configSaved'));
  };

  const handleSaveSending = () => {
    alert(t('common.success'));
  };

  return (
    <PageLayout title={t('settings.title')} subtitle="">
      <div className="space-y-6">
        {/* SMTP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.smtp.title')}</CardTitle>
            <CardDescription>{t('settings.smtp.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>{t('settings.smtp.provider')}</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SMTP_PROVIDERS.map((provider) => (
                  <Button
                    key={provider}
                    variant={smtp.provider === provider ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setSmtpProvider(provider)}
                  >
                    {t(`settings.smtp.providers.${provider}`)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">{t('settings.smtp.host')}</Label>
                <Input
                  id="smtpHost"
                  placeholder={t('settings.smtp.hostPlaceholder')}
                  value={smtp.host}
                  onChange={(e) => updateSmtp({ host: e.target.value })}
                  disabled={smtp.provider !== 'custom'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">{t('settings.smtp.port')}</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={smtp.port}
                  onChange={(e) => updateSmtp({ port: parseInt(e.target.value) })}
                  disabled={smtp.provider !== 'custom'}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpUsername">{t('settings.smtp.username')}</Label>
                <Input
                  id="smtpUsername"
                  placeholder={t('settings.smtp.usernamePlaceholder')}
                  value={smtp.username}
                  onChange={(e) => updateSmtp({ username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">{t('settings.smtp.password')}</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  placeholder={t('settings.smtp.passwordPlaceholder')}
                  value={smtp.password}
                  onChange={(e) => updateSmtp({ password: e.target.value })}
                />
              </div>
            </div>

            {smtp.provider === 'gmail' && (
              <p className="text-sm text-muted-foreground">
                {t('settings.smtp.hint.gmail')}
              </p>
            )}
            {smtp.provider === 'sendgrid' && (
              <p className="text-sm text-muted-foreground">
                {t('settings.smtp.hint.sendgrid')}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromEmail">{t('settings.smtp.fromEmail')}</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="hello@company.com"
                  value={smtp.fromEmail}
                  onChange={(e) => updateSmtp({ fromEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName">{t('settings.smtp.fromName')}</Label>
                <Input
                  id="fromName"
                  placeholder="Your Company"
                  value={smtp.fromName}
                  onChange={(e) => updateSmtp({ fromName: e.target.value })}
                />
              </div>
            </div>

            {/* Test Status */}
            {smtpTestStatus !== 'idle' && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg p-3',
                  smtpTestStatus === 'testing' && 'bg-blue-500/10 text-blue-600',
                  smtpTestStatus === 'success' && 'bg-green-500/10 text-green-600',
                  smtpTestStatus === 'failed' && 'bg-red-500/10 text-red-600'
                )}
              >
                {smtpTestStatus === 'testing' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('settings.smtp.testing')}
                  </>
                )}
                {smtpTestStatus === 'success' && (
                  <>
                    <Check className="h-4 w-4" />
                    {t('settings.smtp.testSuccess')}
                  </>
                )}
                {smtpTestStatus === 'failed' && (
                  <>
                    <X className="h-4 w-4" />
                    {t('settings.smtp.testFailed')}: {smtpTestError}
                  </>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={smtpTestStatus === 'testing' || !smtp.username || !smtp.password}
              >
                {smtpTestStatus === 'testing' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('settings.smtp.testConnection')}
              </Button>
              <Button onClick={handleSaveSmtp}>
                {t('settings.smtp.saveConfig')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sending Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.sending.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="batchSize">{t('settings.sending.batchSize')}</Label>
                <Input
                  id="batchSize"
                  type="number"
                  value={sending.batchSize}
                  onChange={(e) =>
                    updateSending({ batchSize: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.sending.batchSizeHint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delay">
                  {t('settings.sending.delayBetweenBatches')}
                </Label>
                <Input
                  id="delay"
                  type="number"
                  value={sending.delayBetweenBatches}
                  onChange={(e) =>
                    updateSending({ delayBetweenBatches: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.sending.delayHint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPerHour">
                  {t('settings.sending.maxPerHour')}
                </Label>
                <Input
                  id="maxPerHour"
                  type="number"
                  value={sending.maxPerHour}
                  onChange={(e) =>
                    updateSending({ maxPerHour: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.sending.maxPerHourHint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retryAttempts">
                  {t('settings.sending.retryAttempts')}
                </Label>
                <Input
                  id="retryAttempts"
                  type="number"
                  value={sending.retryAttempts}
                  onChange={(e) =>
                    updateSending({ retryAttempts: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.sending.retryAttemptsHint')}
                </p>
              </div>
            </div>

            {/* Toggle Options */}
            <div className="flex flex-wrap gap-4">
              <Button
                variant={sending.trackOpens ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSending({ trackOpens: !sending.trackOpens })}
              >
                {sending.trackOpens ? '✓ ' : ''}
                {t('settings.sending.trackOpens')}
              </Button>
              <Button
                variant={sending.trackClicks ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSending({ trackClicks: !sending.trackClicks })}
              >
                {sending.trackClicks ? '✓ ' : ''}
                {t('settings.sending.trackClicks')}
              </Button>
              <Button
                variant={sending.addUnsubscribeLink ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  updateSending({ addUnsubscribeLink: !sending.addUnsubscribeLink })
                }
              >
                {sending.addUnsubscribeLink ? '✓ ' : ''}
                {t('settings.sending.addUnsubscribeLink')}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSending}>{t('common.save')}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.appearance')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t('settings.theme')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                >
                  {t('settings.themes.light')}
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                >
                  {t('settings.themes.dark')}
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  onClick={() => setTheme('system')}
                >
                  {t('settings.themes.system')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.language')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={language === 'en' ? 'default' : 'outline'}
                  onClick={() => setLanguage('en')}
                >
                  {t('common.english')}
                </Button>
                <Button
                  variant={language === 'ar' ? 'default' : 'outline'}
                  onClick={() => setLanguage('ar')}
                >
                  {t('common.arabic')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
