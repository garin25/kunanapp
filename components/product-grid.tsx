import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './product-card';
import { productKey, type Product } from './store-data';

export function ProductGrid({
  items,
  cartAdd,
  onSelect,
  mobileCarousel = false,
  compactBadges = false,
}: {
  items: Product[];
  cartAdd: (product: Product) => void;
  onSelect?: (product: Product) => void;
  mobileCarousel?: boolean;
  compactBadges?: boolean;
}) {
  const [active, setActive] = useState(0);
  const itemKey = items.map(productKey).join('|');
  useEffect(() => {
    setActive(0);
  }, [itemKey]);
  useEffect(() => {
    if (!mobileCarousel || items.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % items.length),
      5000
    );
    return () => window.clearInterval(timer);
  }, [items.length, mobileCarousel]);
  const current = items[active % Math.max(items.length, 1)];
  return (
    <>
      <div className={mobileCarousel ? 'relative pb-5 sm:hidden' : 'hidden'}>
        {current && (
          <ProductCard
            key={productKey(current)}
            product={current}
            cartAdd={cartAdd}
            onSelect={onSelect}
            mobileAdd
            compactBadge={compactBadges}
          />
        )}{' '}
        {items.length > 1 && (
          <>
            <button
              aria-label="Producto anterior"
              onClick={() =>
                setActive((active - 1 + items.length) % items.length)
              }
              className="absolute left-0 top-[38%] flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#fbf8f3]/80 text-[#766e66] transition hover:text-[#262320]"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              aria-label="Producto siguiente"
              onClick={() => setActive((active + 1) % items.length)}
              className="absolute right-0 top-[38%] flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#fbf8f3]/80 text-[#766e66] transition hover:text-[#262320]"
            >
              <ChevronRight size={17} />
            </button>
            <div
              className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-1.5"
              aria-label={`Producto ${active + 1} de ${items.length}`}
            >
              {items.map((product, index) => (
                <button
                  key={productKey(product)}
                  type="button"
                  aria-label={`Ir al producto ${index + 1}`}
                  onClick={() => setActive(index)}
                  className={`size-1.5 rounded-full transition ${index === active ? 'bg-[#8b6a42]' : 'bg-[#d8cbbd]'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div
        className={
          mobileCarousel
            ? 'hidden sm:grid sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5'
            : 'grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5'
        }
      >
        {items.map((product) => (
          <ProductCard
            key={productKey(product)}
            product={product}
            cartAdd={cartAdd}
            onSelect={onSelect}
            compactBadge={compactBadges}
          />
        ))}
      </div>
    </>
  );
}
