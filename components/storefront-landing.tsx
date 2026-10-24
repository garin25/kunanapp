import { BrandsCarousel } from './brands-carousel';
import { HeroCarousel } from './hero-carousel';
import { ProductGrid } from './product-grid';
import type { HeroSlide, Product } from './store-data';

export function StorefrontLanding({
  categories,
  products,
  brands,
  heroSlides,
  cartAdd,
  onCategorySelect,
  onProductSelect,
  onOpenAll,
  onBrandSelect,
}: {
  categories: string[];
  products: Product[];
  brands: string[];
  heroSlides: HeroSlide[];
  cartAdd: (product: Product) => void;
  onCategorySelect: (category: string) => void;
  onProductSelect: (product: Product) => void;
  onOpenAll: () => void;
  onBrandSelect: (brand: string) => void;
}) {
  return (
    <>
      <HeroCarousel onProducts={onOpenAll} slides={heroSlides} />
      <section
        id="categorias"
        className="border-y border-[#e9e0d4] bg-[#f5eee5] px-5 py-8"
      >
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-between">
          <p className="text-[10px] tracking-[0.2em] text-[#9b9288] uppercase">
            Explorá por categoría
          </p>
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => onCategorySelect(item)}
              className="text-[11px] tracking-[0.15em] uppercase transition hover:text-[#b48b36]"
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <section
        id="productos"
        className="mx-auto max-w-[1320px] px-5 py-8 lg:px-10 lg:py-16"
      >
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-3 text-[10px] tracking-[0.25em] text-[#b48b36] uppercase">
              Descubrí tu próximo favorito
            </p>
            <h2 className="font-serif text-[24px] tracking-[-0.03em] sm:text-5xl">
              Productos en{' '}
              <span className="font-sans font-bold text-[#d52f2f] italic tracking-[-0.04em]">
                tendencia
              </span>
            </h2>
          </div>
          <button
            onClick={onOpenAll}
            className="mb-1 inline-flex shrink-0 whitespace-nowrap rounded-full border border-[#262320] px-4 py-3 text-[10px] tracking-[0.16em] uppercase transition hover:bg-[#262320] hover:text-white"
          >
            Ver más
          </button>
        </div>
        <ProductGrid
          items={products}
          cartAdd={cartAdd}
          onSelect={onProductSelect}
          mobileCarousel
        />
      </section>
      <section
        id="nosotras"
        className="bg-[#262320] px-5 py-16 text-[#fbf8f3] lg:px-10"
      >
        <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-[10px] tracking-[0.25em] text-[#d5b45b] uppercase">
              Sobre Kunan
            </p>
            <h2 className="font-serif text-4xl sm:text-5xl">
              Belleza para disfrutar{' '}
              <span className="italic text-[#d5b45b]">a tu manera.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-[#c8c0b7] lg:flex lg:items-center lg:justify-center">
            Elegimos cada producto pensando en vos, en tus días de autocuidado y
            en ese detalle para regalar.
          </p>
        </div>
      </section>
      <BrandsCarousel brands={brands} onSelect={onBrandSelect} />
    </>
  );
}
