
interface Label {
  id: string;
  name: string;
  color: string;
  team_id?: string;
  created_by?: string;
  created_at?: string;
}

interface LabelBadgeProps {
  label: Label;
  onRemove?: () => void;
  size?: 'sm' | 'xs';
}

export default function LabelBadge({ label, onRemove, size = 'sm' }: LabelBadgeProps) {
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding} transition-all`}
      style={{ backgroundColor: label.color + '22', color: label.color, border: `1px solid ${label.color}44` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
      {label.name}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-0.5 hover:opacity-70 transition-opacity leading-none" style={{ color: label.color }}>
          x
        </button>
      )}
    </span>
  );
}
