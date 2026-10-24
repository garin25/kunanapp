'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

import { money, type Product } from './store-data';

const toneValueCollator = new Intl.Collator('es-AR', {
  numeric: true,
  sensitivity: 'base',
});

function getToneVariants(product: Product) {
  return (
    product.variants
      ?.filter(
        (variant) =>
          variant.attribute === 'Tono' || variant.attribute === 'Color'
      )
      .sort((first, second) =>
        toneValueCollator.compare(first.value, second.value)
      ) ?? []
  );
}

export function ProductDetail({
  product,
  cartAdd,
  onBack,
}: {
  product: Product;
  cartAdd: (product: Product, quantity?: number) => void;
  onBack: () => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);

  // Initialize state based on product variants
  useEffect(() => {
    // Si hay variantes de tono, autoselecciona la primera que tenga stock
    const toneVariants = getToneVariants(product);
    const firstAvailableTone = toneVariants.find(v => v.stock > 0);
    
    if (firstAvailableTone) {
      setSelectedTone(firstAvailableTone.value);
      setSelectedVariantId(firstAvailableTone.id);
    } else {
      setSelectedTone(null);
      setSelectedVariantId(null);
    }
    
    setImageIndex(0);
    setQuantity(1);
  }, [product]);

  const toneVariants = getToneVariants(product);
  const variantImageUrls = new Set(
    product.variants?.flatMap((variant) =>
      variant.image ? [variant.image] : []
    ) ?? []
  );
  const gallery = [
    ...new Set([
      product.image,
      ...(product.gallery ?? []).filter(
        (image) => !variantImageUrls.has(image)
      ),
      ...toneVariants.flatMap((variant) =>
        variant.image ? [variant.image] : []
      ),
      ...(product.variants
        ?.filter(
          (variant) =>
            variant.attribute !== 'Tono' && variant.attribute !== 'Color'
        )
        .flatMap((variant) => (variant.image ? [variant.image] : [])) ?? []),
    ]),
  ];

  const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariantId) ?? null;
  const selectedImage = gallery[imageIndex] ?? product.image;
  
  const price = selectedVariant?.price ?? product.price;
  const stock = selectedVariant?.stock ?? (product.variants?.length ? undefined : product.stock);
  
  const hasAvailableTone = toneVariants.some(v => v.stock > 0);

  const canAddToCart = stock === undefined || stock >= quantity;
  const addLabel =
    product.variants?.length && !selectedVariant
      ? 'Elegí variante'
      : canAddToCart
        ? 'Agregar al carrito'
        : 'Sin stock suficiente';

  const productToAdd = {
    ...product,
    name: selectedVariant
      ? `${product.name} (${selectedVariant.attribute}: ${selectedVariant.value})`
      : product.name,
    price,
    selectedVariant: selectedVariant ?? undefined,
  };

  const quantityStepper = (
    <div
      role="group"
      aria-label="Cantidad de unidades"
      className="flex h-9 shrink-0 items-center rounded-full border border-[#e9e0d4] bg-[#fffdf9]"
    >
      <button
        type="button"
        aria-label="Restar una unidad"
        disabled={quantity <= 1}
        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
        className="flex size-7 items-center justify-center rounded-l-full text-sm text-[#766e66] disabled:opacity-40"
      >
        −
      </button>
      <span
        className="min-w-4 text-center text-xs font-medium"
        aria-live="polite"
      >
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Sumar una unidad"
        disabled={stock !== undefined && quantity >= stock}
        onClick={() => setQuantity((current) => current + 1)}
        className="flex size-7 items-center justify-center rounded-r-full text-sm text-[#766e66] disabled:opacity-40"
      >
        +
      </button>
    </div>
  );

  const addButton = (
    <button
      type="button"
      disabled={
        !canAddToCart || Boolean(product.variants?.length && !selectedVariant)
      }
      onClick={() => cartAdd(productToAdd, quantity)}
      className="inline-flex min-w-0 flex-1 items-center justify-center rounded-full bg-[#262320] px-6 py-3 text-center text-[10px] font-semibold tracking-[0.14em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
    >
      {addLabel}
    </button>
  );

  // Group variants that are NOT Tono/Color (e.g., Diseño)
  const variantGroups = [
    ...new Set(product.variants?.filter(v => v.attribute !== 'Tono' && v.attribute !== 'Color').map((variant) => variant.attribute) ?? []),
  ];

  return (
    <section className="product-detail mx-auto flex min-h-[calc(100svh-104px)] max-w-[1180px] flex-col px-5 py-3 lg:px-10 lg:py-4">
      <button
        onClick={onBack}
        className="sticky top-20 z-30 mb-3 inline-flex items-center gap-2 self-start rounded-full border border-[#e9e0d4] bg-[#fffdf9]/95 px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-[#766e66] uppercase shadow-sm backdrop-blur transition hover:border-[#c9ae73] hover:text-[#262320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a33a32]"
      >
        <ChevronLeft size={16} />
        Volver al catálogo
      </button>
      <div className="grid flex-1 items-center gap-5 lg:grid-cols-2 lg:gap-12">
        <div className="min-w-0">
          <div
            className={`relative aspect-square max-h-[calc(100svh-190px)] overflow-hidden rounded-[2rem] bg-gradient-to-br ${product.tone}`}
          >
            <Image
              src={selectedImage}
              alt={`${product.name} vista principal`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div
              className="mt-2 grid min-w-0 grid-cols-7 gap-1 sm:gap-2"
              aria-label="Imágenes del producto"
            >
              {gallery.map((image, index) => {
                const variantForImage = product.variants?.find(
                  (variant) => variant.image === image
                );

                return (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    aria-label={
                      variantForImage
                        ? `Ver imagen del tono ${variantForImage.value}`
                        : `Ver imagen ${index + 1}`
                    }
                    aria-pressed={index === imageIndex}
                    onClick={() => setImageIndex(index)}
                    className={`relative aspect-square w-full min-w-0 overflow-hidden rounded-lg border ${index === imageIndex ? 'border-[#a33a32]' : 'border-[#e9e0d4]'}`}
                  >
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 14vw, 8vw"
                      className="object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[10px] tracking-[0.2em] text-[#b48b36] uppercase">
            {product.brand} · {product.category.join(' · ')}
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl font-semibold text-[#a33a32]">
            {money(price)}
          </p>

          {/* Tone/Color Variants */}
          {toneVariants.length > 0 && (
            <fieldset className="product-tone-selector mt-3 w-full">
              <legend className="mb-2 text-[10px] font-medium tracking-[0.1em] text-[#4e4740] uppercase">
                {selectedTone
                  ? `Selección: ${selectedTone}`
                  : hasAvailableTone
                    ? 'Elegí un tono'
                    : 'Sin stock disponible'}
              </legend>
              
              <div className="grid grid-cols-6 gap-2">
                {toneVariants.map((variant) => {
                  const isOutOfStock = variant.stock === 0;
                  const isSelected = selectedVariantId === variant.id;
                  
                  const displayValue = !isNaN(Number(variant.value)) 
                    ? String(variant.value).padStart(2, '0') 
                    : variant.value;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-label={`${variant.attribute} ${displayValue}${isOutOfStock ? ', sin stock' : ''}`}
                      aria-pressed={isSelected}
                      disabled={isOutOfStock}
                      onClick={() => {
                        setSelectedTone(variant.value);
                        setSelectedVariantId(variant.id);
                        
                        if (variant.image) {
                          const indexInGallery = gallery.findIndex(
                            (img) => img === variant.image
                          );
                          if (indexInGallery !== -1) {
                            setImageIndex(indexInGallery);
                          }
                        }
                      }}
                      className={`relative flex min-h-8 min-w-0 items-center justify-center rounded-full border px-1 text-[10px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a33a32] disabled:cursor-not-allowed ${
                        isSelected
                          ? 'border-[#a33a32] bg-[#a33a32] font-semibold text-white'
                          : 'border-[#e9c4ca] bg-white text-[#766e66]'
                      } ${isOutOfStock ? 'text-[#aaa19a] opacity-60' : ''}`}
                    >
                      {displayValue}
                      
                      {isOutOfStock && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[12%] top-1/2 h-[1.5px] w-[76%] -rotate-45 bg-[#766e66]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <p className="mt-3 max-w-md text-sm leading-6 text-[#766e66]">
            {product.description ||
              'Una pieza seleccionada para sumar belleza y estilo a tu rutina. Presentación cuidada, detalles delicados y una propuesta pensada para regalar o disfrutar todos los días.'}
          </p>

          {/* Other variants (not Tono/Color) */}
          {variantGroups.map((attribute) => (
            <fieldset key={attribute} className="mt-4">
              <legend className="mb-2 text-[10px] font-medium tracking-[0.1em] text-[#4e4740] uppercase">
                {attribute}
                {selectedVariant?.attribute === attribute
                  ? `: ${selectedVariant.value}`
                  : ''}
              </legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {product.variants
                  ?.filter((variant) => variant.attribute === attribute)
                  .map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      aria-label={`${variant.value}${variant.stock === 0 ? ', sin stock' : ''}`}
                      disabled={variant.stock === 0}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`relative min-w-0 rounded-full border px-2 py-2 text-xs transition ${selectedVariantId === variant.id ? 'border-[#a33a32] bg-[#f8e2dc] text-[#a33a32]' : 'border-[#e0d5c7] text-[#766e66]'} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {variant.value}
                      {variant.stock === 0 && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-[8%] top-1/2 h-px w-[84%] -rotate-12 bg-[#a33a32]"
                        />
                      )}
                    </button>
                  ))}
              </div>
            </fieldset>
          ))}

          <div className="mt-4 grid gap-2 border-y border-[#e9e0d4] py-3 text-xs text-[#4e4740]">
            <p>
              <span className="font-semibold">Presentación:</span>{' '}
              {product.category.includes('Ramos')
                ? 'Ramo artesanal envuelto en papel premium'
                : 'Unidad individual'}
            </p>
            <p>
              <span className="font-semibold">Disponibilidad:</span>{' '}
              {product.variants?.length && !selectedVariant
                ? 'Elegí una variante'
                : stock === undefined
                  ? 'En stock'
                  : stock > 0
                    ? `${stock} unidades`
                    : 'Sin stock'}
            </p>
            <p>
              <span className="font-semibold">Envío:</span> A todo el país
            </p>
          </div>
          <div className="mt-4 hidden items-center gap-3 lg:flex">
            {quantityStepper}
            {addButton}
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-2 border-t border-[#e9e0d4] bg-[#fffdf9]/95 px-3 py-3 shadow-[0_-4px_12px_-6px_rgba(38,35,32,0.35)] backdrop-blur-sm lg:hidden">
        <div className="shrink-0">
          <p className="text-[9px] tracking-[0.12em] text-[#766e66] uppercase">
            Total
          </p>
          <p className="text-lg font-semibold text-[#a33a32]">
            {money(price * quantity)}
          </p>
        </div>
        {quantityStepper}
        {addButton}
      </div>
    </section>
  );
}