import Image from 'next/image';
import { Plus } from 'lucide-react';
import { money, type Product } from './store-data';

export function ProductCard({
  product,
  cartAdd,
  onSelect,
  mobileAdd = false,
  compactBadge = false,
}: {
  product: Product;
  cartAdd: (product: Product) => void;
  onSelect?: (product: Product) => void;
  mobileAdd?: boolean;
  compactBadge?: boolean;
}) {
  return (
    <article
      onClick={() => onSelect?.(product)}
      className="group flex cursor-pointer flex-col overflow-hidden border border-[#e9e0d4] bg-[#fffdf9] transition hover:border-[#c9ae73] hover:shadow-sm"
    >
      <div
        className={`relative flex aspect-[1.35] items-center justify-center overflow-hidden bg-gradient-to-br ${product.tone}`}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-none"
          />
        ) : (
          <span className="font-serif text-5xl italic text-white/60 transition-none">
            {product.label}
          </span>
        )}
        {product.badge && (
          <span
            className={`absolute left-2 top-2 whitespace-nowrap rounded-full font-semibold tracking-[0.04em] text-[#8b6a42] uppercase shadow-sm ${
              compactBadge
                ? 'px-2 py-0.5 text-[10px]'
                : 'px-3 py-1 text-sm sm:px-2 sm:py-0.5 sm:text-[10px]'
            }`}
            style={{ backgroundColor: product.badgeColor ?? '#fffdf9' }}
          >
            {product.badge}
          </span>
        )}
        <button
          type="button"
          aria-label={
            product.variants?.length
              ? `Ver variantes de ${product.name}`
              : `Agregar ${product.name} al carrito`
          }
          onClick={(event) => {
            event.stopPropagation();
            if (product.variants?.length) onSelect?.(product);
            else cartAdd(product);
          }}
          className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-[#262320] shadow-sm transition"
        >
          <Plus size={17} strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-2">
        <p className="text-[8px] font-medium tracking-[0.08em] text-[#9b9288] uppercase">
          {product.brand} · {product.category.join(' · ')}
        </p>
        <h3 className="mt-0.5 text-[12px] font-normal leading-4 text-[#4e4740]">
          <a
            href={product.id ? `/productos/${product.id}` : '/catalogo'}
            onClick={(event) => {
              event.stopPropagation();
              if (
                !onSelect ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              onSelect(product);
            }}
            className="hover:underline"
          >
            {product.name}
          </a>
        </h3>
        <p className="mt-auto pt-1 text-sm font-bold text-[#262320]">
          {money(product.price)}
        </p>
      </div>
    </article>
  );
}
