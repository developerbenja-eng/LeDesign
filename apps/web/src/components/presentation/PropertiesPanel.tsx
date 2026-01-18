// ============================================================
// PROPERTIES PANEL
// ============================================================
// Right sidebar for editing slide content, style, and animations

'use client';

import { useState } from 'react';
import {
  Type,
  Palette,
  Wand2,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Building2,
  Droplets,
  Map,
  Route,
  Mountain,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Crown,
  Handshake,
  Calendar,
  Rocket,
  Shield,
  Star,
  Heart,
  Zap,
  Globe,
  Code,
} from 'lucide-react';
import { usePresentationStore } from '@/stores/presentation-store';
import type {
  SlideStyle,
  SlideAnimation,
  AnimationType,
  IconName,
  SlideContentItem,
} from '@/types/presentation';

// ============================================================
// ICON OPTIONS
// ============================================================

const ICON_OPTIONS: Array<{ value: IconName; icon: React.ReactNode; label: string }> = [
  { value: 'none', icon: null, label: 'Ninguno' },
  { value: 'building', icon: <Building2 size={16} />, label: 'Edificio' },
  { value: 'droplets', icon: <Droplets size={16} />, label: 'Agua' },
  { value: 'map', icon: <Map size={16} />, label: 'Mapa' },
  { value: 'road', icon: <Route size={16} />, label: 'Ruta' },
  { value: 'mountain', icon: <Mountain size={16} />, label: 'Montaña' },
  { value: 'users', icon: <Users size={16} />, label: 'Usuarios' },
  { value: 'target', icon: <Target size={16} />, label: 'Objetivo' },
  { value: 'trending-up', icon: <TrendingUp size={16} />, label: 'Tendencia' },
  { value: 'dollar-sign', icon: <DollarSign size={16} />, label: 'Dinero' },
  { value: 'check-circle', icon: <CheckCircle size={16} />, label: 'Check' },
  { value: 'crown', icon: <Crown size={16} />, label: 'Corona' },
  { value: 'handshake', icon: <Handshake size={16} />, label: 'Acuerdo' },
  { value: 'calendar', icon: <Calendar size={16} />, label: 'Calendario' },
  { value: 'rocket', icon: <Rocket size={16} />, label: 'Cohete' },
  { value: 'shield', icon: <Shield size={16} />, label: 'Escudo' },
  { value: 'star', icon: <Star size={16} />, label: 'Estrella' },
  { value: 'heart', icon: <Heart size={16} />, label: 'Corazón' },
  { value: 'zap', icon: <Zap size={16} />, label: 'Rayo' },
  { value: 'globe', icon: <Globe size={16} />, label: 'Globo' },
  { value: 'code', icon: <Code size={16} />, label: 'Código' },
];

// ============================================================
// ANIMATION OPTIONS
// ============================================================

const ANIMATION_OPTIONS: Array<{ value: AnimationType; label: string }> = [
  { value: 'none', label: 'Ninguna' },
  { value: 'fade', label: 'Desvanecer' },
  { value: 'slide-up', label: 'Deslizar arriba' },
  { value: 'slide-down', label: 'Deslizar abajo' },
  { value: 'slide-left', label: 'Deslizar izquierda' },
  { value: 'slide-right', label: 'Deslizar derecha' },
  { value: 'scale', label: 'Escalar' },
];

// ============================================================
// INPUT COMPONENTS
// ============================================================

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const inputClasses =
    'w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50';

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClasses} resize-none h-20`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#3b82f6'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border border-slate-700/50"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#3b82f6"
          className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm text-slate-400 w-12 text-right">
          {value}
          {suffix}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// COLLAPSIBLE SECTION
// ============================================================

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center gap-2 text-sm font-medium text-slate-300 hover:bg-slate-800/30 transition-colors"
      >
        <Icon size={16} className="text-slate-400" />
        {title}
        <span className="ml-auto text-slate-500">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

// ============================================================
// CONTENT PANEL
// ============================================================

function ContentPanel() {
  const { presentation, editor, updateSlideContent, addItem, updateItem, deleteItem } =
    usePresentationStore();

  if (!presentation) return null;

  const currentSlide = presentation.slides[editor.selectedSlideIndex];
  if (!currentSlide) return null;

  const { content, type } = currentSlide;

  const hasTitle = ['title', 'title-subtitle', 'stats', 'grid-2', 'grid-3', 'grid-4', 'comparison', 'list', 'timeline', 'cta', 'image-text'].includes(type);
  const hasSubtitle = ['title', 'cta'].includes(type);
  const hasBody = ['title-subtitle', 'cta', 'image-text'].includes(type);
  const hasQuote = type === 'quote';
  const hasItems = ['stats', 'grid-2', 'grid-3', 'grid-4', 'comparison', 'list', 'timeline'].includes(type);
  const hasImage = type === 'image-text';

  return (
    <Section title="Contenido" icon={Type}>
      {hasTitle && (
        <TextInput
          label="Título"
          value={content.title || ''}
          onChange={(value) => updateSlideContent(currentSlide.id, { title: value })}
          placeholder="Título de la diapositiva"
        />
      )}

      {hasSubtitle && (
        <TextInput
          label="Subtítulo"
          value={content.subtitle || ''}
          onChange={(value) => updateSlideContent(currentSlide.id, { subtitle: value })}
          placeholder="Subtítulo"
        />
      )}

      {hasBody && (
        <TextInput
          label="Texto"
          value={content.body || ''}
          onChange={(value) => updateSlideContent(currentSlide.id, { body: value })}
          placeholder="Contenido de la diapositiva"
          multiline
        />
      )}

      {hasQuote && (
        <>
          <TextInput
            label="Cita"
            value={content.quote || ''}
            onChange={(value) => updateSlideContent(currentSlide.id, { quote: value })}
            placeholder='"Tu cita aquí"'
            multiline
          />
          <TextInput
            label="Autor"
            value={content.quoteAuthor || ''}
            onChange={(value) => updateSlideContent(currentSlide.id, { quoteAuthor: value })}
            placeholder="— Autor"
          />
        </>
      )}

      {hasImage && (
        <TextInput
          label="URL de Imagen"
          value={content.imageUrl || ''}
          onChange={(value) => updateSlideContent(currentSlide.id, { imageUrl: value })}
          placeholder="https://example.com/image.jpg"
        />
      )}

      {hasItems && content.items && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Items</label>
            <button
              onClick={() => addItem(currentSlide.id)}
              className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          {content.items.map((item, index) => (
            <ItemEditor
              key={item.id}
              item={item}
              index={index}
              slideId={currentSlide.id}
              slideType={type}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

// ============================================================
// ITEM EDITOR
// ============================================================

function ItemEditor({
  item,
  index,
  slideId,
  slideType,
}: {
  item: SlideContentItem;
  index: number;
  slideId: string;
  slideType: string;
}) {
  const { updateItem, deleteItem } = usePresentationStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const showIcon = ['grid-2', 'grid-3', 'grid-4'].includes(slideType);
  const showValue = !['comparison'].includes(slideType);
  const showDescription = !['list'].includes(slideType);

  return (
    <div className="bg-slate-800/30 rounded-lg border border-slate-700/30">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <GripVertical size={14} className="text-slate-500" />
        <span className="text-sm text-slate-300 flex-1 truncate">
          {item.label || `Item ${index + 1}`}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(slideId, item.id);
          }}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
        <span className="text-slate-500">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-700/30 pt-3">
          <TextInput
            label="Etiqueta"
            value={item.label}
            onChange={(value) => updateItem(slideId, item.id, { label: value })}
            placeholder="Etiqueta"
          />

          {showValue && (
            <TextInput
              label="Valor"
              value={item.value}
              onChange={(value) => updateItem(slideId, item.id, { value: value })}
              placeholder="Valor"
            />
          )}

          {showDescription && (
            <TextInput
              label="Descripción"
              value={item.description || ''}
              onChange={(value) => updateItem(slideId, item.id, { description: value })}
              placeholder="Descripción"
            />
          )}

          {showIcon && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Icono</label>
              <div className="grid grid-cols-7 gap-1">
                {ICON_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateItem(slideId, item.id, { icon: option.value })}
                    className={`p-2 rounded-lg transition-colors ${
                      item.icon === option.value
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    }`}
                    title={option.label}
                  >
                    {option.icon || <span className="text-xs">-</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ColorInput
            label="Color"
            value={item.color || '#3b82f6'}
            onChange={(value) => updateItem(slideId, item.id, { color: value })}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// STYLE PANEL
// ============================================================

function StylePanel() {
  const { presentation, editor, updateSlideStyle } = usePresentationStore();

  if (!presentation) return null;

  const currentSlide = presentation.slides[editor.selectedSlideIndex];
  if (!currentSlide) return null;

  const { style } = currentSlide;

  return (
    <Section title="Estilo" icon={Palette}>
      {/* Background Type */}
      <SelectInput
        label="Tipo de Fondo"
        value={style.backgroundType}
        onChange={(value) =>
          updateSlideStyle(currentSlide.id, {
            backgroundType: value as SlideStyle['backgroundType'],
          })
        }
        options={[
          { value: 'solid', label: 'Sólido' },
          { value: 'gradient', label: 'Gradiente' },
          { value: 'image', label: 'Imagen' },
        ]}
      />

      {style.backgroundType === 'solid' && (
        <ColorInput
          label="Color de Fondo"
          value={style.backgroundColor || 'transparent'}
          onChange={(value) => updateSlideStyle(currentSlide.id, { backgroundColor: value })}
        />
      )}

      {style.backgroundType === 'gradient' && (
        <>
          <ColorInput
            label="Color Inicio"
            value={style.backgroundGradient?.from || '#1e293b'}
            onChange={(value) =>
              updateSlideStyle(currentSlide.id, {
                backgroundGradient: { ...style.backgroundGradient!, from: value },
              })
            }
          />
          <ColorInput
            label="Color Fin"
            value={style.backgroundGradient?.to || '#0f172a'}
            onChange={(value) =>
              updateSlideStyle(currentSlide.id, {
                backgroundGradient: { ...style.backgroundGradient!, to: value },
              })
            }
          />
          <SelectInput
            label="Dirección"
            value={style.backgroundGradient?.direction || 'to-b'}
            onChange={(value) =>
              updateSlideStyle(currentSlide.id, {
                backgroundGradient: {
                  ...style.backgroundGradient!,
                  direction: value as SlideStyle['backgroundGradient']['direction'],
                },
              })
            }
            options={[
              { value: 'to-r', label: 'Derecha' },
              { value: 'to-l', label: 'Izquierda' },
              { value: 'to-t', label: 'Arriba' },
              { value: 'to-b', label: 'Abajo' },
              { value: 'to-br', label: 'Diagonal ↘' },
              { value: 'to-bl', label: 'Diagonal ↙' },
              { value: 'to-tr', label: 'Diagonal ↗' },
              { value: 'to-tl', label: 'Diagonal ↖' },
            ]}
          />
        </>
      )}

      {style.backgroundType === 'image' && (
        <>
          <TextInput
            label="URL de Imagen"
            value={style.backgroundImage || ''}
            onChange={(value) => updateSlideStyle(currentSlide.id, { backgroundImage: value })}
            placeholder="https://example.com/image.jpg"
          />
          <ColorInput
            label="Overlay"
            value={style.backgroundOverlay || 'rgba(0,0,0,0.5)'}
            onChange={(value) => updateSlideStyle(currentSlide.id, { backgroundOverlay: value })}
          />
        </>
      )}

      <div className="h-px bg-slate-700/50 my-2" />

      {/* Title Size */}
      <SelectInput
        label="Tamaño de Título"
        value={style.titleSize}
        onChange={(value) =>
          updateSlideStyle(currentSlide.id, { titleSize: value as SlideStyle['titleSize'] })
        }
        options={[
          { value: 'sm', label: 'Pequeño' },
          { value: 'md', label: 'Mediano' },
          { value: 'lg', label: 'Grande' },
          { value: 'xl', label: 'Extra Grande' },
          { value: '2xl', label: '2XL' },
          { value: '3xl', label: '3XL' },
        ]}
      />

      {/* Alignment */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Alineación</label>
        <div className="flex gap-2">
          {[
            { value: 'left', icon: AlignLeft },
            { value: 'center', icon: AlignCenter },
            { value: 'right', icon: AlignRight },
          ].map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() =>
                updateSlideStyle(currentSlide.id, {
                  alignment: value as SlideStyle['alignment'],
                })
              }
              className={`flex-1 p-2 rounded-lg transition-colors ${
                style.alignment === value
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={18} className="mx-auto" />
            </button>
          ))}
        </div>
      </div>

      {/* Padding */}
      <SelectInput
        label="Espaciado"
        value={style.padding}
        onChange={(value) =>
          updateSlideStyle(currentSlide.id, { padding: value as SlideStyle['padding'] })
        }
        options={[
          { value: 'sm', label: 'Pequeño' },
          { value: 'md', label: 'Mediano' },
          { value: 'lg', label: 'Grande' },
          { value: 'xl', label: 'Extra Grande' },
        ]}
      />

      {/* Card Style */}
      <SelectInput
        label="Estilo de Tarjetas"
        value={style.cardStyle}
        onChange={(value) =>
          updateSlideStyle(currentSlide.id, { cardStyle: value as SlideStyle['cardStyle'] })
        }
        options={[
          { value: 'glass', label: 'Glassmorphism' },
          { value: 'solid', label: 'Sólido' },
          { value: 'outline', label: 'Contorno' },
          { value: 'none', label: 'Sin estilo' },
        ]}
      />
    </Section>
  );
}

// ============================================================
// ANIMATION PANEL
// ============================================================

function AnimationPanel() {
  const { presentation, editor, updateSlideAnimation } = usePresentationStore();

  if (!presentation) return null;

  const currentSlide = presentation.slides[editor.selectedSlideIndex];
  if (!currentSlide) return null;

  const { animation } = currentSlide;

  return (
    <Section title="Animación" icon={Wand2} defaultOpen={false}>
      <SelectInput
        label="Entrada"
        value={animation.enter}
        onChange={(value) =>
          updateSlideAnimation(currentSlide.id, { enter: value as AnimationType })
        }
        options={ANIMATION_OPTIONS}
      />

      <SelectInput
        label="Salida"
        value={animation.exit}
        onChange={(value) =>
          updateSlideAnimation(currentSlide.id, { exit: value as AnimationType })
        }
        options={ANIMATION_OPTIONS}
      />

      <NumberInput
        label="Duración"
        value={animation.duration}
        onChange={(value) => updateSlideAnimation(currentSlide.id, { duration: value })}
        min={0.1}
        max={2}
        step={0.1}
        suffix="s"
      />

      <NumberInput
        label="Escalonado"
        value={animation.stagger}
        onChange={(value) => updateSlideAnimation(currentSlide.id, { stagger: value })}
        min={0}
        max={1}
        step={0.05}
        suffix="s"
      />

      <NumberInput
        label="Retraso"
        value={animation.delay}
        onChange={(value) => updateSlideAnimation(currentSlide.id, { delay: value })}
        min={0}
        max={2}
        step={0.1}
        suffix="s"
      />
    </Section>
  );
}

// ============================================================
// MAIN PROPERTIES PANEL
// ============================================================

export function PropertiesPanel() {
  const { presentation, editor } = usePresentationStore();

  if (!presentation) return null;

  const currentSlide = presentation.slides[editor.selectedSlideIndex];
  if (!currentSlide) return null;

  return (
    <div className="w-80 bg-slate-900/50 border-l border-slate-700/50 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-sm font-medium text-slate-300">Propiedades</h3>
        <p className="text-xs text-slate-500 mt-1">
          Diapositiva {editor.selectedSlideIndex + 1} • {currentSlide.type}
        </p>
      </div>

      {/* Panels */}
      <ContentPanel />
      <StylePanel />
      <AnimationPanel />
    </div>
  );
}

export default PropertiesPanel;
