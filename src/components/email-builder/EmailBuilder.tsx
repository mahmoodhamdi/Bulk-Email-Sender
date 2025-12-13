'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Code, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlockPalette } from './BlockPalette';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { useEmailBuilderStore } from '@/stores/email-builder-store';
import { useCampaignStore } from '@/stores/campaign-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface EmailBuilderProps {
  onSave?: (html: string) => void;
  onBack?: () => void;
  showBackToCampaign?: boolean;
}

export function EmailBuilder({
  onSave,
  onBack,
  showBackToCampaign = true,
}: EmailBuilderProps) {
  const t = useTranslations();
  const router = useRouter();
  const { template, generateHtml, resetTemplate } = useEmailBuilderStore();
  const { updateDraft } = useCampaignStore();

  const handleSave = () => {
    const html = generateHtml();
    if (onSave) {
      onSave(html);
    }
    // Also update campaign draft
    updateDraft({ content: html });
    alert(t('templates.templateSaved'));
  };

  const handleUseInCampaign = () => {
    const html = generateHtml();
    updateDraft({ content: html });
    router.push('/campaigns/new');
  };

  const generatedHtml = generateHtml();

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-4">
          {showBackToCampaign && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/templates">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Link>
            </Button>
          )}
          <Input
            value={template.name}
            onChange={(e) =>
              useEmailBuilderStore.setState({
                template: { ...template, name: e.target.value },
              })
            }
            className="h-8 w-64 font-medium"
            placeholder="Template name..."
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Preview HTML */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Code className="mr-2 h-4 w-4" />
                View HTML
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Generated HTML</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto">
                <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto">
                  <code>{generatedHtml}</code>
                </pre>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedHtml);
                    alert(t('common.copied'));
                  }}
                >
                  {t('common.copy')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Preview */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                {t('campaign.content.preview')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Email Preview</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto bg-gray-100 p-4">
                <iframe
                  srcDoc={generatedHtml}
                  className="w-full min-h-[500px] bg-white mx-auto"
                  style={{ maxWidth: '600px' }}
                  title="Email Preview"
                />
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {t('common.save')}
          </Button>

          <Button size="sm" onClick={handleUseInCampaign}>
            <Send className="mr-2 h-4 w-4" />
            Use in Campaign
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <BlockPalette />
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  );
}
