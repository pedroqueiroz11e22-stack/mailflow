import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Upload, Trash2, Edit, Mail, CheckCircle, XCircle, List as ListIcon, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ContactForm from '../components/contacts/ContactForm';
import ContactImport from '../components/contacts/ContactImport';
import ListManager from '../components/contacts/ListManager';
import BulkActions from '../components/contacts/BulkActions';
import { Badge } from "@/components/ui/badge";

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showListManager, setShowListManager] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [filterList, setFilterList] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date'),
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: () => base44.entities.ContactList.list(),
  });

  const allTags = useMemo(() => {
    return [...new Set(contacts.flatMap(c => c.tags || []))];
  }, [contacts]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: (contact) => {
      base44.analytics.track({
        eventName: 'contact_created',
        properties: { contact_id: contact.id, has_tags: contact.tags?.length > 0 }
      });
      
      queryClient.invalidateQueries(['contacts']);
      setShowAddDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setEditingContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      base44.analytics.track({
        eventName: 'contact_deleted'
      });
      
      queryClient.invalidateQueries(['contacts']);
    },
  });

  const handleSubmit = (data) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImportComplete = (count) => {
    base44.analytics.track({
      eventName: 'contacts_imported',
      properties: { count: count }
    });
    
    queryClient.invalidateQueries(['contacts']);
    setShowImportDialog(false);
    alert(`${count} contatos importados com sucesso!`);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesList = filterList === 'all' || (contact.list_ids || []).includes(filterList);
      const matchesTag = filterTag === 'all' || (contact.tags || []).includes(filterTag);
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'subscribed' && contact.subscribed) ||
        (filterStatus === 'unsubscribed' && !contact.subscribed);
      
      return matchesSearch && matchesList && matchesTag && matchesStatus;
    });
  }, [contacts, searchTerm, filterList, filterTag, filterStatus]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-16">
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">Contatos</h1>
            <p className="text-lg text-gray-500">Gerencie sua lista de destinatários</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setShowListManager(true)}
              variant="outline"
              className="gap-2"
            >
              <ListIcon className="w-4 h-4" /> Gerenciar Listas
            </Button>
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="gap-2"
            >
              <Upload className="w-4 h-4" /> Importar
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Contato
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card className="mb-8 bg-white border border-gray-100 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por email, nome ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-gray-500" />
              
              <Select value={filterList} onValueChange={setFilterList}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Lista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Listas</SelectItem>
                  {lists.map(list => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="subscribed">Inscritos</SelectItem>
                  <SelectItem value="unsubscribed">Não Inscritos</SelectItem>
                </SelectContent>
              </Select>

              {(filterList !== 'all' || filterTag !== 'all' || filterStatus !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterList('all');
                    setFilterTag('all');
                    setFilterStatus('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>

            {selectedContacts.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm font-medium text-indigo-900">
                  {selectedContacts.length} contato(s) selecionado(s)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedContacts([])}
                >
                  Limpar Seleção
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts List */}
        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Total: {filteredContacts.length} contatos</span>
              <Badge variant="secondary">
                {contacts.filter(c => c.subscribed).length} inscritos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Carregando...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Nenhum contato encontrado</p>
                <p className="text-sm">Adicione seus primeiros contatos para começar!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedContacts([...selectedContacts, contact.id]);
                          } else {
                            setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                          }
                        }}
                      />
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {contact.name ? contact.name[0].toUpperCase() : contact.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {contact.name || 'Sem nome'}
                          </h4>
                          {contact.subscribed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                        {contact.company && (
                          <p className="text-xs text-gray-500">{contact.company}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(contact.list_ids || []).map(listId => {
                            const list = lists.find(l => l.id === listId);
                            return list ? (
                              <Badge key={listId} className="bg-indigo-100 text-indigo-800 text-xs">
                                <ListIcon className="w-3 h-3 mr-1" />
                                {list.name}
                              </Badge>
                            ) : null;
                          })}
                          {(contact.tags || []).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este contato?')) {
                            deleteMutation.mutate(contact.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Contact Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Contato</DialogTitle>
            </DialogHeader>
            <ContactForm
              onSubmit={handleSubmit}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Contact Dialog */}
        <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Contato</DialogTitle>
            </DialogHeader>
            <ContactForm
              contact={editingContact}
              onSubmit={handleSubmit}
              onCancel={() => setEditingContact(null)}
            />
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Importar Contatos</DialogTitle>
            </DialogHeader>
            <ContactImport onImportComplete={handleImportComplete} />
          </DialogContent>
        </Dialog>

        {/* List Manager */}
        <ListManager 
          open={showListManager}
          onClose={() => setShowListManager(false)}
        />

        {/* Bulk Actions */}
        <BulkActions
          selectedContacts={selectedContacts}
          onClose={() => setSelectedContacts([])}
        />
      </div>
    </div>
  );
}