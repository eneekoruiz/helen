import { useCMS } from '../../context/CMSContext';

interface EditableImageProps {
  contentKey: string;
  isUniversal?: boolean;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
}

export function EditableImage({
  contentKey,
  isUniversal = true,
  style,
  className,
  alt
}: EditableImageProps) {
  const { isEditing, content, updateContent, currentLanguage } = useCMS() as any;

  let src = '';
  if (content.universal || content.translatable) {
    if (isUniversal) {
      src = content.universal?.[contentKey] || '';
    } else {
      src = content.translatable?.[currentLanguage || 'en']?.[contentKey] || '';
    }
  } else {
    src = content[contentKey] || '';
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    const newUrl = prompt('Ingrese la nueva URL de la imagen:', src);
    if (newUrl !== null) {
      updateContent(contentKey, newUrl, isUniversal);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={className}
      style={{
        position: 'relative',
        display: style?.display || 'inline-block',
        cursor: isEditing ? 'pointer' : 'default',
        width: style?.width,
        height: style?.height
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          ...style,
          display: 'block',
          width: '100%',
          height: '100%',
          border: isEditing ? '2px dashed #3b82f6' : style?.border
        }}
      />
      {isEditing && (
        <div style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: 'rgba(59, 130, 246, 0.9)',
          color: '#fff',
          padding: '4px 8px',
          fontSize: '0.75rem',
          borderRadius: '4px',
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          📷 Cambiar
        </div>
      )}
    </div>
  );
}
