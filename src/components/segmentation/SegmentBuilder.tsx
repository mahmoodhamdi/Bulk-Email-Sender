'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  useSegmentationStore,
  fieldMetadata,
  operatorLabels,
  type ConditionField,
  type ConditionOperator,
} from '@/stores/segmentation-store';
import { cn } from '@/lib/utils';

interface SegmentBuilderProps {
  onSave?: () => void;
}

export function SegmentBuilder({ onSave }: SegmentBuilderProps) {
  const t = useTranslations();
  const {
    currentSegment,
    createSegment,
    updateSegment,
    addGroup,
    removeGroup,
    addCondition,
    updateCondition,
    removeCondition,
    setGroupLogic,
    setSegmentLogic,
    saveSegment,
    refreshPreview,
    previewContacts,
    isLoadingPreview,
  } = useSegmentationStore();

  React.useEffect(() => {
    if (!currentSegment) {
      createSegment();
    }
  }, [currentSegment, createSegment]);

  const handleSave = () => {
    saveSegment();
    onSave?.();
  };

  if (!currentSegment) return null;

  const fields = Object.entries(fieldMetadata) as [ConditionField, typeof fieldMetadata[ConditionField]][];

  return (
    <div className="space-y-6">
      {/* Segment Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="segmentName">{t('segmentation.segmentName')}</Label>
          <Input
            id="segmentName"
            value={currentSegment.name}
            onChange={(e) => updateSegment({ name: e.target.value })}
            placeholder={t('segmentation.segmentNamePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="segmentDesc">{t('segmentation.description')}</Label>
          <Input
            id="segmentDesc"
            value={currentSegment.description}
            onChange={(e) => updateSegment({ description: e.target.value })}
            placeholder={t('segmentation.descriptionPlaceholder')}
          />
        </div>
      </div>

      {/* Condition Groups */}
      <div className="space-y-4">
        {currentSegment.groups.map((group, groupIndex) => (
          <React.Fragment key={group.id}>
            {groupIndex > 0 && (
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2">
                  <button
                    onClick={() => setSegmentLogic('AND')}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                      currentSegment.logic === 'AND'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setSegmentLogic('OR')}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                      currentSegment.logic === 'OR'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    OR
                  </button>
                </div>
              </div>
            )}

            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {t('segmentation.conditionGroup')} {groupIndex + 1}
                  </CardTitle>
                  {currentSegment.groups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGroup(group.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.conditions.map((condition, conditionIndex) => (
                  <React.Fragment key={condition.id}>
                    {conditionIndex > 0 && (
                      <div className="flex items-center gap-2 pl-4">
                        <button
                          onClick={() => setGroupLogic(group.id, 'AND')}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                            group.logic === 'AND'
                              ? 'bg-blue-500 text-white'
                              : 'bg-muted hover:bg-muted-foreground/20'
                          )}
                        >
                          AND
                        </button>
                        <button
                          onClick={() => setGroupLogic(group.id, 'OR')}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                            group.logic === 'OR'
                              ? 'bg-green-500 text-white'
                              : 'bg-muted hover:bg-muted-foreground/20'
                          )}
                        >
                          OR
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
                      {/* Field Select */}
                      <select
                        value={condition.field}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            field: e.target.value as ConditionField,
                            operator: fieldMetadata[e.target.value as ConditionField].operators[0],
                            value: '',
                          })
                        }
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        {fields.map(([field, meta]) => (
                          <option key={field} value={field}>
                            {meta.label}
                          </option>
                        ))}
                      </select>

                      {/* Operator Select */}
                      <select
                        value={condition.operator}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            operator: e.target.value as ConditionOperator,
                          })
                        }
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        {fieldMetadata[condition.field].operators.map((op) => (
                          <option key={op} value={op}>
                            {operatorLabels[op]}
                          </option>
                        ))}
                      </select>

                      {/* Value Input */}
                      {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
                        <>
                          {condition.operator === 'inLast' || condition.operator === 'notInLast' ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={condition.value as number}
                                onChange={(e) =>
                                  updateCondition(group.id, condition.id, {
                                    value: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="h-9 w-20"
                                min="1"
                              />
                              <span className="text-sm text-muted-foreground">
                                {t('segmentation.days')}
                              </span>
                            </div>
                          ) : condition.operator === 'between' ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type={fieldMetadata[condition.field].type === 'date' ? 'date' : 'text'}
                                value={condition.value as string}
                                onChange={(e) =>
                                  updateCondition(group.id, condition.id, {
                                    value: e.target.value,
                                  })
                                }
                                className="h-9 w-32"
                              />
                              <span className="text-sm">and</span>
                              <Input
                                type={fieldMetadata[condition.field].type === 'date' ? 'date' : 'text'}
                                value={condition.secondValue as string}
                                onChange={(e) =>
                                  updateCondition(group.id, condition.id, {
                                    secondValue: e.target.value,
                                  })
                                }
                                className="h-9 w-32"
                              />
                            </div>
                          ) : condition.field === 'status' ? (
                            <select
                              value={condition.value as string}
                              onChange={(e) =>
                                updateCondition(group.id, condition.id, {
                                  value: e.target.value,
                                })
                              }
                              className="h-9 rounded-md border bg-background px-3 text-sm"
                            >
                              <option value="active">{t('contacts.status.active')}</option>
                              <option value="unsubscribed">{t('contacts.status.unsubscribed')}</option>
                              <option value="bounced">{t('contacts.status.bounced')}</option>
                              <option value="complained">{t('contacts.status.complained')}</option>
                            </select>
                          ) : fieldMetadata[condition.field].type === 'percentage' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={condition.value as number}
                                onChange={(e) =>
                                  updateCondition(group.id, condition.id, {
                                    value: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="h-9 w-20"
                                min="0"
                                max="100"
                              />
                              <span className="text-sm">%</span>
                            </div>
                          ) : (
                            <Input
                              type={fieldMetadata[condition.field].type === 'date' ? 'date' : 'text'}
                              value={condition.value as string}
                              onChange={(e) =>
                                updateCondition(group.id, condition.id, {
                                  value: e.target.value,
                                })
                              }
                              className="h-9 flex-1"
                              placeholder={t('segmentation.enterValue')}
                            />
                          )}
                        </>
                      )}

                      {/* Remove Condition */}
                      {group.conditions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(group.id, condition.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </React.Fragment>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCondition(group.id)}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('segmentation.addCondition')}
                </Button>
              </CardContent>
            </Card>
          </React.Fragment>
        ))}
      </div>

      {/* Add Group Button */}
      <Button variant="outline" onClick={addGroup} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {t('segmentation.addGroup')}
      </Button>

      {/* Preview Section */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('segmentation.preview')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPreview}
              disabled={isLoadingPreview}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoadingPreview && 'animate-spin')} />
              {t('segmentation.refreshPreview')}
            </Button>
          </div>
          <CardDescription>
            {previewContacts.length} {t('segmentation.contactsMatch')}
          </CardDescription>
        </CardHeader>
        {previewContacts.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {previewContacts.slice(0, 10).map((email) => (
                <span
                  key={email}
                  className="rounded-full bg-muted px-3 py-1 text-sm"
                >
                  {email}
                </span>
              ))}
              {previewContacts.length > 10 && (
                <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                  +{previewContacts.length - 10} {t('segmentation.more')}
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleSave}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
