import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Mail, MousePointer, UserX, Eye, Download, ArrowLeft, BarChart3 } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Analytics() {
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [timeRange, setTimeRange] = useState('30');

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date'),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['email-events'],
    queryFn: () => base44.entities.EmailEvent.list('-event_date'),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const filteredCampaigns = useMemo(() => {
    if (selectedCampaign === 'all') return campaigns;
    return campaigns.filter(c => c.id === selectedCampaign);
  }, [campaigns, selectedCampaign]);

  const filteredEvents = useMemo(() => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));
    
    return events.filter(event => {
      const eventDate = new Date(event.event_date);
      const matchesTimeRange = eventDate >= daysAgo;
      const matchesCampaign = selectedCampaign === 'all' || event.campaign_id === selectedCampaign;
      return matchesTimeRange && matchesCampaign;
    });
  }, [events, timeRange, selectedCampaign]);

  const metrics = useMemo(() => {
    const sent = filteredEvents.filter(e => e.event_type === 'sent').length;
    const opened = filteredEvents.filter(e => e.event_type === 'opened').length;
    const clicked = filteredEvents.filter(e => e.event_type === 'clicked').length;
    const unsubscribed = filteredEvents.filter(e => e.event_type === 'unsubscribed').length;
    const bounced = filteredEvents.filter(e => e.event_type === 'bounced').length;

    return {
      sent,
      opened,
      clicked,
      unsubscribed,
      bounced,
      openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0,
      clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : 0,
      unsubscribeRate: sent > 0 ? ((unsubscribed / sent) * 100).toFixed(1) : 0,
      bounceRate: sent > 0 ? ((bounced / sent) * 100).toFixed(1) : 0,
    };
  }, [filteredEvents]);

  const timelineData = useMemo(() => {
    const grouped = {};
    filteredEvents.forEach(event => {
      const date = new Date(event.event_date).toLocaleDateString('pt-BR');
      if (!grouped[date]) {
        grouped[date] = { date, sent: 0, opened: 0, clicked: 0 };
      }
      if (event.event_type === 'sent') grouped[date].sent++;
      if (event.event_type === 'opened') grouped[date].opened++;
      if (event.event_type === 'clicked') grouped[date].clicked++;
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredEvents]);

  const eventDistribution = useMemo(() => {
    return [
      { name: 'Enviados', value: metrics.sent, color: '#6366f1' },
      { name: 'Abertos', value: metrics.opened, color: '#10b981' },
      { name: 'Clicados', value: metrics.clicked, color: '#f59e0b' },
      { name: 'Descadastros', value: metrics.unsubscribed, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [metrics]);

  const campaignPerformance = useMemo(() => {
    return filteredCampaigns.map(campaign => {
      const campaignEvents = filteredEvents.filter(e => e.campaign_id === campaign.id);
      const sent = campaignEvents.filter(e => e.event_type === 'sent').length;
      const opened = campaignEvents.filter(e => e.event_type === 'opened').length;
      const clicked = campaignEvents.filter(e => e.event_type === 'clicked').length;
      
      return {
        name: campaign.title.substring(0, 20),
        sent,
        opened,
        clicked,
      };
    }).slice(0, 10);
  }, [filteredCampaigns, filteredEvents]);

  const handleExportCSV = async () => {
    const csvData = [
      ['Data', 'Tipo de Evento', 'Campanha', 'Email do Contato', 'Link URL'],
      ...filteredEvents.map(event => [
        new Date(event.event_date).toLocaleString('pt-BR'),
        event.event_type,
        campaigns.find(c => c.id === event.campaign_id)?.title || 'N/A',
        event.contact_email,
        event.link_url || 'N/A',
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    base44.analytics.track({
      eventName: 'analytics_report_exported',
      properties: { format: 'csv' }
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-16">
        <div className="mb-8">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" className="mb-2 gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight flex items-center gap-4">
                <BarChart3 className="w-12 h-12 text-indigo-600" />
                Analytics
              </h1>
              <p className="text-lg text-gray-500">Análise detalhada de desempenho</p>
            </div>
            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar Relatório CSV
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-full md:w-64 bg-white">
              <SelectValue placeholder="Selecionar campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Campanhas</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full md:w-48 bg-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taxa de Abertura</CardTitle>
              <Eye className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{metrics.openRate}%</div>
              <p className="text-xs text-gray-500 mt-1">{metrics.opened} de {metrics.sent} abertos</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taxa de Cliques</CardTitle>
              <MousePointer className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{metrics.clickRate}%</div>
              <p className="text-xs text-gray-500 mt-1">{metrics.clicked} cliques</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taxa de Descadastro</CardTitle>
              <UserX className="w-5 h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{metrics.unsubscribeRate}%</div>
              <p className="text-xs text-gray-500 mt-1">{metrics.unsubscribed} descadastros</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Enviado</CardTitle>
              <Mail className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{metrics.sent}</div>
              <p className="text-xs text-gray-500 mt-1">Emails enviados</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Eventos ao Longo do Tempo</CardTitle>
              <CardDescription>Visualize a tendência de envios, aberturas e cliques</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke="#6366f1" name="Enviados" strokeWidth={2} />
                    <Line type="monotone" dataKey="opened" stroke="#10b981" name="Abertos" strokeWidth={2} />
                    <Line type="monotone" dataKey="clicked" stroke="#f59e0b" name="Clicados" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Distribuição de Eventos</CardTitle>
              <CardDescription>Proporção de cada tipo de evento</CardDescription>
            </CardHeader>
            <CardContent>
              {eventDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={eventDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {eventDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Performance por Campanha</CardTitle>
            <CardDescription>Compare o desempenho das suas campanhas</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={campaignPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" fill="#6366f1" name="Enviados" />
                  <Bar dataKey="opened" fill="#10b981" name="Abertos" />
                  <Bar dataKey="clicked" fill="#f59e0b" name="Clicados" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}