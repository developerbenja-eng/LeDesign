// ============================================================
// SLIDE RENDERER COMPONENT
// ============================================================
// Data-driven slide rendering based on slide type and theme

'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
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
import type {
  Slide,
  Theme,
  SlideContentItem,
  IconName,
  AnimationType,
} from '@/types/presentation';

// ============================================================
// ICON MAP
// ============================================================

const ICON_MAP: Record<IconName, React.ComponentType<{ className?: string; size?: number }>> = {
  building: Building2,
  droplets: Droplets,
  map: Map,
  road: Route,
  mountain: Mountain,
  users: Users,
  target: Target,
  'trending-up': TrendingUp,
  'dollar-sign': DollarSign,
  'check-circle': CheckCircle,
  crown: Crown,
  handshake: Handshake,
  calendar: Calendar,
  rocket: Rocket,
  shield: Shield,
  star: Star,
  heart: Heart,
  zap: Zap,
  globe: Globe,
  code: Code,
  none: () => null,
};

// ============================================================
// ANIMATION VARIANTS
// ============================================================

function getAnimationVariants(type: AnimationType, duration: number): Variants {
  const variants: Record<AnimationType, Variants> = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration } },
      exit: { opacity: 0, transition: { duration: duration * 0.5 } },
    },
    'slide-up': {
      initial: { opacity: 0, y: 50 },
      animate: { opacity: 1, y: 0, transition: { duration } },
      exit: { opacity: 0, y: -50, transition: { duration: duration * 0.5 } },
    },
    'slide-down': {
      initial: { opacity: 0, y: -50 },
      animate: { opacity: 1, y: 0, transition: { duration } },
      exit: { opacity: 0, y: 50, transition: { duration: duration * 0.5 } },
    },
    'slide-left': {
      initial: { opacity: 0, x: 50 },
      animate: { opacity: 1, x: 0, transition: { duration } },
      exit: { opacity: 0, x: -50, transition: { duration: duration * 0.5 } },
    },
    'slide-right': {
      initial: { opacity: 0, x: -50 },
      animate: { opacity: 1, x: 0, transition: { duration } },
      exit: { opacity: 0, x: 50, transition: { duration: duration * 0.5 } },
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1, transition: { duration } },
      exit: { opacity: 0, scale: 0.9, transition: { duration: duration * 0.5 } },
    },
    none: {
      initial: {},
      animate: {},
      exit: {},
    },
  };

  return variants[type] || variants.fade;
}

// ============================================================
// PROPS
// ============================================================

interface SlideRendererProps {
  slide: Slide;
  theme: Theme;
  isActive?: boolean;
  isEditing?: boolean;
  onElementClick?: (elementId: string) => void;
  selectedElementId?: string | null;
}

// ============================================================
// HELPER: Render Icon
// ============================================================

function RenderIcon({
  icon,
  className,
  size = 24,
}: {
  icon?: IconName;
  className?: string;
  size?: number;
}) {
  if (!icon || icon === 'none') return null;
  const IconComponent = ICON_MAP[icon];
  if (!IconComponent) return null;
  return <IconComponent className={className} size={size} />;
}

// ============================================================
// HELPER: Get Style Classes
// ============================================================

function getBackgroundStyle(slide: Slide, theme: Theme): React.CSSProperties {
  const { style } = slide;

  if (style.backgroundType === 'gradient' && style.backgroundGradient) {
    const { from, via, to, direction } = style.backgroundGradient;
    const gradientDirection = {
      'to-r': 'to right',
      'to-l': 'to left',
      'to-t': 'to top',
      'to-b': 'to bottom',
      'to-br': 'to bottom right',
      'to-bl': 'to bottom left',
      'to-tr': 'to top right',
      'to-tl': 'to top left',
    }[direction];

    const colors = via
      ? `${from}, ${via}, ${to}`
      : `${from}, ${to}`;

    return {
      background: `linear-gradient(${gradientDirection}, ${colors})`,
    };
  }

  if (style.backgroundType === 'image' && style.backgroundImage) {
    return {
      backgroundImage: `url(${style.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  if (style.backgroundColor && style.backgroundColor !== 'transparent') {
    return { backgroundColor: style.backgroundColor };
  }

  return { backgroundColor: theme.colors.background };
}

function getTitleSizeClass(size: Slide['style']['titleSize']): string {
  const sizes: Record<string, string> = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
    '2xl': 'text-6xl',
    '3xl': 'text-7xl',
  };
  return sizes[size] || sizes.xl;
}

function getPaddingClass(padding: Slide['style']['padding']): string {
  const paddings: Record<string, string> = {
    sm: 'p-8',
    md: 'p-12',
    lg: 'p-16',
    xl: 'p-20',
  };
  return paddings[padding] || paddings.lg;
}

function getMaxWidthClass(maxWidth: Slide['style']['maxWidth']): string {
  const widths: Record<string, string> = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };
  return widths[maxWidth] || widths.xl;
}

function getAlignmentClass(alignment: Slide['style']['alignment']): string {
  const alignments: Record<string, string> = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };
  return alignments[alignment] || alignments.center;
}

function getCardClass(cardStyle: Slide['style']['cardStyle'], theme: Theme): string {
  const styles: Record<string, string> = {
    glass: 'bg-white/5 backdrop-blur-md border border-white/10 rounded-xl',
    solid: `bg-[${theme.colors.surface}] rounded-xl`,
    outline: `border border-[${theme.colors.border}] rounded-xl`,
    none: '',
  };
  return styles[cardStyle] || styles.glass;
}

// ============================================================
// SLIDE TYPE RENDERERS
// ============================================================

// Title Slide
function TitleSlide({ slide, theme }: { slide: Slide; theme: Theme }) {
  const { content, style } = slide;

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      {content.title && (
        <motion.h1
          className={`${getTitleSizeClass(style.titleSize)} font-bold mb-6`}
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {style.titleGradient ? (
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, ${style.titleGradient.from}, ${style.titleGradient.via || style.titleGradient.to}, ${style.titleGradient.to})`,
              }}
            >
              {content.title}
            </span>
          ) : (
            content.title
          )}
        </motion.h1>
      )}
      {content.subtitle && (
        <motion.p
          className="text-2xl"
          style={{ color: theme.colors.textMuted }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {content.subtitle}
        </motion.p>
      )}
    </div>
  );
}

// Title + Subtitle Slide
function TitleSubtitleSlide({ slide, theme }: { slide: Slide; theme: Theme }) {
  const { content, style } = slide;

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      {content.title && (
        <motion.h2
          className={`${getTitleSizeClass(style.titleSize)} font-bold mb-6`}
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {content.title}
        </motion.h2>
      )}
      {content.body && (
        <motion.p
          className="text-xl max-w-3xl"
          style={{ color: theme.colors.textMuted }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {content.body}
        </motion.p>
      )}
    </div>
  );
}

// Stats Slide
function StatsSlide({
  slide,
  theme,
  stagger,
}: {
  slide: Slide;
  theme: Theme;
  stagger: number;
}) {
  const { content, style } = slide;

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      {content.title && (
        <motion.h2
          className={`${getTitleSizeClass(style.titleSize)} font-bold mb-12`}
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {content.title}
        </motion.h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {content.items?.map((item, index) => (
          <motion.div
            key={item.id}
            className={`${getCardClass(style.cardStyle, theme)} p-6 text-center`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stagger * (index + 1) }}
          >
            <div
              className="text-4xl font-bold mb-2"
              style={{ color: item.color || theme.colors.primary }}
            >
              {item.value}
            </div>
            <div className="text-sm" style={{ color: theme.colors.textMuted }}>
              {item.label}
            </div>
            {item.description && (
              <div className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                {item.description}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Grid Slide (2, 3, or 4 columns)
function GridSlide({
  slide,
  theme,
  columns,
  stagger,
}: {
  slide: Slide;
  theme: Theme;
  columns: 2 | 3 | 4;
  stagger: number;
}) {
  const { content, style } = slide;
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }[columns];

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      {content.title && (
        <motion.h2
          className={`${getTitleSizeClass(style.titleSize)} font-bold mb-12`}
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {content.title}
        </motion.h2>
      )}
      <div className={`grid ${gridCols} gap-6`}>
        {content.items?.map((item, index) => (
          <motion.div
            key={item.id}
            className={`${getCardClass(style.cardStyle, theme)} p-6`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stagger * (index + 1) }}
          >
            {item.icon && item.icon !== 'none' && (
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: `${theme.colors.primary}20` }}
              >
                <RenderIcon
                  icon={item.icon}
                  size={24}
                  className={`text-[${theme.colors.primary}]`}
                />
              </div>
            )}
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: theme.colors.text }}
            >
              {item.label}
            </h3>
            {item.value && (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                {item.value}
              </p>
            )}
            {item.description && (
              <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
                {item.description}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Comparison Slide
function ComparisonSlide({
  slide,
  theme,
  stagger,
}: {
  slide: Slide;
  theme: Theme;
  stagger: number;
}) {
  const { content, style } = slide;

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      {content.title && (
        <motion.h2
          className={`${getTitleSizeClass(style.titleSize)} font-bold mb-12`}
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {content.title}
        </motion.h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {content.items?.map((item, index) => (
          <motion.div
            key={item.id}
            className={`${getCardClass(style.cardStyle, theme)} p-8`}
            initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: stagger * (index + 1) }}
          >
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: item.color || theme.colors.primary }}
            >
              {item.label}
            </h3>
            <p style={{ color: theme.colors.textMuted }}>
              {item.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// List Slide
function ListSlide({
  slide,
  theme,
  stagger,
}: {
  slide: Slide;
  theme: Theme;
  stagger: number;
}) {
  const { content, style } = slide;

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      {content.title && (
        <motion.h2
          className={`${getTitleSizeClass(style.titleSize)} font-bold mb-8`}
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {content.title}
        </motion.h2>
      )}
      <div className="space-y-4 max-w-3xl">
        {content.items?.map((item, index) => (
          <motion.div
            key={item.id}
            className="flex items-start gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: stagger * (index + 1) }}
          >
            <span
              className="text-lg font-semibold min-w-[2rem]"
              style={{ color: theme.colors.primary }}
            >
              {item.label}
            </span>
            <span style={{ color: theme.colors.text }}>
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Quote Slide
function QuoteSlide({ slide, theme }: { slide: Slide; theme: Theme }) {
  const { content, style } = slide;

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      <motion.blockquote
        className="text-3xl md:text-4xl font-light italic max-w-4xl"
        style={{ color: theme.colors.text }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        {content.quote}
      </motion.blockquote>
      {content.quoteAuthor && (
        <motion.cite
          className="text-xl mt-8 not-italic"
          style={{ color: theme.colors.textMuted }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {content.quoteAuthor}
        </motion.cite>
      )}
    </div>
  );
}

// Timeline Slide
function TimelineSlide({
  slide,
  theme,
  stagger,
}: {
  slide: Slide;
  theme: Theme;
  stagger: number;
}) {
  const { content, style } = slide;

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      {content.title && (
        <motion.h2
          className={`${getTitleSizeClass(style.titleSize)} font-bold mb-12`}
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {content.title}
        </motion.h2>
      )}
      <div className="relative">
        {/* Timeline line */}
        <div
          className="absolute left-4 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: theme.colors.border }}
        />
        <div className="space-y-8">
          {content.items?.map((item, index) => (
            <motion.div
              key={item.id}
              className="flex items-start gap-6 relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: stagger * (index + 1) }}
            >
              {/* Timeline dot */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <span className="text-sm font-bold" style={{ color: theme.colors.background }}>
                  {index + 1}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: theme.colors.primary }}>
                  {item.label}
                </div>
                <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                  {item.value}
                </h3>
                {item.description && (
                  <p className="text-sm mt-1" style={{ color: theme.colors.textMuted }}>
                    {item.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// CTA Slide
function CTASlide({ slide, theme }: { slide: Slide; theme: Theme }) {
  const { content, style } = slide;

  return (
    <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)} h-full`}>
      {content.title && (
        <motion.h2
          className={`${getTitleSizeClass(style.titleSize)} font-bold mb-6`}
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {content.title}
        </motion.h2>
      )}
      {content.subtitle && (
        <motion.p
          className="text-xl mb-8"
          style={{ color: theme.colors.textMuted }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {content.subtitle}
        </motion.p>
      )}
      {content.body && (
        <motion.p
          className="text-lg"
          style={{ color: theme.colors.textMuted }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {content.body}
        </motion.p>
      )}
    </div>
  );
}

// Image + Text Slide
function ImageTextSlide({ slide, theme }: { slide: Slide; theme: Theme }) {
  const { content, style } = slide;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center">
      {/* Image side */}
      <motion.div
        className="rounded-xl overflow-hidden h-full min-h-[300px]"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        {content.imageUrl ? (
          <img
            src={content.imageUrl}
            alt={content.title || 'Slide image'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <span style={{ color: theme.colors.textMuted }}>
              Sin imagen
            </span>
          </div>
        )}
      </motion.div>
      {/* Text side */}
      <div className={`flex flex-col justify-center ${getAlignmentClass(style.alignment)}`}>
        {content.title && (
          <motion.h2
            className={`${getTitleSizeClass(style.titleSize)} font-bold mb-4`}
            style={{ color: theme.colors.text }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {content.title}
          </motion.h2>
        )}
        {content.body && (
          <motion.p
            className="text-lg"
            style={{ color: theme.colors.textMuted }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {content.body}
          </motion.p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SlideRenderer({
  slide,
  theme,
  isActive = true,
  isEditing = false,
  onElementClick,
  selectedElementId,
}: SlideRendererProps) {
  const animationVariants = getAnimationVariants(
    slide.animation.enter,
    slide.animation.duration
  );

  const renderSlideContent = () => {
    const stagger = slide.animation.stagger;

    switch (slide.type) {
      case 'title':
        return <TitleSlide slide={slide} theme={theme} />;
      case 'title-subtitle':
        return <TitleSubtitleSlide slide={slide} theme={theme} />;
      case 'stats':
        return <StatsSlide slide={slide} theme={theme} stagger={stagger} />;
      case 'grid-2':
        return <GridSlide slide={slide} theme={theme} columns={2} stagger={stagger} />;
      case 'grid-3':
        return <GridSlide slide={slide} theme={theme} columns={3} stagger={stagger} />;
      case 'grid-4':
        return <GridSlide slide={slide} theme={theme} columns={4} stagger={stagger} />;
      case 'comparison':
        return <ComparisonSlide slide={slide} theme={theme} stagger={stagger} />;
      case 'list':
        return <ListSlide slide={slide} theme={theme} stagger={stagger} />;
      case 'quote':
        return <QuoteSlide slide={slide} theme={theme} />;
      case 'timeline':
        return <TimelineSlide slide={slide} theme={theme} stagger={stagger} />;
      case 'cta':
        return <CTASlide slide={slide} theme={theme} />;
      case 'image-text':
        return <ImageTextSlide slide={slide} theme={theme} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: theme.colors.textMuted }}>
              Tipo de slide no soportado: {slide.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className={`w-full h-full ${getPaddingClass(slide.style.padding)} relative overflow-hidden`}
      style={getBackgroundStyle(slide, theme)}
    >
      {/* Background overlay for images */}
      {slide.style.backgroundType === 'image' && slide.style.backgroundOverlay && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: slide.style.backgroundOverlay }}
        />
      )}

      {/* Content container */}
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={slide.id}
            className={`relative z-10 h-full mx-auto ${getMaxWidthClass(slide.style.maxWidth)}`}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={animationVariants}
          >
            {renderSlideContent()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit mode grid overlay */}
      {isEditing && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="w-full h-full opacity-10"
            style={{
              backgroundImage: `linear-gradient(${theme.colors.border} 1px, transparent 1px),
                               linear-gradient(90deg, ${theme.colors.border} 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default SlideRenderer;
