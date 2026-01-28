import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, MailOpen, RefreshCw, Search, ArrowLeft, Calendar, Reply, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Inbox() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['received-emails'],
    queryFn: () => base44.entities.ReceivedEmail.list('-received_date'),
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, is_read }) => base44.entities.ReceivedEmail.update(id, { is_read }),
    onSuccess: () => {
      queryClient.invalidateQueries(['received-emails']);
    },
  });

  const syncEmailsMutation = useMutation({
    mutationFn: () => base44.functions.invoke('fetchEmails'),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['received-emails']);
      alert(response.data?.message || 'Emails sincronizados com sucesso!');
    },
    onError: () => {
      alert('Erro ao sincronizar emails');
    }
  });

  const handleSync = async () => {
    setSyncing(true);
    await syncEmailsMutation.mutateAsync();
    setSyncing(false);
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    setShowReplyComposer(false);
    setReplyBody('');
    if (!email.is_read) {
      markAsReadMutation.mutate({ id: email.id, is_read: true });
    }
  };

  const handleReply = () => {
    setShowReplyComposer(true);
  };

  const sendReplyMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('sendEmailReply', data),
    onSuccess: () => {
      base44.analytics.track({
        eventName: 'email_reply_sent',
        properties: { to: selectedEmail.from_email }
      });
      alert('Resposta enviada com sucesso!');
      setShowReplyComposer(false);
      setReplyBody('');
      setSelectedEmail(null);
    },
    onError: (error) => {
      alert('Erro ao enviar resposta: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleSendReply = async () => {
    if (!replyBody.trim()) {
      alert('Digite uma mensagem antes de enviar');
      return;
    }

    setSending(true);
    await sendReplyMutation.mutateAsync({
      to_email: selectedEmail.from_email,
      to_name: selectedEmail.from_name,
      subject: selectedEmail.subject.startsWith('Re: ') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      body: replyBody,
    });
    setSending(false);
  };

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.from_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.from_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadCount = emails.filter(e => !e.is_read).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-16">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" className="mb-2 gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
            </Link>
            <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight flex items-center gap-4">
              <Mail className="w-12 h-12 text-indigo-600" />
              Inbox
            </h1>
            <p className="text-lg text-gray-500">
              {unreadCount > 0 ? `${unreadCount} não lidos` : 'Nenhum email não lido'}
            </p>
          </div>
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>

        <Card className="bg-white border border-gray-100 shadow-sm mb-8">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar emails por assunto, remetente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle>Emails Recebidos ({filteredEmails.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-spin" />
                <p>Carregando emails...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Nenhum email encontrado</p>
                <p className="text-sm">Clique em "Sincronizar" para buscar novos emails</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                      !email.is_read ? 'bg-blue-50 border-l-4 border-indigo-600' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {email.is_read ? (
                        <MailOpen className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Mail className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-semibold ${!email.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {email.from_name || email.from_email}
                          </h3>
                          {!email.is_read && (
                            <Badge className="bg-indigo-600 text-white">Novo</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {new Date(email.received_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">{email.from_email}</p>
                      <p className={`text-sm ${!email.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {email.subject}
                      </p>
                      {email.body_text && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {email.body_text}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedEmail} onOpenChange={() => {
          setSelectedEmail(null);
          setShowReplyComposer(false);
          setReplyBody('');
        }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedEmail?.subject}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedEmail?.from_name || selectedEmail?.from_email}
                    </p>
                    <p className="text-sm text-gray-500">{selectedEmail?.from_email}</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedEmail && new Date(selectedEmail.received_date).toLocaleString('pt-BR')}
                  </p>
                </div>
                {!showReplyComposer && (
                  <Button 
                    onClick={handleReply}
                    variant="outline"
                    className="gap-2 mt-2"
                  >
                    <Reply className="w-4 h-4" />
                    Responder
                  </Button>
                )}
              </div>

              {!showReplyComposer ? (
                <div className="prose max-w-none">
                  {selectedEmail?.body_html ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{selectedEmail?.body_text}</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Para:</strong> {selectedEmail?.from_name || selectedEmail?.from_email}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>Assunto:</strong> {selectedEmail?.subject.startsWith('Re: ') ? selectedEmail?.subject : `Re: ${selectedEmail?.subject}`}
                    </p>
                  </div>
                  <Textarea
                    placeholder="Digite sua resposta..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={8}
                    className="w-full"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowReplyComposer(false);
                        setReplyBody('');
                      }}
                      disabled={sending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSendReply}
                      disabled={sending}
                      className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {sending ? 'Enviando...' : 'Enviar Resposta'}
                    </Button>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <p className="text-xs text-gray-500 mb-2">Email original:</p>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm">
                      {selectedEmail?.body_html ? (
                        <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                      ) : (
                        <div className="whitespace-pre-wrap">{selectedEmail?.body_text}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}