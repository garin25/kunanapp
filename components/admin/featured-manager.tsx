'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Check, LoaderCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveProductBadges } from '@/app/admin/actions';
import type { AdminProduct } from '@/lib/admin-types';

const badgeColors = [
  { value: '#fffdf9', label: 'Marfil' },
  { value: '#f4df9c', label: 'Dorado' },
  { value: '#f8e2dc', label: 'Rosa' },
  { value: '#e5f0e2', label: 'Verde' },
  { value: '#dce9f5', label: 'Celeste' },
];

type FeaturedDraft = {
  badge: string;
  showInLanding: boolean;
  badgeColor: string;
};

function draftsFromProducts(products: AdminProduct[]) {
  return Object.fromEntries(
    products.map((product) => [
      product.id,
      {
        badge: product.badge ?? '',
        showInLanding: product.showInLanding,
        badgeColor: product.badgeColor ?? '#fffdf9',
      },
    ])
  ) as Record<number, FeaturedDraft>;
}

function serializeDrafts(drafts: Record<number, FeaturedDraft>) {
  return JSON.stringify(
    Object.entries(drafts)
      .map(([id, draft]) => ({ id: Number(id), ...draft }))
      .sort((left, right) => left.id - right.id)
  );
}

export function FeaturedManager({ products }: { products: AdminProduct[] }) {
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState(() => draftsFromProducts(products));
  const [savedDrafts, setSavedDrafts] = useState(() =>
    draftsFromProducts(products)
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const isDirty = serializeDrafts(drafts) !== serializeDrafts(savedDrafts);
  const landingCount = Object.values(drafts).filter(
    (draft) => draft.showInLanding
  ).length;
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-AR');
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.brand, product.category].some((value) =>
        value.toLocaleLowerCase('es-AR').includes(query)
      )
    );
  }, [products, search]);

  const updateDraft = (id: number, patch: Partial<FeaturedDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
    setNotice('');
  };

  const save = async () => {
    const snapshot = drafts;
    setError('');
    setNotice('');
    setPending(true);
    try {
      const result = await saveProductBadges(
        Object.entries(snapshot).map(([id, draft]) => ({
          id: Number(id),
          ...draft,
        }))
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedDrafts(snapshot);
      setNotice('Todos los cambios de destacados se guardaron correctamente.');
      router.refresh();
    } catch (saveError) {
      console.error('No se pudieron guardar los productos destacados.', saveError);
      setError('No se pudieron guardar los cambios. Intentá nuevamente.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="pb-28" aria-busy={pending}>
      <div className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-3 sm:p-6">
        <h2 className="font-serif text-2xl text-[#262320]">
          Gestionar destacados
        </h2>
        <p className="mt-1 text-xs text-[#9b9288]">
          Editá varios productos y guardá todos los cambios juntos.
        </p>
        <p className="mt-3 text-sm font-medium text-[#8c6f35]" aria-live="polite">
          {landingCount}{' '}
          {landingCount === 1 ? 'producto destacado' : 'productos destacados'} en
          la landing
        </p>
        <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#e0d5c7] bg-white px-3 py-2.5">
          <Search size={16} className="shrink-0 text-[#9b9288]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por producto, marca o categoría"
            aria-label="Buscar productos destacados"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9288]"
          />
        </label>
        <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-3">
          {filteredProducts.map((product) => {
            const draft = drafts[product.id];
            return (
              <article
                key={product.id}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 rounded-xl bg-[#fcf8f1] p-2.5 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(12rem,1.2fr)] sm:items-center sm:gap-3 sm:p-3"
              >
                <div className="relative size-10 overflow-hidden rounded-lg sm:size-12">
                  <Image
                    src={product.image}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <span className="min-w-0 self-center text-sm text-[#4e4740]">
                  <span className="block truncate">{product.name}</span>
                  <span className="block truncate text-xs text-[#9b9288]">
                    {product.brand}
                  </span>
                </span>
                <div className="col-span-2 grid gap-2 sm:col-span-1">
                  <input
                    maxLength={50}
                    value={draft.badge}
                    disabled={pending}
                    onChange={(event) =>
                      updateDraft(product.id, { badge: event.target.value })
                    }
                    placeholder="Texto de etiqueta"
                    aria-label={`Texto destacado de ${product.name}`}
                    className="min-w-0 rounded-lg border border-[#e0d5c7] bg-white px-3 py-2 text-sm outline-none focus:border-[#c9ae73]"
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-[#766e66]">
                      <input
                        type="checkbox"
                        checked={draft.showInLanding}
                        disabled={pending}
                        onChange={(event) =>
                          updateDraft(product.id, {
                            showInLanding: event.target.checked,
                          })
                        }
                        className="accent-[#a88b4c]"
                      />
                      Mostrar en Landing
                    </label>
                    <select
                      value={draft.badgeColor}
                      disabled={pending}
                      onChange={(event) =>
                        updateDraft(product.id, {
                          badgeColor: event.target.value,
                        })
                      }
                      aria-label={`Color de etiqueta de ${product.name}`}
                      className="min-w-0 rounded-lg border border-[#e0d5c7] bg-white px-2 py-2 text-xs text-[#4e4740] outline-none focus:border-[#c9ae73]"
                    >
                      {badgeColors.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className="rounded-xl bg-[#fcf8f1] px-3 py-6 text-center text-sm text-[#766e66]">
              No se encontraron productos.
            </p>
          )}
        </div>
        {(error || notice) && (
          <p
            role={error ? 'alert' : 'status'}
            className={`mt-4 text-sm ${error ? 'text-[#a33a32]' : 'text-[#3d704a]'}`}
          >
            {error || notice}
          </p>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9e0d4] bg-[#fffdf9]/95 px-4 py-3 shadow-[0_-4px_14px_-8px_rgba(38,35,32,0.4)] backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 lg:px-8">
          <p className="min-w-0 text-xs text-[#766e66]">
            {isDirty ? 'Tenés cambios sin guardar.' : 'Cambios guardados.'}
          </p>
          <button
            type="button"
            disabled={!isDirty || pending}
            onClick={save}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#262320] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#a88b4c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {pending ? 'Guardando cambios…' : 'Guardar todos los cambios'}
          </button>
        </div>
      </div>
    </section>
  );
}
