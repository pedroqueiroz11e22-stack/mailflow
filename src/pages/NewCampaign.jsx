import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Save } from "lucide-react";
import { createPageUrl } from '../utils';
import EmailEditor from '../components/campaigns/EmailEditor';

export default function NewCampaign() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    from_name: '',
    content: '',
  });
  const [isSending, setIsSending] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.filter({ subscribed: true }),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
  });

  useEffect(() => {
    if (settings.length > 0 && !formData.from_name) {
      setFormData(prev => ({
        ...prev,
        from_name: settings[0].sender_name || '',
      }));
    }
  }, [settings]);

  const createCampaign = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
  });

  const handleSaveDraft = async () => {
    try {
      const campaign = await createCampaign.mutateAsync({
        ...formData,
        status: 'draft',
        recipients_count: contacts.length,
      });
      
      base44.analytics.track({
        eventName: 'campaign_draft_saved',
        properties: { campaign_id: campaign.id }
      });
      
      alert('Rascunho salvo com sucesso!');
      navigate(createPageUrl('Campaigns'));
    } catch (error) {
      alert('Erro ao salvar rascunho: ' + error.message);
    }
  };

  const handleSend = async () => {
    if (!formData.title || !formData.subject || !formData.content) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (contacts.length === 0) {
      alert('Você não tem contatos inscritos para enviar esta campanha');
      return;
    }

    if (!confirm(`Deseja enviar esta campanha para ${contacts.length} contatos?`)) {
      return;
    }

    setIsSending(true);
    try {
      const campaign = await createCampaign.mutateAsync({
        ...formData,
        status: 'sending',
        recipients_count: contacts.length,
        sent_count: 0,
        failed_count: 0,
      });

      const result = await base44.functions.invoke('sendCampaign', {
        campaign_id: campaign.id,
        contacts: contacts.map(c => ({ email: c.email, name: c.name })),
      });

      base44.analytics.track({
        eventName: 'campaign_sent',
        properties: {
          campaign_id: campaign.id,
          recipients_count: contacts.length,
          sent_count: result.data?.sent_count || 0,
          failed_count: result.data?.failed_count || 0,
          success: true,
        }
      });

      alert('Campanha enviada com sucesso!');
      navigate(createPageUrl('Campaigns'));
    } catch (error) {
      base44.analytics.track({
        eventName: 'campaign_send_failed',
        properties: { error: error.message }
      });
      
      alert('Erro ao enviar campanha: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="max-w-5xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Nova Campanha</h1>
          <p className="text-gray-600">Crie e envie sua campanha de email marketing</p>
        </div>

        <div className="space-y-6">
          {/* Campaign Info */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Informações da Campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Campanha *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Newsletter Março 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_name">Nome do Remetente</Label>
                  <Input
                    id="from_name"
                    value={formData.from_name}
                    onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                    placeholder="Ex: Sua Empresa"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto do Email *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Novidades e Ofertas Especiais"
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Content */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Conteúdo do Email</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
              />
            </CardContent>
          </Card>

          {/* Recipients Info */}
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Esta campanha será enviada para:</p>
                  <p className="text-2xl font-bold text-indigo-600">{contacts.length} contatos inscritos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSending}
              className="gap-2"
            >
              <Save className="w-4 h-4" /> Salvar Rascunho
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Enviando...' : 'Enviar Campanha'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}