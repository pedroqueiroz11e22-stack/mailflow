import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Copy, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ContactImport({ onImportComplete }) {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);

  const handlePasteImport = async () => {
    setIsProcessing(true);
    try {
      const lines = pasteData.split('\n').filter(line => line.trim());
      const contacts = [];
      
      for (const line of lines) {
        const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
          const email = emailMatch[0];
          const name = line.replace(email, '').replace(/[,;]/g, '').trim();
          contacts.push({ email, name: name || undefined, subscribed: true });
        }
      }

      if (contacts.length > 0) {
        await base44.entities.Contact.bulkCreate(contacts);
        onImportComplete(contacts.length);
        setPasteData('');
      }
    } catch (error) {
      alert('Erro ao importar contatos: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileImport = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  company: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.contacts) {
        const contacts = result.output.contacts.map(c => ({
          ...c,
          subscribed: true
        }));
        await base44.entities.Contact.bulkCreate(contacts);
        onImportComplete(contacts.length);
        setFile(null);
      }
    } catch (error) {
      alert('Erro ao importar arquivo: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Tabs defaultValue="paste" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="paste" className="flex items-center gap-2">
          <Copy className="w-4 h-4" /> Colar Lista
        </TabsTrigger>
        <TabsTrigger value="file" className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Importar CSV/Excel
        </TabsTrigger>
      </TabsList>

      <TabsContent value="paste" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paste">
            Cole os emails (um por linha, pode incluir nome)
          </Label>
          <Textarea
            id="paste"
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="João Silva, joao@exemplo.com&#10;maria@exemplo.com&#10;Pedro Santos <pedro@exemplo.com>"
            rows={8}
            className="font-mono text-sm"
          />
        </div>
        <Button
          onClick={handlePasteImport}
          disabled={!pasteData.trim() || isProcessing}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {isProcessing ? 'Importando...' : 'Importar Contatos'}
        </Button>
      </TabsContent>

      <TabsContent value="file" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Arquivo CSV ou Excel</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <Input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="max-w-xs mx-auto"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleFileImport}
          disabled={!file || isProcessing}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {isProcessing ? 'Importando...' : 'Importar Arquivo'}
        </Button>
      </TabsContent>
    </Tabs>
  );
}