import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Copy, Eye, EyeOff, ArrowLeft, GraduationCap, Settings, Layers, LogOut, DollarSign } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";

interface PromptVariable {
  name: string;
  type: string;
  description: string;
  defaultValue?: string;
}

interface PromptComponent {
  id?: string;
  name: string;
  type: 'system' | 'user' | 'instruction' | 'example';
  content: string;
  order: number;
  variables: PromptVariable[];
  isRequired: boolean;
}

interface PromptTemplate {
  id?: string;
  name: string;
  type: 'analysis' | 'lesson_plan' | 'flashcard' | 'summary';
  description: string;
  isDefault: boolean;
  isActive: boolean;
  components: PromptComponent[];
}

const PROMPT_TYPES = [
  { value: 'analysis', label: 'Content Analysis' },
  { value: 'lesson_plan', label: 'Lesson Plan Generation' },
  { value: 'flashcard', label: 'Flashcard Creation' },
  { value: 'summary', label: 'Summary Generation' }
];

const COMPONENT_TYPES = [
  { value: 'system', label: 'System Prompt' },
  { value: 'user', label: 'User Prompt' },
  { value: 'instruction', label: 'Instructions' },
  { value: 'example', label: 'Example' }
];

export default function PromptsPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { user, logout } = useAuth();
  
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      window.location.href = '/login';
    },
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    const newTemplate: PromptTemplate = {
      name: '',
      type: 'analysis',
      description: '',
      isDefault: false,
      isActive: true,
      components: []
    };
    setSelectedTemplate(newTemplate);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setSelectedTemplate({ ...template });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const url = isCreating ? '/api/prompts' : `/api/prompts/${selectedTemplate.id}`;
      const method = isCreating ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedTemplate)
      });

      if (response.ok) {
        await fetchTemplates();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/prompts/${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTemplates();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleAddComponent = () => {
    if (!selectedTemplate) return;

    const newComponent: PromptComponent = {
      name: '',
      type: 'system',
      content: '',
      order: selectedTemplate.components.length,
      variables: [],
      isRequired: true
    };

    setSelectedTemplate({
      ...selectedTemplate,
      components: [...selectedTemplate.components, newComponent]
    });
  };

  const handleUpdateComponent = (index: number, component: PromptComponent) => {
    if (!selectedTemplate) return;

    const updatedComponents = [...selectedTemplate.components];
    updatedComponents[index] = component;

    setSelectedTemplate({
      ...selectedTemplate,
      components: updatedComponents
    });
  };

  const handleDeleteComponent = (index: number) => {
    if (!selectedTemplate) return;

    const updatedComponents = selectedTemplate.components.filter((_, i) => i !== index);
    setSelectedTemplate({
      ...selectedTemplate,
      components: updatedComponents
    });
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map(match => match.replace(/\{\{|\}\}/g, '')) : [];
  };

  const buildPreview = () => {
    if (!selectedTemplate) return { systemPrompt: '', userPrompt: '' };

    const systemComponents = selectedTemplate.components.filter(c => c.type === 'system');
    const userComponents = selectedTemplate.components.filter(c => c.type === 'user');

    const replaceVars = (content: string) => {
      return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return previewVariables[varName] || match;
      });
    };

    const systemPrompt = systemComponents
      .sort((a, b) => a.order - b.order)
      .map(c => replaceVars(c.content))
      .join('\n\n');

    const userPrompt = userComponents
      .sort((a, b) => a.order - b.order)
      .map(c => replaceVars(c.content))
      .join('\n\n');

    return { systemPrompt, userPrompt };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading prompts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
              <div className="flex items-center gap-2">
                <Settings className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">AI Prompt Management</h1>
              </div>
            </div>
            
            <nav className="flex items-center gap-2 lg:gap-4">
              {user?.credits !== undefined && (
                <div className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1 bg-green-50 rounded-lg border border-green-200">
                  <DollarSign className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                  <span className="text-xs lg:text-sm font-medium text-green-700">
                    {user.credits} credits
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/tools'}
                className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3"
              >
                <Layers className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">AI Tools</span>
              </Button>
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3"
                >
                  <LogOut className="h-3 w-3 lg:h-4 lg:w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Prompt Templates</h2>
          <button
            onClick={handleCreateTemplate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Templates List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Templates</h2>
              </div>
              <div className="divide-y">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedTemplate?.id === template.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{template.type.replace('_', ' ')}</p>
                        {template.isDefault && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id!);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {isEditing ? (isCreating ? 'Create Template' : 'Edit Template') : 'Template Details'}
                  </h2>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => setPreviewMode(!previewMode)}
                          className="px-3 py-1 text-sm border rounded flex items-center gap-1"
                        >
                          {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {previewMode ? 'Hide Preview' : 'Preview'}
                        </button>
                        <button
                          onClick={() => handleEditTemplate(selectedTemplate)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                        >
                          Edit
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setIsCreating(false);
                            if (isCreating) setSelectedTemplate(null);
                          }}
                          className="px-3 py-1 text-sm border rounded flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTemplate}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Template Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={selectedTemplate.name}
                          onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{selectedTemplate.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      {isEditing ? (
                        <select
                          value={selectedTemplate.type}
                          onChange={(e) => setSelectedTemplate({ ...selectedTemplate, type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {PROMPT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-gray-900 capitalize">{selectedTemplate.type.replace('_', ' ')}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    {isEditing ? (
                      <textarea
                        value={selectedTemplate.description}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{selectedTemplate.description}</p>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.isDefault}
                          onChange={(e) => setSelectedTemplate({ ...selectedTemplate, isDefault: e.target.checked })}
                          className="mr-2"
                        />
                        Default template for this type
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.isActive}
                          onChange={(e) => setSelectedTemplate({ ...selectedTemplate, isActive: e.target.checked })}
                          className="mr-2"
                        />
                        Active
                      </label>
                    </div>
                  )}

                  {/* Components */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Components</h3>
                      {isEditing && (
                        <button
                          onClick={handleAddComponent}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Add Component
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {selectedTemplate.components
                        .sort((a, b) => a.order - b.order)
                        .map((component, index) => (
                          <ComponentEditor
                            key={index}
                            component={component}
                            isEditing={isEditing}
                            onUpdate={(updatedComponent) => handleUpdateComponent(index, updatedComponent)}
                            onDelete={() => handleDeleteComponent(index)}
                          />
                        ))}
                    </div>
                  </div>

                  {/* Preview */}
                  {previewMode && !isEditing && (
                    <PromptPreview
                      template={selectedTemplate}
                      variables={previewVariables}
                      onVariableChange={setPreviewVariables}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <p className="text-gray-500">Select a template to view or edit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component Editor Component
function ComponentEditor({
  component,
  isEditing,
  onUpdate,
  onDelete
}: {
  component: PromptComponent;
  isEditing: boolean;
  onUpdate: (component: PromptComponent) => void;
  onDelete: () => void;
}) {
  const extractedVars = component.content.match(/\{\{(\w+)\}\}/g) || [];
  const variableNames = extractedVars.map(v => v.replace(/\{\{|\}\}/g, ''));

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            {isEditing ? (
              <input
                type="text"
                value={component.name}
                onChange={(e) => onUpdate({ ...component, name: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            ) : (
              <p className="text-sm text-gray-900">{component.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            {isEditing ? (
              <select
                value={component.type}
                onChange={(e) => onUpdate({ ...component, type: e.target.value as any })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              >
                {COMPONENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-900 capitalize">{component.type}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
            {isEditing ? (
              <input
                type="number"
                value={component.order}
                onChange={(e) => onUpdate({ ...component, order: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            ) : (
              <p className="text-sm text-gray-900">{component.order}</p>
            )}
          </div>
        </div>
        {isEditing && (
          <button
            onClick={onDelete}
            className="ml-2 p-1 text-red-600 hover:text-red-800"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
        {isEditing ? (
          <textarea
            value={component.content}
            onChange={(e) => onUpdate({ ...component, content: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Use {{variableName}} for dynamic values"
          />
        ) : (
          <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border whitespace-pre-wrap">
            {component.content}
          </div>
        )}
      </div>

      {variableNames.length > 0 && (
        <div className="text-xs text-gray-600">
          <strong>Variables found:</strong> {variableNames.join(', ')}
        </div>
      )}
    </div>
  );
}

// Prompt Preview Component
function PromptPreview({
  template,
  variables,
  onVariableChange
}: {
  template: PromptTemplate;
  variables: Record<string, string>;
  onVariableChange: (variables: Record<string, string>) => void;
}) {
  const allVariables = new Set<string>();
  template.components.forEach(component => {
    const matches = component.content.match(/\{\{(\w+)\}\}/g) || [];
    matches.forEach(match => {
      const varName = match.replace(/\{\{|\}\}/g, '');
      allVariables.add(varName);
    });
  });

  const systemComponents = template.components.filter(c => c.type === 'system');
  const userComponents = template.components.filter(c => c.type === 'user');

  const replaceVars = (content: string) => {
    return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] || match;
    });
  };

  const systemPrompt = systemComponents
    .sort((a, b) => a.order - b.order)
    .map(c => replaceVars(c.content))
    .join('\n\n');

  const userPrompt = userComponents
    .sort((a, b) => a.order - b.order)
    .map(c => replaceVars(c.content))
    .join('\n\n');

  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-medium mb-4">Preview</h3>
      
      {allVariables.size > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Variables</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from(allVariables).map(varName => (
              <div key={varName}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{varName}</label>
                <input
                  type="text"
                  value={variables[varName] || ''}
                  onChange={(e) => onVariableChange({ ...variables, [varName]: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder={`Enter ${varName}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {systemPrompt && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">System Prompt</h4>
            <div className="bg-blue-50 p-3 rounded border text-sm whitespace-pre-wrap">
              {systemPrompt}
            </div>
          </div>
        )}
        
        {userPrompt && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">User Prompt</h4>
            <div className="bg-green-50 p-3 rounded border text-sm whitespace-pre-wrap">
              {userPrompt}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}