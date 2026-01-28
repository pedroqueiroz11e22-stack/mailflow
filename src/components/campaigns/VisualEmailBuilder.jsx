import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  Type, Image as ImageIcon, MousePointerClick, Minus, 
  Layout, Trash2, Settings, Columns, AlignLeft, AlignCenter, 
  AlignRight, Palette, Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const blockTypes = [
  { id: 'heading', label: 'Título', icon: Type, defaultContent: { text: 'Título do Email', level: 'h1', align: 'left', color: '#000000' } },
  { id: 'text', label: 'Texto', icon: Type, defaultContent: { text: 'Digite seu texto aqui...', align: 'left', color: '#333333' } },
  { id: 'button', label: 'Botão', icon: MousePointerClick, defaultContent: { text: 'Clique aqui', url: '#', bgColor: '#4F46E5', textColor: '#FFFFFF', align: 'center' } },
  { id: 'image', label: 'Imagem', icon: ImageIcon, defaultContent: { url: '', alt: 'Imagem', width: '100%', align: 'center' } },
  { id: 'divider', label: 'Divisor', icon: Minus, defaultContent: { color: '#E5E7EB', height: 1 } },
  { id: 'spacer', label: 'Espaço', icon: Layout, defaultContent: { height: 40 } },
  { id: 'columns', label: 'Colunas', icon: Columns, defaultContent: { columns: 2, contents: ['', ''] } },
];

export default function VisualEmailBuilder({ value, onChange }) {
  const [blocks, setBlocks] = useState(() => {
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  });
  const [editingBlock, setEditingBlock] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const updateBlocks = (newBlocks) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks));
  };

  const addBlock = (type) => {
    const blockType = blockTypes.find(b => b.id === type);
    const newBlock = {
      id: `${type}-${Date.now()}`,
      type,
      content: { ...blockType.defaultContent }
    };
    updateBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id) => {
    updateBlocks(blocks.filter(b => b.id !== id));
  };

  const updateBlock = (id, content) => {
    updateBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    updateBlocks(items);
  };

  const renderBlockPreview = (block) => {
    const { type, content } = block;
    
    switch (type) {
      case 'heading':
        const HeadingTag = content.level || 'h1';
        return (
          <HeadingTag style={{ 
            textAlign: content.align, 
            color: content.color,
            margin: 0,
            fontSize: content.level === 'h1' ? '32px' : content.level === 'h2' ? '24px' : '20px'
          }}>
            {content.text}
          </HeadingTag>
        );
      case 'text':
        return (
          <p style={{ 
            textAlign: content.align, 
            color: content.color,
            margin: 0,
            lineHeight: '1.6'
          }}>
            {content.text}
          </p>
        );
      case 'button':
        return (
          <div style={{ textAlign: content.align }}>
            <a href={content.url} style={{
              display: 'inline-block',
              padding: '12px 32px',
              backgroundColor: content.bgColor,
              color: content.textColor,
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600'
            }}>
              {content.text}
            </a>
          </div>
        );
      case 'image':
        return content.url ? (
          <div style={{ textAlign: content.align }}>
            <img src={content.url} alt={content.alt} style={{ width: content.width, maxWidth: '100%' }} />
          </div>
        ) : (
          <div className="bg-gray-100 p-8 text-center text-gray-400 rounded">
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">Adicione uma URL de imagem</p>
          </div>
        );
      case 'divider':
        return <hr style={{ border: 'none', borderTop: `${content.height}px solid ${content.color}`, margin: '16px 0' }} />;
      case 'spacer':
        return <div style={{ height: `${content.height}px` }} />;
      case 'columns':
        return (
          <div style={{ display: 'flex', gap: '16px' }}>
            {content.contents.map((col, idx) => (
              <div key={idx} style={{ flex: 1 }}>
                <div dangerouslySetInnerHTML={{ __html: col || '<p style="color:#999">Coluna vazia</p>' }} />
              </div>
            ))}
          </div>
        );
      default:
        return <div>Bloco desconhecido</div>;
    }
  };

  const generateHTML = () => {
    let html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    `;
    
    blocks.forEach(block => {
      html += '<div style="margin-bottom: 24px;">';
      const tempDiv = document.createElement('div');
      const rendered = renderBlockPreview(block);
      // Simple conversion for preview
      html += `<div>${JSON.stringify(block.content)}</div>`;
      html += '</div>';
    });
    
    html += '</div>';
    return html;
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Block Library */}
      <div className="col-span-3">
        <Card className="p-4 sticky top-4">
          <h3 className="font-semibold mb-4 text-sm text-gray-900">Adicionar Blocos</h3>
          <div className="space-y-2">
            {blockTypes.map(blockType => {
              const Icon = blockType.icon;
              return (
                <Button
                  key={blockType.id}
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => addBlock(blockType.id)}
                  size="sm"
                >
                  <Icon className="w-4 h-4" />
                  {blockType.label}
                </Button>
              );
            })}
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowPreview(true)}
              size="sm"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>
        </Card>
      </div>

      {/* Canvas */}
      <div className="col-span-9">
        <Card className="p-6 min-h-[600px]">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
              <Layout className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Comece adicionando blocos</p>
              <p className="text-sm">Arraste e solte blocos da barra lateral</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="email-blocks">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {blocks.map((block, index) => (
                      <Draggable key={block.id} draggableId={block.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`group relative border-2 rounded-lg p-4 bg-white transition-all ${
                              snapshot.isDragging ? 'border-indigo-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div {...provided.dragHandleProps} className="absolute -left-3 top-1/2 -translate-y-1/2 bg-gray-100 rounded p-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                              <Layout className="w-4 h-4 text-gray-600" />
                            </div>
                            
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full"
                                onClick={() => setEditingBlock(block)}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full"
                                onClick={() => removeBlock(block.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                            
                            {renderBlockPreview(block)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Card>
      </div>

      {/* Block Editor Dialog */}
      <Dialog open={!!editingBlock} onOpenChange={() => setEditingBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Bloco</DialogTitle>
          </DialogHeader>
          {editingBlock && (
            <div className="space-y-4">
              {editingBlock.type === 'heading' && (
                <>
                  <div>
                    <Label>Texto</Label>
                    <Input
                      value={editingBlock.content.text}
                      onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, text: e.target.value } })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nível</Label>
                      <Select
                        value={editingBlock.content.level}
                        onValueChange={(value) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, level: value } })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="h1">H1 (Grande)</SelectItem>
                          <SelectItem value="h2">H2 (Médio)</SelectItem>
                          <SelectItem value="h3">H3 (Pequeno)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Cor</Label>
                      <Input
                        type="color"
                        value={editingBlock.content.color}
                        onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, color: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Alinhamento</Label>
                    <div className="flex gap-2">
                      {['left', 'center', 'right'].map(align => (
                        <Button
                          key={align}
                          variant={editingBlock.content.align === align ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, align } })}
                        >
                          {align === 'left' && <AlignLeft className="w-4 h-4" />}
                          {align === 'center' && <AlignCenter className="w-4 h-4" />}
                          {align === 'right' && <AlignRight className="w-4 h-4" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {editingBlock.type === 'text' && (
                <>
                  <div>
                    <Label>Texto</Label>
                    <Textarea
                      value={editingBlock.content.text}
                      onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, text: e.target.value } })}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cor</Label>
                      <Input
                        type="color"
                        value={editingBlock.content.color}
                        onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, color: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label>Alinhamento</Label>
                      <div className="flex gap-2">
                        {['left', 'center', 'right'].map(align => (
                          <Button
                            key={align}
                            variant={editingBlock.content.align === align ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, align } })}
                          >
                            {align === 'left' && <AlignLeft className="w-4 h-4" />}
                            {align === 'center' && <AlignCenter className="w-4 h-4" />}
                            {align === 'right' && <AlignRight className="w-4 h-4" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {editingBlock.type === 'button' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Texto do Botão</Label>
                      <Input
                        value={editingBlock.content.text}
                        onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, text: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={editingBlock.content.url}
                        onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, url: e.target.value } })}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cor de Fundo</Label>
                      <Input
                        type="color"
                        value={editingBlock.content.bgColor}
                        onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, bgColor: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label>Cor do Texto</Label>
                      <Input
                        type="color"
                        value={editingBlock.content.textColor}
                        onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, textColor: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Alinhamento</Label>
                    <div className="flex gap-2">
                      {['left', 'center', 'right'].map(align => (
                        <Button
                          key={align}
                          variant={editingBlock.content.align === align ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, align } })}
                        >
                          {align === 'left' && <AlignLeft className="w-4 h-4" />}
                          {align === 'center' && <AlignCenter className="w-4 h-4" />}
                          {align === 'right' && <AlignRight className="w-4 h-4" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {editingBlock.type === 'image' && (
                <>
                  <div>
                    <Label>URL da Imagem</Label>
                    <Input
                      value={editingBlock.content.url}
                      onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, url: e.target.value } })}
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Largura</Label>
                      <Input
                        value={editingBlock.content.width}
                        onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, width: e.target.value } })}
                        placeholder="100%"
                      />
                    </div>
                    <div>
                      <Label>Alinhamento</Label>
                      <div className="flex gap-2">
                        {['left', 'center', 'right'].map(align => (
                          <Button
                            key={align}
                            variant={editingBlock.content.align === align ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, align } })}
                          >
                            {align === 'left' && <AlignLeft className="w-4 h-4" />}
                            {align === 'center' && <AlignCenter className="w-4 h-4" />}
                            {align === 'right' && <AlignRight className="w-4 h-4" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {editingBlock.type === 'divider' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cor</Label>
                    <Input
                      type="color"
                      value={editingBlock.content.color}
                      onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, color: e.target.value } })}
                    />
                  </div>
                  <div>
                    <Label>Altura (px)</Label>
                    <Input
                      type="number"
                      value={editingBlock.content.height}
                      onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, height: parseInt(e.target.value) } })}
                    />
                  </div>
                </div>
              )}
              
              {editingBlock.type === 'spacer' && (
                <div>
                  <Label>Altura (px)</Label>
                  <Input
                    type="number"
                    value={editingBlock.content.height}
                    onChange={(e) => setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, height: parseInt(e.target.value) } })}
                  />
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingBlock(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  updateBlock(editingBlock.id, editingBlock.content);
                  setEditingBlock(null);
                }}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do Email</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
              {blocks.map(block => (
                <div key={block.id} className="mb-6">
                  {renderBlockPreview(block)}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}