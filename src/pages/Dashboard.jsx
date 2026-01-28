import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Send, Mail, Plus, TrendingUp, Settings as SettingsIcon, Inbox as InboxIcon, BarChart3 } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Dashboard() {
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date'),
  });

  const stats = {
    totalContacts: contacts.length,
    subscribedContacts: contacts.filter(c => c.subscribed).length,
    totalCampaigns: campaigns.length,
    sentCampaigns: campaigns.filter(c => c.status === 'sent').length,
  };

  const recentCampaigns = campaigns.slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-16">
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
              Email Marketing
            </h1>
            <p className="text-lg text-gray-500">Gerencie suas campanhas e contatos</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('Analytics')}>
              <Button variant="outline" className="gap-2">
                <BarChart3 className="w-4 h-4" /> Analytics
              </Button>
            </Link>
            <Link to={createPageUrl('Inbox')}>
              <Button variant="outline" className="gap-2">
                <InboxIcon className="w-4 h-4" /> Caixa de Entrada
              </Button>
            </Link>
            <Link to={createPageUrl('Settings')}>
              <Button variant="outline" className="gap-2">
                <SettingsIcon className="w-4 h-4" /> Configurações
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Contatos
              </CardTitle>
              <Users className="w-5 h-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalContacts}</div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                {stats.subscribedContacts} inscritos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Campanhas Criadas
              </CardTitle>
              <Mail className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalCampaigns}</div>
              <p className="text-xs text-gray-500 mt-1">Total de campanhas</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Campanhas Enviadas
              </CardTitle>
              <Send className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.sentCampaigns}</div>
              <p className="text-xs text-gray-500 mt-1">Emails enviados com sucesso</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-indigo-100">
                Taxa de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {campaigns.length > 0 ? 
                  Math.round((stats.sentCampaigns / stats.totalCampaigns) * 100) : 0}%
              </div>
              <p className="text-xs text-indigo-100 mt-1">Performance geral</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <Link to={createPageUrl('NewCampaign')}>
            <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-0 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1 transform">
              <CardContent className="flex items-center justify-between p-10">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Nova Campanha</h3>
                  <p className="text-indigo-100">Criar e enviar email marketing</p>
                </div>
                <Plus className="w-16 h-16 text-indigo-200" />
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Contacts')}>
            <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1 transform">
              <CardContent className="flex items-center justify-between p-10">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Gerenciar Contatos</h3>
                  <p className="text-purple-100">Adicionar e organizar destinatários</p>
                </div>
                <Users className="w-16 h-16 text-purple-200" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Campaigns */}
        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold">Campanhas Recentes</CardTitle>
              <Link to={createPageUrl('Campaigns')}>
                <Button variant="outline" size="sm">Ver Todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Nenhuma campanha criada ainda</p>
                <p className="text-sm">Comece criando sua primeira campanha de email!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900">{campaign.title}</h4>
                      <p className="text-sm text-gray-600">{campaign.subject}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                          campaign.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                          campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status === 'sent' ? 'Enviada' :
                           campaign.status === 'sending' ? 'Enviando' :
                           campaign.status === 'failed' ? 'Falhou' : 'Rascunho'}
                        </div>
                      </div>
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