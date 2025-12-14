'use client';

import {
  useAutomationStore,
  type AutomationStep,
  type EmailStepConfig,
  type DelayStepConfig,
  type ConditionStepConfig,
  type ActionStepConfig,
  type DelayUnit,
  type ConditionOperator,
  type ActionType,
} from '@/stores/automation-store';
import { useTranslations } from 'next-intl';

// Email step config
function EmailConfig({ step }: { step: AutomationStep }) {
  const t = useTranslations('automation');
  const { updateStep } = useAutomationStore();
  const config = step.config as EmailStepConfig;

  const handleChange = (field: keyof EmailStepConfig, value: string) => {
    updateStep(step.id, {
      config: { ...config, [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('stepName')}
        </label>
        <input
          type="text"
          value={step.name}
          onChange={(e) => updateStep(step.id, { name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('subject')}
        </label>
        <input
          type="text"
          value={config.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder={t('subjectPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('template')}
        </label>
        <select
          value={config.templateId}
          onChange={(e) => handleChange('templateId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">{t('selectTemplate')}</option>
          <option value="tpl_welcome">Welcome Template</option>
          <option value="tpl_getting_started">Getting Started Guide</option>
          <option value="tpl_newsletter">Newsletter Template</option>
          <option value="tpl_promo">Promotional Template</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('fromName')} ({t('optional')})
        </label>
        <input
          type="text"
          value={config.fromName || ''}
          onChange={(e) => handleChange('fromName', e.target.value)}
          placeholder={t('defaultFromSettings')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('fromEmail')} ({t('optional')})
        </label>
        <input
          type="email"
          value={config.fromEmail || ''}
          onChange={(e) => handleChange('fromEmail', e.target.value)}
          placeholder={t('defaultFromSettings')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  );
}

// Delay step config
function DelayConfig({ step }: { step: AutomationStep }) {
  const t = useTranslations('automation');
  const { updateStep } = useAutomationStore();
  const config = step.config as DelayStepConfig;

  const handleDurationChange = (value: number) => {
    updateStep(step.id, {
      config: { ...config, duration: value },
      name: `Wait ${value} ${t(`delayUnits.${config.unit}`)}`,
    });
  };

  const handleUnitChange = (unit: DelayUnit) => {
    updateStep(step.id, {
      config: { ...config, unit },
      name: `Wait ${config.duration} ${t(`delayUnits.${unit}`)}`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('stepName')}
        </label>
        <input
          type="text"
          value={step.name}
          onChange={(e) => updateStep(step.id, { name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('waitDuration')}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={config.duration}
            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <select
            value={config.unit}
            onChange={(e) => handleUnitChange(e.target.value as DelayUnit)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="minutes">{t('delayUnits.minutes')}</option>
            <option value="hours">{t('delayUnits.hours')}</option>
            <option value="days">{t('delayUnits.days')}</option>
            <option value="weeks">{t('delayUnits.weeks')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Condition step config
function ConditionConfig({ step }: { step: AutomationStep }) {
  const t = useTranslations('automation');
  const { updateStep } = useAutomationStore();
  const config = step.config as ConditionStepConfig;

  const handleChange = (field: keyof ConditionStepConfig, value: string) => {
    updateStep(step.id, {
      config: { ...config, [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('stepName')}
        </label>
        <input
          type="text"
          value={step.name}
          onChange={(e) => updateStep(step.id, { name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('conditionField')}
        </label>
        <select
          value={config.field}
          onChange={(e) => handleChange('field', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="email_opened">{t('fields.emailOpened')}</option>
          <option value="link_clicked">{t('fields.linkClicked')}</option>
          <option value="has_tag">{t('fields.hasTag')}</option>
          <option value="custom_field">{t('fields.customField')}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('operator')}
        </label>
        <select
          value={config.operator}
          onChange={(e) => handleChange('operator', e.target.value as ConditionOperator)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="equals">{t('operators.equals')}</option>
          <option value="not_equals">{t('operators.notEquals')}</option>
          <option value="contains">{t('operators.contains')}</option>
          <option value="not_contains">{t('operators.notContains')}</option>
          <option value="exists">{t('operators.exists')}</option>
          <option value="not_exists">{t('operators.notExists')}</option>
        </select>
      </div>

      {!['exists', 'not_exists'].includes(config.operator) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('value')}
          </label>
          <input
            type="text"
            value={config.value || ''}
            onChange={(e) => handleChange('value', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}
    </div>
  );
}

// Action step config
function ActionConfig({ step }: { step: AutomationStep }) {
  const t = useTranslations('automation');
  const { updateStep } = useAutomationStore();
  const config = step.config as ActionStepConfig;

  const handleChange = (field: keyof ActionStepConfig, value: string) => {
    updateStep(step.id, {
      config: { ...config, [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('stepName')}
        </label>
        <input
          type="text"
          value={step.name}
          onChange={(e) => updateStep(step.id, { name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('action')}
        </label>
        <select
          value={config.action}
          onChange={(e) => handleChange('action', e.target.value as ActionType)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="add_tag">{t('actions.add_tag')}</option>
          <option value="remove_tag">{t('actions.remove_tag')}</option>
          <option value="update_field">{t('actions.update_field')}</option>
          <option value="add_to_segment">{t('actions.add_to_segment')}</option>
          <option value="webhook">{t('actions.webhook')}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {config.action === 'webhook' ? t('webhookUrl') : t('target')}
        </label>
        <input
          type={config.action === 'webhook' ? 'url' : 'text'}
          value={config.target}
          onChange={(e) => handleChange('target', e.target.value)}
          placeholder={config.action === 'webhook' ? 'https://...' : t('enterTarget')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {config.action === 'update_field' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('newValue')}
          </label>
          <input
            type="text"
            value={config.value || ''}
            onChange={(e) => handleChange('value', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}
    </div>
  );
}

// Main panel
export function StepConfigPanel() {
  const t = useTranslations('automation');
  const { selectedStepId, getStepById, selectStep, deleteStep } = useAutomationStore();

  const step = selectedStepId ? getStepById(selectedStepId) : null;

  if (!step) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {t('selectStepToConfig')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('configureStep')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => deleteStep(step.id)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            title={t('deleteStep')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => selectStep(null)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {step.type === 'email' && <EmailConfig step={step} />}
      {step.type === 'delay' && <DelayConfig step={step} />}
      {step.type === 'condition' && <ConditionConfig step={step} />}
      {step.type === 'action' && <ActionConfig step={step} />}
    </div>
  );
}
