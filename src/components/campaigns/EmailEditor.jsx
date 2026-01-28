import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Code, Eye } from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function EmailEditor({ value, onChange }) {
  const [activeTab, setActiveTab] = useState('visual');

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Eye className="w-4 h-4" /> Visual
          </TabsTrigger>
          <TabsTrigger value="html" className="flex items-center gap-2">
            <Code className="w-4 h-4" /> HTML
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" /> Pré-visualização
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-2">
          <Label>Conteúdo do Email</Label>
          <div className="bg-white rounded-lg border">
            <ReactQuill
              theme="snow"
              value={value}
              onChange={onChange}
              modules={modules}
              className="h-96"
            />
          </div>
        </TabsContent>

        <TabsContent value="html" className="space-y-2">
          <Label>Código HTML</Label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
            placeholder="<html>&#10;  <body>&#10;    <h1>Seu email aqui</h1>&#10;  </body>&#10;</html>"
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-2">
          <Label>Pré-visualização</Label>
          <div className="border rounded-lg p-8 bg-white min-h-96">
            <div dangerouslySetInnerHTML={{ __html: value }} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}