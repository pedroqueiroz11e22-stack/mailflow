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
    smtp_port: 465,
    smtp_user: '',
    smtp_password: '',
    smtp_secure: true,
  });

  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState(null);

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
        smtp_port: settings[0].smtp_port || 465,
        smtp_user: settings[0].smtp_user || '',
        smtp_password: settings[0].smtp_password || '',
        smtp_secure: settings[0].smtp_secure !== false,
      });
    }
  }, [settings]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Settings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      alert('Configurações salvas com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Settings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      alert('Configurações atualizadas com sucesso!');
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: async (smtpData) => {
      const response = await base44.functions.invoke('testSmtp', smtpData);
      return response.data;
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message });
    },
    onError: (error) => {
      setTestResult({ success: false, message: error.response?.data?.error || 'Erro ao testar SMTP' });
    },
  });

  const handleTestSmtp = async () => {
    if (!formData.smtp_host || !formData.smtp_port || !formData.smtp_user || !formData.smtp_password) {
      setTestResult({ success: false, message: 'Preencha todos os campos SMTP antes de testar' });
      return;
    }

    setTestingSmtp(true);
    setTestResult(null);
    
    await testSmtpMutation.mutateAsync({
      smtp_host: formData.smtp_host,
      smtp_port: parseInt(formData.smtp_port),
      smtp_user: formData.smtp_user,
      smtp_password: formData.smtp_password,
      smtp_secure: formData.smtp_secure,
    });
    
    setTestingSmtp(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.sender_email) {
      alert('Por favor, preencha o email do remetente');
      return;
    }

    if (settings.length > 0) {
      updateMutation.mutate({ id: settings[0].id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto p-6 md:p-8">
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
                Servidor SMTP Personalizado
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Configure seu próprio servidor SMTP para enviar emails através da sua conta
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_host">Host SMTP</Label>
                  <Input
                    id="smtp_host"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    placeholder="smtp.hostinger.com"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp_port">Porta</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                    placeholder="465"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="smtp_user">Usuário SMTP</Label>
                <Input
                  id="smtp_user"
                  value={formData.smtp_user}
                  onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="smtp_password">Senha SMTP</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  value={formData.smtp_password}
                  onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="smtp_secure" className="cursor-pointer">Usar SSL/TLS</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Ativado para porta 465, desativado para porta 587
                  </p>
                </div>
                <Switch
                  id="smtp_secure"
                  checked={formData.smtp_secure}
                  onCheckedChange={(checked) => setFormData({ ...formData, smtp_secure: checked })}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
              >
                {testingSmtp ? 'Testando...' : 'Testar Configuração SMTP'}
              </Button>

              {testResult && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${
                  testResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      testResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {testResult.message}
                    </p>
                  </div>
                </div>
              )}
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
            <CardTitle className="text-lg">💡 Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p><strong>Porta 465:</strong> Usa SSL/TLS direto (mais seguro) - mantenha o switch ativado</p>
            <p><strong>Porta 587:</strong> Usa STARTTLS - desative o switch SSL/TLS</p>
            <p><strong>Teste antes de salvar:</strong> Use o botão "Testar" para validar suas credenciais</p>
            <p><strong>Sem SMTP configurado:</strong> O sistema usará as variáveis de ambiente configuradas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}