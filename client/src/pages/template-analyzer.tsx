import React from 'react';
import { TemplateAnalyzer } from '../components/template-analyzer/template-analyzer.js';

export default function TemplateAnalyzerPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <TemplateAnalyzer />
      </div>
    </div>
  );
}