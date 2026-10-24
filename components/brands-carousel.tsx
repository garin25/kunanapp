export function BrandsCarousel({
  brands,
  onSelect,
}: {
  brands: string[];
  onSelect: (brand: string) => void;
}) {
  return (
    <section className="overflow-hidden border-y border-[#e9e0d4] bg-[#fbf8f3] px-5 py-12">
      <div className="mx-auto max-w-[1320px]">
        <p className="mb-7 text-center text-[10px] tracking-[0.25em] text-[#9b9288] uppercase">
          Comprá por marca
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => onSelect(brand)}
              className="min-w-0 truncate px-1 text-center font-serif text-lg uppercase text-[#766e66] transition hover:text-[#b48b36] sm:text-xl"
            >
              {brand}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
