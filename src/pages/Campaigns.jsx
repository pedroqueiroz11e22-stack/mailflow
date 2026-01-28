import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Calendar, Users } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Campaigns() {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date'),
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'sending': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'sent': return 'Enviada';
      case 'sending': return 'Enviando';
      case 'failed': return 'Falhou';
      default: return 'Rascunho';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Campanhas</h1>
            <p className="text-gray-600">Histórico e gerenciamento de envios</p>
          </div>
          <Link to={createPageUrl('NewCampaign')}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" /> Nova Campanha
            </Button>
          </Link>
        </div>

        {/* Campaigns List */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Todas as Campanhas ({campaigns.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Carregando...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Nenhuma campanha criada ainda</p>
                <p className="text-sm mb-4">Comece criando sua primeira campanha!</p>
                <Link to={createPageUrl('NewCampaign')}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    Criar Primeira Campanha
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:shadow-md transition-all duration-300 border border-gray-100"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{campaign.title}</h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            {getStatusLabel(campaign.status)}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{campaign.subject}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {campaign.created_date && format(new Date(campaign.created_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </div>
                          {campaign.recipients_count && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {campaign.recipients_count} destinatários
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {campaign.status === 'sent' && (
                        <div className="flex gap-6 text-center">
                          <div className="bg-green-50 px-4 py-2 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{campaign.sent_count || 0}</div>
                            <div className="text-xs text-gray-600">Enviados</div>
                          </div>
                          {campaign.failed_count > 0 && (
                            <div className="bg-red-50 px-4 py-2 rounded-lg">
                              <div className="text-2xl font-bold text-red-600">{campaign.failed_count}</div>
                              <div className="text-xs text-gray-600">Falharam</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}