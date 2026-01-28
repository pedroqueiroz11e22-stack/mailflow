import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { List, Plus, Trash2, Edit } from "lucide-react";

const COLORS = [
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { value: 'yellow', label: 'Amarelo', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'gray', label: 'Cinza', class: 'bg-gray-500' },
];

export default function ListManager({ open, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: 'blue' });
  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: () => base44.entities.ContactList.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContactList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contact-lists']);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContactList.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contact-lists']);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContactList.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['contact-lists']);
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', color: 'blue' });
    setShowForm(false);
    setEditingList(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingList) {
      updateMutation.mutate({ id: editingList.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (list) => {
    setEditingList(list);
    setFormData({ name: list.name, description: list.description || '', color: list.color });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta lista?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            Gerenciar Listas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm ? (
            <>
              <Button onClick={() => setShowForm(true)} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Nova Lista
              </Button>

              <div className="space-y-2">
                {lists.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <List className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhuma lista criada ainda</p>
                  </div>
                ) : (
                  lists.map(list => (
                    <div key={list.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${COLORS.find(c => c.value === list.color)?.class || 'bg-blue-500'}`} />
                        <div>
                          <h4 className="font-semibold">{list.name}</h4>
                          {list.description && (
                            <p className="text-sm text-gray-600">{list.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {list.contact_count || 0} contatos
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(list)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(list.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome da Lista</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Clientes VIP"
                  required
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional da lista"
                  rows={3}
                />
              </div>

              <div>
                <Label>Cor</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingList ? 'Atualizar' : 'Criar'} Lista
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}