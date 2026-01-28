import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function BulkActions({ selectedContacts, onClose }) {
  const [action, setAction] = useState('add_to_list');
  const [selectedListId, setSelectedListId] = useState('');
  const [newTag, setNewTag] = useState('');
  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: () => base44.entities.ContactList.list(),
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const allTags = [...new Set(allContacts.flatMap(c => c.tags || []))];

  const updateMutation = useMutation({
    mutationFn: async ({ contactId, data }) => {
      return await base44.entities.Contact.update(contactId, data);
    },
  });

  const handleApply = async () => {
    if (action === 'add_to_list' && !selectedListId) {
      alert('Selecione uma lista');
      return;
    }
    if (action === 'add_tag' && !newTag) {
      alert('Digite uma tag');
      return;
    }

    for (const contactId of selectedContacts) {
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) continue;

      let updates = {};

      if (action === 'add_to_list') {
        const currentLists = contact.list_ids || [];
        if (!currentLists.includes(selectedListId)) {
          updates.list_ids = [...currentLists, selectedListId];
        }
      } else if (action === 'remove_from_list') {
        const currentLists = contact.list_ids || [];
        updates.list_ids = currentLists.filter(id => id !== selectedListId);
      } else if (action === 'add_tag') {
        const currentTags = contact.tags || [];
        if (!currentTags.includes(newTag)) {
          updates.tags = [...currentTags, newTag];
        }
      } else if (action === 'remove_tag') {
        const currentTags = contact.tags || [];
        updates.tags = currentTags.filter(t => t !== newTag);
      } else if (action === 'subscribe') {
        updates.subscribed = true;
      } else if (action === 'unsubscribe') {
        updates.subscribed = false;
      }

      if (Object.keys(updates).length > 0) {
        await updateMutation.mutateAsync({ contactId, data: updates });
      }
    }

    // Update list counts
    if (action === 'add_to_list' || action === 'remove_from_list') {
      const list = lists.find(l => l.id === selectedListId);
      if (list) {
        const contactsInList = allContacts.filter(c => 
          (c.list_ids || []).includes(selectedListId)
        ).length;
        await base44.entities.ContactList.update(selectedListId, {
          contact_count: action === 'add_to_list' ? contactsInList + selectedContacts.length : contactsInList - selectedContacts.length
        });
      }
    }

    queryClient.invalidateQueries(['contacts']);
    queryClient.invalidateQueries(['contact-lists']);
    alert(`Ação aplicada a ${selectedContacts.length} contato(s)`);
    onClose();
  };

  return (
    <Dialog open={selectedContacts.length > 0} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ações em Massa ({selectedContacts.length} selecionados)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Ação</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add_to_list">Adicionar a Lista</SelectItem>
                <SelectItem value="remove_from_list">Remover de Lista</SelectItem>
                <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                <SelectItem value="remove_tag">Remover Tag</SelectItem>
                <SelectItem value="subscribe">Inscrever</SelectItem>
                <SelectItem value="unsubscribe">Desinscrever</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(action === 'add_to_list' || action === 'remove_from_list') && (
            <div>
              <Label>Lista</Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma lista" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map(list => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === 'add_tag' && (
            <div>
              <Label>Nova Tag</Label>
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Digite a tag"
              />
            </div>
          )}

          {action === 'remove_tag' && (
            <div>
              <Label>Tag para Remover</Label>
              <Select value={newTag} onValueChange={setNewTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tag" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}