import { useCMS } from '../../context/CMSContext';

interface EditableLinkProps {
  textKey: string;
  urlKey: string;
  isUniversal?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function EditableLink({
  textKey,
  urlKey,
  isUniversal = false,
  style,
  className
}: EditableLinkProps) {
  const { isEditing, content, updateContent, currentLanguage } = useCMS() as any;

  let text = '';
  let href = '';

  if (content.translatable || content.universal) {
    if (isUniversal) {
      text = content.universal?.[textKey] || '';
      href = content.universal?.[urlKey] || '';
    } else {
      text = content.translatable?.[currentLanguage || 'en']?.[textKey] || '';
      href = content.translatable?.[currentLanguage || 'en']?.[urlKey] || '';
    }
  } else {
    text = content[textKey] || '';
    href = content[urlKey] || '';
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    
    const newText = prompt('Editar texto del enlace:', text);
    if (newText !== null && newText.trim() !== '') {
      updateContent(textKey, newText, isUniversal);
      
      const newUrl = prompt('Editar URL de destino:', href);
      if (newUrl !== null) {
        updateContent(urlKey, newUrl, isUniversal);
      }
    }
  };

  return (
    <a
      href={isEditing ? '#' : href}
      onClick={handleClick}
      className={className}
      style={{
        ...style,
        borderBottom: isEditing ? '1px dashed #3b82f6' : style?.borderBottom,
        cursor: isEditing ? 'pointer' : style?.cursor
      }}
      title={isEditing ? 'Haga clic para editar enlace' : undefined}
    >
      {text}
    </a>
  );
}
