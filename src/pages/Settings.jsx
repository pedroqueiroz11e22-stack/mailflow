import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Mail, Server, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    sender_email: '',
    sender_name: '',
    reply_to_email: '',
    smtp_host: '',
    smtp_port: '465',
    smtp_user: '',
    smtp_password: '',
    imap_host: '',
    imap_port: '993',
  });

  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
  });

  useEffect(() => {
    if (settings.length > 0) {
      setFormData({
        sender_email: settings[0].sender_email || '',
        sender_name: settings[0].sender_name || '',
        reply_to_email: settings[0].reply_to_email || '',
        smtp_host: settings[0].smtp_host || '',
        smtp_port: settings[0].smtp_port || '465',
        smtp_user: settings[0].smtp_user || '',
        smtp_password: settings[0].smtp_password || '',
        imap_host: settings[0].imap_host || '',
        imap_port: settings[0].imap_port || '993',
      });
    }
  }, [settings]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Settings.create(data),
    onSuccess: () => {
      base44.analytics.track({
        eventName: 'settings_created'
      });
      
      queryClient.invalidateQueries(['settings']);
      alert('Configurações salvas com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Settings.update(id, data),
    onSuccess: () => {
      base44.analytics.track({
        eventName: 'settings_updated'
      });
      
      queryClient.invalidateQueries(['settings']);
      alert('Configurações atualizadas com sucesso!');
    },
  });

  const handleTestSMTP = async () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password) {
      setTestResult({ success: false, message: 'Preencha todos os campos SMTP primeiro' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data } = await base44.functions.invoke('testSMTPSettings', {
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_user: formData.smtp_user,
        smtp_password: formData.smtp_password,
      });
      
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.sender_email) {
      alert('Por favor, preencha o email do remetente');
      return;
    }

    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password) {
      alert('Por favor, preencha as configurações SMTP');
      return;
    }

    if (settings.length > 0) {
      updateMutation.mutate({ id: settings[0].id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12 md:px-12 md:py-16">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Configurações</h1>
          <p className="text-gray-600">Configure o email e servidor SMTP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Configurações de Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sender_email">Email do Remetente *</Label>
                <Input
                  id="sender_email"
                  type="email"
                  required
                  value={formData.sender_email}
                  onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  placeholder="contato@suaempresa.com"
                />
              </div>

              <div>
                <Label htmlFor="sender_name">Nome do Remetente</Label>
                <Input
                  id="sender_name"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="Sua Empresa"
                />
              </div>

              <div>
                <Label htmlFor="reply_to_email">Email de Resposta (Reply-To)</Label>
                <Input
                  id="reply_to_email"
                  type="email"
                  value={formData.reply_to_email}
                  onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
                  placeholder="suporte@suaempresa.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-600" />
                Configurações SMTP
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Configure o servidor de envio de emails
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_host">Host SMTP *</Label>
                  <Input
                    id="smtp_host"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    placeholder="smtp.hostinger.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp_port">Porta *</Label>
                  <Input
                    id="smtp_port"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                    placeholder="465"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="smtp_user">Usuário SMTP *</Label>
                <Input
                  id="smtp_user"
                  type="email"
                  value={formData.smtp_user}
                  onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="smtp_password">Senha SMTP *</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  value={formData.smtp_password}
                  onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestSMTP}
                disabled={testing}
                className="w-full"
              >
                {testing ? 'Testando...' : 'Testar Conexão SMTP'}
              </Button>

              {testResult && (
                <div className={`rounded-lg p-4 ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-semibold ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {testResult.success ? 'Conexão bem-sucedida!' : 'Erro na conexão'}
                      </h4>
                      <p className={`text-sm mt-1 ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Configurações IMAP (Recebimento)
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Configure o servidor para receber emails
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imap_host">Host IMAP</Label>
                  <Input
                    id="imap_host"
                    value={formData.imap_host}
                    onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                    placeholder="imap.hostinger.com"
                  />
                </div>
                <div>
                  <Label htmlFor="imap_port">Porta</Label>
                  <Input
                    id="imap_port"
                    value={formData.imap_port}
                    onChange={(e) => setFormData({ ...formData, imap_port: e.target.value })}
                    placeholder="993"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                O IMAP usará o mesmo usuário e senha do SMTP
              </p>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Todas as Configurações'}
          </Button>
        </form>

        <Card className="mt-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg">💡 Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p><strong>Email do Remetente:</strong> O endereço que aparecerá como remetente nas campanhas</p>
            <p><strong>Nome do Remetente:</strong> O nome que será exibido junto ao email</p>
            <p><strong>Email de Resposta:</strong> Para onde serão enviadas as respostas dos destinatários</p>
            <p><strong>SMTP:</strong> Servidor para envio de emails (porta 465 ou 587)</p>
            <p><strong>IMAP:</strong> Servidor para recebimento de emails (porta 993)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}