import { useCMS } from '../../context/CMSContext';

interface EditableTextProps {
  contentKey: string;
  isUniversal?: boolean;
  style?: React.CSSProperties;
  className?: string;
  tagName?: keyof React.ReactHTML;
}

export function EditableText({
  contentKey,
  isUniversal = false,
  style,
  className,
  tagName = 'span'
}: EditableTextProps) {
  const { isEditing, content, updateContent, currentLanguage } = useCMS() as any;

  let value = '';
  if (content.translatable || content.universal) {
    if (isUniversal) {
      value = content.universal?.[contentKey] || '';
    } else {
      value = content.translatable?.[currentLanguage || 'en']?.[contentKey] || '';
    }
  } else {
    value = content[contentKey] || '';
  }

  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    const text = e.target.textContent || '';
    updateContent(contentKey, text, isUniversal);
  };

  const Tag = tagName as any;

  if (!isEditing) {
    return <Tag style={style} className={className}>{value}</Tag>;
  }

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={className}
      style={{
        ...style,
        outline: '1px dashed #3b82f6',
        outlineOffset: '2px',
        cursor: 'text',
        minWidth: '20px',
        display: style?.display || 'inline-block'
      }}
      title="Haga clic para editar"
    >
      {value}
    </Tag>
  );
}
