import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronUp } from 'lucide-react';
import { money } from './store-data';
import { ProductGrid } from './product-grid';
import type { Product } from './store-data';

type CatalogPageProps = {
  view: 'home' | 'category' | 'brand' | 'all' | 'product';
  category: string;
  brand: string;
  categoryFilter: string;
  onSelect: (product: Product) => void;
  brandFilter: string;
  priceFilter: number;
  minProductPrice: number;
  maxProductPrice: number;
  setCategoryFilter: (category: string) => void;
  setBrandFilter: (brand: string) => void;
  setPriceFilter: (price: number) => void;
  items: Product[];
  categories: string[];
  brands: string[];
  cartAdd: (product: Product) => void;
};

export function CatalogPage({
  view,
  category,
  brand,
  categoryFilter,
  onSelect,
  brandFilter,
  priceFilter,
  minProductPrice,
  maxProductPrice,
  setCategoryFilter,
  setBrandFilter,
  setPriceFilter,
  items,
  categories,
  brands,
  cartAdd,
}: CatalogPageProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <section className="mx-auto max-w-[1320px] px-5 pb-24 pt-0 lg:px-10 lg:pb-28 lg:pt-2">
      <div className="flex items-start gap-1">
        <button
          onClick={() => window.location.reload()}
          aria-label="Volver al inicio"
          className="mt-1 inline-flex shrink-0 items-center text-[#9b9288] transition hover:text-[#b48b36]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[9px] tracking-[0.22em] text-[#b48b36] uppercase">
            {view === 'all'
              ? 'Catálogo completo'
              : view === 'category'
                ? 'Categoría'
                : 'Marca'}
          </p>
          <h1 className="font-serif text-4xl leading-[0.95] tracking-[-0.03em] sm:text-5xl sm:leading-normal">
            {view === 'all'
              ? 'Todos los productos'
              : view === 'category'
                ? category
                : brand}
          </h1>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9e0d4] bg-[#fffdf9]/95 px-4 py-3 shadow-[0_-4px_14px_-8px_rgba(38,35,32,0.4)] backdrop-blur-sm lg:static lg:mt-8 lg:border lg:bg-transparent lg:px-4 lg:py-4 lg:shadow-none lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-[1320px] items-end gap-3">
          <label className="min-w-0 flex-1 text-[9px] tracking-[0.1em] text-[#766e66] uppercase">
            Precio máximo{' '}
            <input
              aria-label="Filtrar por precio"
              type="range"
              min={minProductPrice}
              max={maxProductPrice}
              step="100"
              value={priceFilter}
              onChange={(e) => setPriceFilter(Number(e.target.value))}
              className="mt-1 block h-1 w-full cursor-pointer accent-[#b48b36]"
            />
            <span className="text-[10px] normal-case">
              Hasta {money(priceFilter)}
            </span>
          </label>
          {view === 'brand' ? (
            <label className="flex w-[118px] shrink-0 flex-col gap-1 text-[9px] tracking-[0.1em] text-[#766e66] uppercase">
              Categoría
              <select
                aria-label="Filtrar por categoría"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-[#ded3c6] bg-[#fffdf9] px-2.5 py-2 font-sans text-[10px] font-medium tracking-[0.05em] text-[#4e4740] uppercase shadow-sm outline-none"
              >
                <option>Todas</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex w-[118px] shrink-0 flex-col gap-1 text-[9px] tracking-[0.1em] text-[#766e66] uppercase">
              Marca
              <select
                aria-label="Filtrar por marca"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full rounded-xl border border-[#ded3c6] bg-[#fffdf9] px-2.5 py-2 font-sans text-[10px] font-medium tracking-[0.05em] text-[#4e4740] uppercase shadow-sm outline-none"
              >
                <option>Todas</option>
                {brands.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      <div className="mt-10">
        {items.length > 0 ? (
          <ProductGrid
            items={items}
            cartAdd={cartAdd}
            onSelect={onSelect}
            compactBadges
          />
        ) : (
          <div className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] px-6 py-14 text-center">
            <p className="font-serif text-2xl">No encontramos productos</p>
            <p className="mt-2 text-sm text-[#766e66]">
              Probá ajustar la categoría, la marca o el precio máximo.
            </p>
          </div>
        )}
      </div>
      {showBackToTop && (
        <button
          aria-label="Volver arriba"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-[5.5rem] right-5 z-50 flex size-10 items-center justify-center rounded-full border border-[#ded3c6] bg-[#fffdf9]/95 text-[#766e66] shadow-md transition hover:text-[#262320]"
        >
          <ChevronUp size={18} />
        </button>
      )}
    </section>
  );
}
