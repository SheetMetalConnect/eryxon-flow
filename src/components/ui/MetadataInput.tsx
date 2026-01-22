import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, FileText, Sparkles } from 'lucide-react';
import {
  MetadataTemplate,
  MetadataFieldDefinition,
  BaseMetadata,
  METADATA_TEMPLATES,
  getTemplatesByCategory,
  getTemplatesByResourceType,
  getTemplatesByProcessType,
} from '@/types/metadata';

interface MetadataInputProps {
  value: BaseMetadata;
  onChange: (metadata: BaseMetadata) => void;
  category?: 'job' | 'part' | 'operation' | 'resource';
  resourceType?: string;
  processType?: string;
  label?: string;
  description?: string;
}

export function MetadataInput({
  value = {},
  onChange,
  category,
  resourceType,
  processType,
  label = 'Custom Metadata',
  description,
}: MetadataInputProps) {
  const [activeTab, setActiveTab] = useState<'template' | 'manual'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState('');
  const [manualValue, setManualValue] = useState('');

  // Get available templates based on context
  const availableTemplates = React.useMemo(() => {
    let templates = METADATA_TEMPLATES;

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    if (resourceType) {
      const resourceTemplates = getTemplatesByResourceType(resourceType);
      if (resourceTemplates.length > 0) {
        templates = resourceTemplates;
      }
    }

    if (processType) {
      const processTemplates = getTemplatesByProcessType(processType);
      if (processTemplates.length > 0) {
        templates = processTemplates;
      }
    }

    return templates;
  }, [category, resourceType, processType]);

  // Load template when selected
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = METADATA_TEMPLATES.find(t => t.id === templateId);

    if (template && template.defaultValues) {
      onChange({ ...value, ...template.defaultValues });
    }
  };

  // Get current template if one is selected
  const currentTemplate = selectedTemplate
    ? METADATA_TEMPLATES.find(t => t.id === selectedTemplate)
    : null;

  // Render field based on type
  const renderField = (field: MetadataFieldDefinition) => {
    const fieldValue = value[field.key];
    const fieldId = `metadata-${field.key}`;

    const handleChange = (newValue: any) => {
      onChange({
        ...value,
        [field.key]: newValue,
      });
    };

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
            </Label>
            <Textarea
              id={fieldId}
              value={fieldValue as string || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={3}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
            </Label>
            <Input
              id={fieldId}
              type="number"
              value={fieldValue as number || ''}
              onChange={(e) => handleChange(parseFloat(e.target.value) || null)}
              placeholder={field.placeholder}
              required={field.required}
              min={field.min}
              max={field.max}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.key} className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={fieldValue as boolean || false}
              onCheckedChange={handleChange}
            />
            <Label htmlFor={fieldId} className="cursor-pointer">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.helpText && (
              <p className="text-sm text-muted-foreground ml-2">{field.helpText}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={fieldValue as string || ''}
              onValueChange={handleChange}
            >
              <SelectTrigger id={fieldId}>
                <SelectValue placeholder={field.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="date"
              value={fieldValue as string || ''}
              onChange={(e) => handleChange(e.target.value)}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );

      case 'time':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
            </Label>
            <Input
              id={fieldId}
              type="time"
              value={fieldValue as string || ''}
              onChange={(e) => handleChange(e.target.value)}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
            </Label>
            <Input
              id={fieldId}
              type="text"
              value={fieldValue as string || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );
    }
  };

  // Add manual field
  const handleAddManualField = () => {
    if (manualKey && manualValue) {
      onChange({
        ...value,
        [manualKey]: manualValue,
      });
      setManualKey('');
      setManualValue('');
    }
  };

  // Remove field
  const handleRemoveField = (key: string) => {
    const newValue = { ...value };
    delete newValue[key];
    onChange(newValue);
  };

  // Get manual fields (fields not in template)
  const manualFields = React.useMemo(() => {
    if (!currentTemplate) return Object.keys(value);

    const templateKeys = currentTemplate.fields.map(f => f.key);
    return Object.keys(value).filter(key => !templateKeys.includes(key));
  }, [value, currentTemplate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {label}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">
              <Sparkles className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Plus className="h-4 w-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          {/* Template Tab */}
          <TabsContent value="template" className="space-y-4">
            {availableTemplates.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select
                    value={selectedTemplate || ''}
                    onValueChange={handleTemplateSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentTemplate && (
                    <p className="text-sm text-muted-foreground">
                      {currentTemplate.description}
                    </p>
                  )}
                </div>

                {currentTemplate && (
                  <div className="space-y-4 border-t pt-4">
                    {currentTemplate.fields.map(renderField)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates available for this context.</p>
                <p className="text-sm">Use manual entry to add custom fields.</p>
              </div>
            )}

            {/* Show manual fields even in template mode */}
            {manualFields.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Additional Fields</Label>
                {manualFields.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input
                      value={key}
                      disabled
                      className="flex-1"
                    />
                    <Input
                      value={value[key]?.toString() || ''}
                      onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveField(key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Field name"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddManualField();
                  }
                }}
              />
              <Input
                placeholder="Value"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddManualField();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddManualField}
                disabled={!manualKey || !manualValue}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {Object.keys(value).length > 0 ? (
              <div className="space-y-2">
                <Label>Current Fields</Label>
                {Object.keys(value).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input
                      value={key}
                      disabled
                      className="flex-1"
                    />
                    <Input
                      value={value[key]?.toString() || ''}
                      onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveField(key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No fields added yet.</p>
                <p className="text-sm">Add key-value pairs above.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
