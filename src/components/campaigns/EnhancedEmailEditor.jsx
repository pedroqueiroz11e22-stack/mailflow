import React, { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Type, Image as ImageIcon, Link as LinkIcon, List, 
  AlignLeft, AlignCenter, AlignRight, Code, Save, Layout, Paintbrush
} from 'lucide-react';
import VisualEmailBuilder from './VisualEmailBuilder';

export default function EnhancedEmailEditor({ value, onChange, onSaveAsTemplate }) {
  const quillRef = useRef(null);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['blockquote', 'code-block'],
        ['clean']
      ],
    },
    clipboard: {
      matchVisual: false,
    }
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'link', 'image', 'video',
    'blockquote', 'code-block'
  ];

  const insertBlock = (type) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const cursorPosition = quill.getSelection()?.index || 0;
    
    switch(type) {
      case 'button':
        quill.insertText(cursorPosition, '\n');
        quill.insertEmbed(cursorPosition + 1, 'link', 'https://exemplo.com');
        quill.formatText(cursorPosition + 1, 1, {
          'background': '#4F46E5',
          'color': '#FFFFFF',
          'bold': true
        });
        break;
      case 'divider':
        quill.insertText(cursorPosition, '\n─────────────────────────\n');
        break;
      case 'header':
        quill.insertText(cursorPosition, '\nCabeçalho\n', { 'header': 1, 'align': 'center' });
        break;
      case 'footer':
        quill.insertText(cursorPosition, '\n\n© 2026 Sua Empresa. Todos os direitos reservados.\n', { 'size': 'small', 'align': 'center' });
        break;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder" className="gap-2">
            <Paintbrush className="w-4 h-4" /> Builder
          </TabsTrigger>
          <TabsTrigger value="visual">Editor</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <VisualEmailBuilder value={value} onChange={onChange} />
        </TabsContent>

        <TabsContent value="visual" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertBlock('header')}
                className="gap-2"
              >
                <Layout className="w-4 h-4" /> Cabeçalho
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertBlock('button')}
                className="gap-2"
              >
                <Type className="w-4 h-4" /> Botão
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertBlock('divider')}
                className="gap-2"
              >
                <Code className="w-4 h-4" /> Divisor
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertBlock('footer')}
                className="gap-2"
              >
                <AlignCenter className="w-4 h-4" /> Rodapé
              </Button>
              {onSaveAsTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSaveAsTemplate}
                  className="gap-2 ml-auto"
                >
                  <Save className="w-4 h-4" /> Salvar como Template
                </Button>
              )}
            </div>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={value}
              onChange={onChange}
              modules={modules}
              formats={formats}
              className="min-h-[400px]"
              placeholder="Comece a escrever seu email..."
            />
          </Card>
        </TabsContent>

        <TabsContent value="html">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[500px] font-mono text-sm"
            placeholder="Cole ou edite o HTML diretamente..."
          />
        </TabsContent>

        <TabsContent value="preview">
          <Card className="p-8 min-h-[500px] bg-gray-50">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
              <div 
                dangerouslySetInnerHTML={{ __html: value }} 
                className="prose prose-sm max-w-none"
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}