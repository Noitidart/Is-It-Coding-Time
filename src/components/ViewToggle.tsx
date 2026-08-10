export type ViewChoice = 'compact' | 'details';

interface ViewToggleProps {
  value: ViewChoice;
  onChange: (value: ViewChoice) => void;
}

const options: { value: ViewChoice; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'details', label: 'Details' },
];

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-white/10 dark:bg-zinc-900/60">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1 text-sm ${
            value === option.value
              ? 'bg-zinc-200/70 font-semibold text-zinc-900 dark:bg-white/15 dark:text-white'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
