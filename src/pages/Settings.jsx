import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Mail, ArrowLeft } from "lucide-react";
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
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Configurações</h1>
          <p className="text-gray-600">Configure o email de envio das campanhas</p>
        </div>

        {/* Settings Form */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Configurações de Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sender_email">Email do Remetente *</Label>
                <Input
                  id="sender_email"
                  type="email"
                  required
                  value={formData.sender_email}
                  onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  placeholder="contato@suaempresa.com"
                />
                <p className="text-xs text-gray-500">
                  Este será o email exibido como remetente nas suas campanhas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender_name">Nome do Remetente</Label>
                <Input
                  id="sender_name"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="Sua Empresa"
                />
                <p className="text-xs text-gray-500">
                  Nome que aparecerá junto ao email do remetente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply_to_email">Email de Resposta (Reply-To)</Label>
                <Input
                  id="reply_to_email"
                  type="email"
                  value={formData.reply_to_email}
                  onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
                  placeholder="suporte@suaempresa.com"
                />
                <p className="text-xs text-gray-500">
                  Email que receberá as respostas dos destinatários (opcional)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📌 Importante</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use um email profissional do seu domínio</li>
                  <li>• Evite usar emails gratuitos (Gmail, Hotmail) para melhor entregabilidade</li>
                  <li>• Configure SPF e DKIM no seu domínio para evitar spam</li>
                </ul>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                  <Save className="w-4 h-4" />
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg">Como usar?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>1. Configure o email do remetente acima</p>
            <p>2. Ao criar campanhas, você pode usar este email padrão ou personalizá-lo</p>
            <p>3. O sistema Base44 enviará os emails usando a integração de email configurada</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}