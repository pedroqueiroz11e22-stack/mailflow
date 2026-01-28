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
  });

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
                Informações SMTP
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Suas credenciais SMTP já estão configuradas nas variáveis de ambiente
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">✅ SMTP Configurado</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Host:</strong> smtp.hostinger.com</li>
                  <li>• <strong>Porta:</strong> 465 (SSL/TLS)</li>
                  <li>• <strong>Usuário:</strong> Configurado via variáveis de ambiente</li>
                  <li>• O sistema usará essas credenciais para enviar todas as campanhas</li>
                </ul>
              </div>
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
            <p><strong>SMTP:</strong> As credenciais já estão configuradas no sistema via variáveis de ambiente</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}