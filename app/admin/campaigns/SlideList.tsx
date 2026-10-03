// components/campaign/SlideList.tsx
'use client';

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { Slide } from '@/lib/types';
import { GripVertical, Trash2, Eye, Image as ImageIcon, Video, Music, Gift, Package, Layout, FileText } from 'lucide-react';

interface SlideListProps {
  slides: Slide[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onReorder: (newSlides: Slide[]) => void;
  onDelete: (index: number) => void;
  onPreview?: (index: number) => void;
}

export function SlideList({
  slides,
  selectedIndex,
  onSelect,
  onReorder,
  onDelete,
  onPreview,
}: SlideListProps) {
  if (!slides || slides.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-2">🎨</div>
        <p className="text-sm font-medium text-gray-600">Aucun slide</p>
        <p className="text-xs text-gray-400 mt-1">Ajoutez un slide pour commencer à construire votre campagne</p>
      </div>
    );
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(slides);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    onReorder(items);
  };

  const getSlideLabel = (slide: Slide, index: number) => {
    if (slide.title) return slide.title;
    if (slide.type) return `${slide.type.charAt(0).toUpperCase() + slide.type.slice(1)} ${index + 1}`;
    return `Slide ${index + 1}`;
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'image': return <ImageIcon size={16} className="text-blue-500" />;
      case 'video': return <Video size={16} className="text-red-500" />;
      case 'audio': return <Music size={16} className="text-purple-500" />;
      case 'carousel': return <Layout size={16} className="text-indigo-500" />;
      case 'product': return <Package size={16} className="text-green-500" />;
      case 'promotion': return <Gift size={16} className="text-orange-500" />;
      case 'text': return <FileText size={16} className="text-gray-500" />;
      default: return <FileText size={16} className="text-gray-400" />;
    }
  };

  const getTypeBadge = (type?: string) => {
    const badges: Record<string, string> = {
      image: 'bg-blue-100 text-blue-700',
      video: 'bg-red-100 text-red-700',
      audio: 'bg-purple-100 text-purple-700',
      carousel: 'bg-indigo-100 text-indigo-700',
      product: 'bg-green-100 text-green-700',
      promotion: 'bg-orange-100 text-orange-700',
      text: 'bg-gray-100 text-gray-700',
    };
    return badges[type || ''] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-500">{slides.length} slide{slides.length > 1 ? 's' : ''}</span>
        <span className="text-xs text-gray-400">Glissez pour réorganiser</span>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="slides">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''}`}
            >
              {slides.map((slide, index) => (
                <Draggable key={String(slide.id ?? `slide-${index}`)} draggableId={String(slide.id ?? `slide-${index}`)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`
                        flex items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer
                        ${selectedIndex === index
                          ? 'bg-blue-50 border-blue-400 shadow-sm ring-2 ring-blue-200'
                          : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
                        }
                        ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400 scale-[1.02]' : ''}
                        ${snapshot.isDragging ? 'bg-white' : ''}
                      `}
                      onClick={() => onSelect(index)}
                    >
                      {/* Position number */}
                      <span className="text-xs font-medium text-gray-400 w-5 text-center">
                        {index + 1}
                      </span>

                      {/* Drag handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab text-gray-300 hover:text-gray-600 transition p-1 rounded hover:bg-gray-100"
                      >
                        <GripVertical size={18} />
                      </div>

                      {/* Type icon */}
                      <div className={`p-1.5 rounded ${getTypeBadge(slide.type)}`}>
                        {getTypeIcon(slide.type)}
                      </div>

                      {/* Label */}
                      <span className="flex-1 text-sm font-medium truncate">
                        {getSlideLabel(slide, index)}
                      </span>

                      {/* Media indicator (if has media) */}
                      {slide.media_url && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          🖼️
                        </span>
                      )}

                      {/* Preview button */}
                      {onPreview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(index);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Prévisualiser"
                        >
                          <Eye size={16} />
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Supprimer le slide "${getSlideLabel(slide, index)}" ?`)) {
                            onDelete(index);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default SlideList;