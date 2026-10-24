import { ChevronDown } from 'lucide-react';

export function DesktopMenu({
  label,
  items,
  type,
  onNavigate,
}: {
  label: string;
  items: string[];
  type: 'category' | 'brand';
  onNavigate: (type: 'category' | 'brand', value: string) => void;
}) {
  return (
    <div className="group relative flex h-full items-center">
      <button
        className="flex items-center gap-1 font-sans text-[10px] font-medium tracking-[0.12em] uppercase text-[#4e4740]"
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className="size-3 transition-transform group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-1/2 top-full z-30 w-56 max-h-[calc(100vh-110px)] -translate-x-1/2 translate-y-2 overflow-y-auto border border-[#e9e0d4] bg-[#fbf8f3] p-2 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button
              key={item}
              onClick={() => onNavigate(type, item)}
              className="px-3 py-3 text-left text-[10px] tracking-[0.12em] uppercase transition hover:bg-[#eee4d6] hover:text-[#b48b36]"
            >
              {type === 'brand' ? item.toLocaleUpperCase('es-AR') : item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
