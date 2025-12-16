'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Send, Palette, Code, FlaskConical, Users, List, Filter, Calendar, Loader2 } from 'lucide-react';
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
import { useCampaignStore, type CampaignDraft } from '@/stores/campaign-store';
import { useSegmentationStore } from '@/stores/segmentation-store';
import { useScheduleStore } from '@/stores/schedule-store';
import { SegmentList } from '@/components/segmentation/SegmentList';
import { ScheduleSelector, ScheduleSummary } from '@/components/campaign/ScheduleSelector';
import { cn } from '@/lib/utils';
import { sanitizeEmailPreview } from '@/lib/crypto';
import { useCsrf } from '@/hooks/useCsrf';

const STEPS = ['setup', 'content', 'recipients', 'review'] as const;

export default function NewCampaignPage() {
  const t = useTranslations();
  const router = useRouter();
  const { csrfFetch } = useCsrf();
  const {
    currentStep,
    draft,
    errors,
    updateDraft,
    nextStep,
    prevStep,
    setStep,
    resetDraft,
    setError,
  } = useCampaignStore();
  const { sendNow, getScheduledDateTimeUTC } = useScheduleStore();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Create campaign
      const campaignResponse = await csrfFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: draft.name,
          subject: draft.subject,
          fromName: draft.fromName,
          fromEmail: draft.fromEmail,
          replyTo: draft.replyTo || null,
          content: draft.content,
          contentType: 'html',
          templateId: draft.templateId,
        }),
      });

      const campaignData = await campaignResponse.json();

      if (!campaignResponse.ok) {
        throw new Error(campaignData.error || 'Failed to save campaign');
      }

      // Add recipients if any
      if (draft.recipients.length > 0 || draft.listIds.length > 0) {
        const recipientsResponse = await csrfFetch(
          `/api/campaigns/${campaignData.data.id}/recipients`,
          {
            method: 'POST',
            body: JSON.stringify({
              emails: draft.recipients,
              listIds: draft.listIds.length > 0 ? draft.listIds : undefined,
            }),
          }
        );

        if (!recipientsResponse.ok) {
          const recipientError = await recipientsResponse.json();
          console.error('Failed to add recipients:', recipientError);
        }
      }

      alert(t('campaign.actions.draftSaved'));
      router.push('/campaigns');
    } catch (error) {
      console.error('Error saving draft:', error);
      setError('general', error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendCampaign = async () => {
    setIsSending(true);
    const scheduledDateTime = getScheduledDateTimeUTC();
    try {
      // First create the campaign
      const campaignResponse = await csrfFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: draft.name,
          subject: draft.subject,
          fromName: draft.fromName,
          fromEmail: draft.fromEmail,
          replyTo: draft.replyTo || null,
          content: draft.content,
          contentType: 'html',
          templateId: draft.templateId,
          scheduledAt: !sendNow && scheduledDateTime ? scheduledDateTime.toISOString() : null,
        }),
      });

      const campaignData = await campaignResponse.json();

      if (!campaignResponse.ok) {
        throw new Error(campaignData.error || 'Failed to create campaign');
      }

      const campaignId = campaignData.data.id;

      // Add recipients
      if (draft.recipients.length > 0 || draft.listIds.length > 0) {
        const recipientsResponse = await csrfFetch(
          `/api/campaigns/${campaignId}/recipients`,
          {
            method: 'POST',
            body: JSON.stringify({
              emails: draft.recipients,
              listIds: draft.listIds.length > 0 ? draft.listIds : undefined,
            }),
          }
        );

        if (!recipientsResponse.ok) {
          const recipientError = await recipientsResponse.json();
          throw new Error(recipientError.error || 'Failed to add recipients');
        }
      }

      // Send the campaign (or schedule it)
      const sendResponse = await csrfFetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          scheduledAt: !sendNow && scheduledDateTime ? scheduledDateTime.toISOString() : undefined,
        }),
      });

      const sendData = await sendResponse.json();

      if (!sendResponse.ok) {
        throw new Error(sendData.error || 'Failed to send campaign');
      }

      alert(sendNow ? t('campaign.review.sent') : t('campaign.review.scheduled'));
      resetDraft();
      router.push('/campaigns');
    } catch (error) {
      console.error('Error sending campaign:', error);
      setError('general', error instanceof Error ? error.message : 'Failed to send campaign');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PageLayout
      title={t('campaign.create.title')}
      subtitle={t('campaign.create.subtitle')}
      actions={
        <Button variant="outline" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>
      }
    >
      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => index < currentStep && setStep(index)}
                disabled={index > currentStep}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  index < currentStep
                    ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </button>
              <span className="ml-2 hidden text-sm font-medium sm:inline">
                {t(`campaign.steps.${step}`)}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-px w-8 sm:mx-4 sm:w-12',
                    index < currentStep ? 'bg-green-500' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mx-auto max-w-2xl">
        {currentStep === 0 && (
          <SetupStep
            draft={draft}
            errors={errors}
            updateDraft={updateDraft}
            t={t}
          />
        )}
        {currentStep === 1 && (
          <ContentStep
            draft={draft}
            errors={errors}
            updateDraft={updateDraft}
            t={t}
          />
        )}
        {currentStep === 2 && (
          <RecipientsStep
            draft={draft}
            errors={errors}
            updateDraft={updateDraft}
            t={t}
          />
        )}
        {currentStep === 3 && <ReviewStep draft={draft} t={t} />}

        {/* Error Display */}
        {errors.general && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between gap-4">
          <div>
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep} disabled={isSaving || isSending}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.previous')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving || isSending}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('campaign.actions.saveDraft')
              )}
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={nextStep} disabled={isSaving || isSending}>
                {t('common.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSendCampaign} disabled={isSaving || isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.sending')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('campaign.actions.send')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// Step 1: Setup
function SetupStep({
  draft,
  errors,
  updateDraft,
  t,
}: {
  draft: CampaignDraft;
  errors: Record<string, string>;
  updateDraft: (data: Partial<CampaignDraft>) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('campaign.setup.title')}</CardTitle>
        <CardDescription>{t('campaign.create.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">{t('campaign.setup.campaignName')}</Label>
          <Input
            id="name"
            placeholder={t('campaign.setup.campaignNamePlaceholder')}
            value={draft.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('campaign.setup.campaignNameHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">{t('campaign.setup.subject')}</Label>
          <Input
            id="subject"
            placeholder={t('campaign.setup.subjectPlaceholder')}
            value={draft.subject}
            onChange={(e) => updateDraft({ subject: e.target.value })}
            className={errors.subject ? 'border-red-500' : ''}
          />
          {errors.subject && (
            <p className="text-sm text-red-500">{errors.subject}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('campaign.setup.subjectHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="previewText">{t('campaign.setup.previewText')}</Label>
          <Input
            id="previewText"
            placeholder={t('campaign.setup.previewTextPlaceholder')}
            value={draft.previewText}
            onChange={(e) => updateDraft({ previewText: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            {t('campaign.setup.previewTextHint')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fromName">{t('campaign.setup.fromName')}</Label>
            <Input
              id="fromName"
              placeholder={t('campaign.setup.fromNamePlaceholder')}
              value={draft.fromName}
              onChange={(e) => updateDraft({ fromName: e.target.value })}
              className={errors.fromName ? 'border-red-500' : ''}
            />
            {errors.fromName && (
              <p className="text-sm text-red-500">{errors.fromName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromEmail">{t('campaign.setup.fromEmail')}</Label>
            <Input
              id="fromEmail"
              type="email"
              placeholder={t('campaign.setup.fromEmailPlaceholder')}
              value={draft.fromEmail}
              onChange={(e) => updateDraft({ fromEmail: e.target.value })}
              className={errors.fromEmail ? 'border-red-500' : ''}
            />
            {errors.fromEmail && (
              <p className="text-sm text-red-500">{errors.fromEmail}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="replyTo">{t('campaign.setup.replyTo')}</Label>
          <Input
            id="replyTo"
            type="email"
            placeholder={t('campaign.setup.replyToPlaceholder')}
            value={draft.replyTo}
            onChange={(e) => updateDraft({ replyTo: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            {t('campaign.setup.replyToHint')}
          </p>
        </div>

        {/* A/B Testing Toggle */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="text-base font-medium">
                  {t('abTest.enableABTest')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('abTest.enableABTestDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateDraft({ enableABTest: !draft.enableABTest })}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                draft.enableABTest ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm',
                  draft.enableABTest && 'translate-x-5'
                )}
              />
            </button>
          </div>
          {draft.enableABTest && (
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/campaigns/new/ab-test`}>
                  <FlaskConical className="mr-2 h-4 w-4" />
                  {t('abTest.settings')}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Step 2: Content
function ContentStep({
  draft,
  errors,
  updateDraft,
  t,
}: {
  draft: CampaignDraft;
  errors: Record<string, string>;
  updateDraft: (data: Partial<CampaignDraft>) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [editorMode, setEditorMode] = React.useState<'visual' | 'code'>(
    draft.content ? 'code' : 'visual'
  );

  const mergeTags = [
    'firstName',
    'lastName',
    'email',
    'company',
    'customField1',
    'customField2',
    'unsubscribeLink',
    'date',
  ];

  const insertMergeTag = (tag: string) => {
    updateDraft({ content: draft.content + `{{${tag}}}` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('campaign.content.title')}</CardTitle>
        <CardDescription>{t('campaign.content.mergeTagsHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Editor Mode Selector */}
        <div className="flex gap-2">
          <Button
            variant={editorMode === 'visual' ? 'default' : 'outline'}
            onClick={() => setEditorMode('visual')}
            className="flex-1"
          >
            <Palette className="mr-2 h-4 w-4" />
            {t('campaign.content.visualBuilder')}
          </Button>
          <Button
            variant={editorMode === 'code' ? 'default' : 'outline'}
            onClick={() => setEditorMode('code')}
            className="flex-1"
          >
            <Code className="mr-2 h-4 w-4" />
            {t('campaign.content.codeEditor')}
          </Button>
        </div>

        {editorMode === 'visual' ? (
          /* Visual Builder Option */
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center">
            <Palette className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('campaign.content.dragDropBuilder')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('campaign.content.dragDropBuilderDesc')}
            </p>
            <Button asChild>
              <Link href="/templates/builder">
                <Palette className="mr-2 h-4 w-4" />
                {t('campaign.content.openBuilder')}
              </Link>
            </Button>
            {draft.content && (
              <p className="mt-4 text-sm text-green-600">
                ✓ {t('campaign.content.contentLoaded')}
              </p>
            )}
          </div>
        ) : (
          /* Code Editor */
          <>
            {/* Merge Tags */}
            <div className="space-y-2">
              <Label>{t('campaign.content.mergeTags')}</Label>
              <div className="flex flex-wrap gap-2">
                {mergeTags.map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => insertMergeTag(tag)}
                  >
                    {`{{${tag}}}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
              <Label htmlFor="content">{t('campaign.content.editor')}</Label>
              <textarea
                id="content"
                className={cn(
                  'min-h-[300px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono',
                  errors.content ? 'border-red-500' : 'border-input'
                )}
                placeholder="<html><body><h1>Hello {{firstName}}!</h1><p>Your email content here...</p></body></html>"
                value={draft.content}
                onChange={(e) => updateDraft({ content: e.target.value })}
              />
              {errors.content && (
                <p className="text-sm text-red-500">{errors.content}</p>
              )}
            </div>
          </>
        )}

        {/* Preview */}
        {draft.content && (
          <div className="space-y-2">
            <Label>{t('campaign.content.preview')}</Label>
            <div className="rounded-md border bg-white p-4 max-h-64 overflow-y-auto">
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeEmailPreview(draft.content),
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Step 3: Recipients
function RecipientsStep({
  draft,
  errors,
  updateDraft,
  t,
}: {
  draft: CampaignDraft;
  errors: Record<string, string>;
  updateDraft: (data: Partial<CampaignDraft>) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { segments } = useSegmentationStore();
  const selectedSegment = segments.find((s) => s.id === draft.segmentId);

  const handlePasteEmails = (text: string) => {
    const emails = text
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    updateDraft({ recipients: [...new Set([...draft.recipients, ...emails])] });
  };

  const removeRecipient = (email: string) => {
    updateDraft({ recipients: draft.recipients.filter((e) => e !== email) });
  };

  const recipientSources = [
    { id: 'manual' as const, icon: Users, label: t('campaign.recipients.manualEntry') },
    { id: 'segment' as const, icon: Filter, label: t('campaign.recipients.fromSegment') },
    { id: 'list' as const, icon: List, label: t('campaign.recipients.fromList') },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('campaign.recipients.title')}</CardTitle>
        <CardDescription>
          {t('campaign.recipients.selectSource')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recipient Source Selector */}
        <div className="grid gap-3 sm:grid-cols-3">
          {recipientSources.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => updateDraft({
                recipientSource: id,
                segmentId: id === 'segment' ? draft.segmentId : null,
              })}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                draft.recipientSource === id
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/50'
              )}
            >
              <Icon className={cn(
                'h-6 w-6',
                draft.recipientSource === id ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'text-sm font-medium',
                draft.recipientSource === id ? 'text-primary' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {errors.recipients && (
          <p className="text-sm text-red-500">{errors.recipients}</p>
        )}

        {/* Manual Entry */}
        {draft.recipientSource === 'manual' && (
          <>
            <div className="space-y-2">
              <Label>{t('campaign.recipients.pasteEmails')}</Label>
              <textarea
                className={cn(
                  'min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  errors.recipients ? 'border-red-500' : 'border-input'
                )}
                placeholder={t('campaign.recipients.pasteEmailsPlaceholder')}
                onBlur={(e) => {
                  if (e.target.value) {
                    handlePasteEmails(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>

            {draft.recipients.length > 0 && (
              <div className="space-y-2">
                <Label>
                  {t('campaign.recipients.totalRecipients')}: {draft.recipients.length}
                </Label>
                <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                  <div className="flex flex-wrap gap-2">
                    {draft.recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
                      >
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateDraft({ recipients: [] })}
                >
                  {t('common.clear')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Segment Selection */}
        {draft.recipientSource === 'segment' && (
          <div className="space-y-4">
            {segments.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center">
                <Filter className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t('campaign.recipients.noSegments')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('campaign.recipients.noSegmentsDesc')}
                </p>
                <Button asChild>
                  <Link href="/contacts/segments">
                    <Filter className="mr-2 h-4 w-4" />
                    {t('campaign.recipients.createSegment')}
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <Label>{t('campaign.recipients.selectSegment')}</Label>
                <SegmentList
                  selectable
                  selectedId={draft.segmentId || undefined}
                  onSelect={(segment) => updateDraft({ segmentId: segment.id })}
                />
                {selectedSegment && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedSegment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedSegment.contactCount} {t('segmentation.contacts')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateDraft({ segmentId: null })}
                      >
                        {t('common.clear')}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Contact List Selection (placeholder for future) */}
        {draft.recipientSource === 'list' && (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center">
            <List className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('campaign.recipients.selectFromLists')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('campaign.recipients.selectFromListsDesc')}
            </p>
            <Button asChild>
              <Link href="/contacts">
                <List className="mr-2 h-4 w-4" />
                {t('campaign.recipients.manageLists')}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Step 4: Review
function ReviewStep({
  draft,
  t,
}: {
  draft: CampaignDraft;
  t: ReturnType<typeof useTranslations>;
}) {
  const { segments } = useSegmentationStore();
  const selectedSegment = segments.find((s) => s.id === draft.segmentId);

  // Calculate recipient count based on source
  const getRecipientCount = () => {
    if (draft.recipientSource === 'segment' && selectedSegment) {
      return selectedSegment.contactCount;
    }
    if (draft.recipientSource === 'list' && draft.listIds.length > 0) {
      // Placeholder for list contact count
      return draft.listIds.length * 100; // Mock number
    }
    return draft.recipients.length;
  };

  const recipientCount = getRecipientCount();

  // Get recipient source description
  const getRecipientSourceDesc = () => {
    if (draft.recipientSource === 'segment' && selectedSegment) {
      return `${t('campaign.recipients.fromSegment')}: ${selectedSegment.name}`;
    }
    if (draft.recipientSource === 'list') {
      return `${t('campaign.recipients.fromList')}: ${draft.listIds.length} ${t('contacts.lists.title').toLowerCase()}`;
    }
    return t('campaign.recipients.manualEntry');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('campaign.review.title')}</CardTitle>
          <CardDescription>{t('campaign.review.summary')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Details */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 font-semibold">
              {t('campaign.review.campaignDetails')}
            </h3>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t('campaign.setup.campaignName')}:
                </dt>
                <dd className="font-medium">{draft.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t('campaign.setup.subject')}:
                </dt>
                <dd className="font-medium">{draft.subject}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t('campaign.setup.fromName')}:
                </dt>
                <dd className="font-medium">{draft.fromName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t('campaign.setup.fromEmail')}:
                </dt>
                <dd className="font-medium">{draft.fromEmail}</dd>
              </div>
              {draft.enableABTest && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t('abTest.title')}:
                  </dt>
                  <dd className="font-medium text-primary">
                    {t('common.yes')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Recipients Summary */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 font-semibold">
              {t('campaign.review.recipientsSummary')}
            </h3>
            <p className="text-2xl font-bold text-primary">
              {recipientCount}
            </p>
            <p className="text-sm text-muted-foreground">
              {getRecipientSourceDesc()}
            </p>
          </div>

          {/* Content Preview */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 font-semibold">
              {t('campaign.review.contentPreview')}
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-md bg-muted p-4">
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeEmailPreview(draft.content.substring(0, 500) + '...'),
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Selector */}
      <ScheduleSelector />

      {/* Confirmation */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">
                  {t('campaign.review.confirmSendMessage', {
                    count: recipientCount,
                  })}
                </p>
                <ScheduleSummary className="mt-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
