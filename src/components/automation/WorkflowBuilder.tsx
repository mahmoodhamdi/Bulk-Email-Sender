'use client';

import React, { useState } from 'react';
import {
  useAutomationStore,
  type AutomationStep,
  type StepType,
  type TriggerType,
  type EmailStepConfig,
  type DelayStepConfig,
  type ConditionStepConfig,
  type ActionStepConfig,
} from '@/stores/automation-store';
import { useTranslations } from 'next-intl';

// Trigger node component
function TriggerNode() {
  const t = useTranslations('automation');
  const { currentAutomation, setTrigger } = useAutomationStore();
  const [showConfig, setShowConfig] = useState(false);

  if (!currentAutomation) return null;

  const triggerIcons: Record<TriggerType, React.ReactNode> = {
    signup: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    tag_added: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    date_field: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    manual: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
    email_opened: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
      </svg>
    ),
    link_clicked: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="flex items-center gap-3 p-4 bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 rounded-lg w-64 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
      >
        <div className="p-2 bg-purple-500 text-white rounded-lg">
          {triggerIcons[currentAutomation.trigger.type]}
        </div>
        <div className="text-left">
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            {t('trigger')}
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t(`triggers.${currentAutomation.trigger.type}`)}
          </div>
        </div>
      </button>

      {/* Trigger config modal */}
      {showConfig && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 w-72">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('selectTrigger')}
          </h4>
          <div className="space-y-2">
            {(['signup', 'tag_added', 'date_field', 'manual', 'email_opened', 'link_clicked'] as TriggerType[]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTrigger({ type });
                    setShowConfig(false);
                  }}
                  className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
                    currentAutomation.trigger.type === type
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {triggerIcons[type]}
                  <span className="text-sm">{t(`triggers.${type}`)}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Connection line down */}
      <div className="flex justify-center">
        <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
      </div>
    </div>
  );
}

// Step node component
function StepNode({ step, isSelected }: { step: AutomationStep; isSelected: boolean }) {
  const t = useTranslations('automation');
  const { selectStep, deleteStep, updateStep } = useAutomationStore();
  const [showConfig, setShowConfig] = useState(false);

  const stepIcons: Record<StepType, React.ReactNode> = {
    email: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    delay: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    condition: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    action: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  };

  const stepColors: Record<StepType, string> = {
    email: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500',
    delay: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500',
    condition: 'bg-orange-100 dark:bg-orange-900/30 border-orange-500',
    action: 'bg-green-100 dark:bg-green-900/30 border-green-500',
  };

  const iconColors: Record<StepType, string> = {
    email: 'bg-blue-500',
    delay: 'bg-yellow-500',
    condition: 'bg-orange-500',
    action: 'bg-green-500',
  };

  const getStepDescription = () => {
    switch (step.type) {
      case 'email':
        const emailConfig = step.config as EmailStepConfig;
        return emailConfig.subject || t('noSubject');
      case 'delay':
        const delayConfig = step.config as DelayStepConfig;
        return `${delayConfig.duration} ${t(`delayUnits.${delayConfig.unit}`)}`;
      case 'condition':
        const condConfig = step.config as ConditionStepConfig;
        return `${condConfig.field} ${condConfig.operator}`;
      case 'action':
        const actionConfig = step.config as ActionStepConfig;
        return t(`actions.${actionConfig.action}`);
      default:
        return '';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => selectStep(step.id)}
        className={`flex items-center gap-3 p-4 ${stepColors[step.type]} border-2 rounded-lg w-64 transition-all ${
          isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:opacity-90'
        }`}
      >
        <div className={`p-2 ${iconColors[step.type]} text-white rounded-lg`}>
          {stepIcons[step.type]}
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
            {t(`stepTypes.${step.type}`)}
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {step.name}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {getStepDescription()}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteStep(step.id);
          }}
          className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </button>

      {/* Connection line down */}
      {step.nextStepId && (
        <div className="flex justify-center">
          <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
        </div>
      )}

      {/* Condition branches */}
      {step.type === 'condition' && (
        <div className="flex justify-center gap-4 mt-2">
          <div className="text-center">
            <div className="text-xs text-green-600 font-medium mb-1">{t('yes')}</div>
            {step.trueStepId ? (
              <div className="w-0.5 h-8 bg-green-400 mx-auto" />
            ) : (
              <button className="w-8 h-8 border-2 border-dashed border-green-400 rounded-full flex items-center justify-center text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
          <div className="text-center">
            <div className="text-xs text-red-600 font-medium mb-1">{t('no')}</div>
            {step.falseStepId ? (
              <div className="w-0.5 h-8 bg-red-400 mx-auto" />
            ) : (
              <button className="w-8 h-8 border-2 border-dashed border-red-400 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Add step button
function AddStepButton() {
  const t = useTranslations('automation');
  const { addStep, currentAutomation } = useAutomationStore();
  const [showMenu, setShowMenu] = useState(false);

  if (!currentAutomation) return null;

  const lastStepId = currentAutomation.steps[currentAutomation.steps.length - 1]?.id;

  return (
    <div className="relative flex justify-center">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-10 h-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute top-full mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 w-48">
          <h4 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
            {t('addStep')}
          </h4>
          {(['email', 'delay', 'condition', 'action'] as StepType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                addStep(type, lastStepId);
                setShowMenu(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {t(`stepTypes.${type}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Main workflow builder
export function WorkflowBuilder() {
  const t = useTranslations('automation');
  const { currentAutomation, selectedStepId } = useAutomationStore();

  if (!currentAutomation) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">{t('noAutomationLoaded')}</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[500px] overflow-auto">
      <div className="flex flex-col items-center gap-2">
        {/* Trigger */}
        <TriggerNode />

        {/* Steps */}
        {currentAutomation.steps.map((step) => (
          <StepNode
            key={step.id}
            step={step}
            isSelected={selectedStepId === step.id}
          />
        ))}

        {/* Add step button */}
        <AddStepButton />
      </div>
    </div>
  );
}
