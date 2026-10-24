'use client';

import Image from 'next/image';
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  CirclePlus,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { FeaturedManager } from '@/components/admin/featured-manager';
import { HeroManager } from '@/components/admin/hero-manager';
import { OrdersManager } from '@/components/admin/orders-manager';
import {
  createProduct,
  deleteProduct,
  logoutAdmin,
  saveTaxonomy,
  updateProduct,
} from '@/app/admin/actions';
import type { ActionState } from '@/app/admin/actions';
import type { AdminProduct } from '@/lib/admin-types';
import type {
  AdminOrdersPage,
} from '@/lib/order-reservations';
import type { HeroSlide } from '@/components/store-data';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'product-form', label: 'Nuevo producto', icon: CirclePlus },
  { id: 'taxonomies', label: 'Taxonomías', icon: Tags },
  { id: 'hero', label: 'Carrusel hero', icon: ImagePlus },
  { id: 'featured', label: 'Destacados', icon: BarChart3 },
];

type Variant = {
  id: number;
  attribute: string;
  value: string;
  stock: string;
  image: string;
  differentPrice: boolean;
  price: string;
};

function money(value: number) {
  return `$${value.toLocaleString('es-AR')}`;
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Package;
}) {
  return (
    <div className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium tracking-[0.16em] text-[#9b9288] uppercase">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#262320]">
            {value}
          </p>
          <p className="mt-2 text-xs text-[#9b9288]">{detail}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#f1e7d7] text-[#a88b4c]">
          <Icon data-icon="inline-start" />
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  onClose,
  onConfirm,
  pending,
  error,
}: {
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#262320]/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="critical-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f8e9d2] text-[#a4742c]">
            <AlertTriangle />
          </div>
          <div>
            <h2
              id="critical-title"
              className="font-serif text-2xl text-[#262320]"
            >
              Confirmar eliminación
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#766e66]">
              ¿Deseas eliminar este producto? Esta acción no se puede deshacer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto text-[#9b9288] transition hover:text-[#262320]"
          >
            <X />
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-[#a33a32]">
            {error}
          </p>
        )}
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-full border border-[#e0d5c7] px-4 py-2.5 text-xs font-medium text-[#766e66] transition hover:bg-[#f6efe5] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded-full bg-[#262320] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#a33a32] disabled:opacity-50"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Eliminando…
              </span>
            ) : (
              'Eliminar producto'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductTable({
  products,
  onNew,
  onEdit,
  onDelete,
}: {
  products: AdminProduct[];
  onNew: () => void;
  onEdit: (product: AdminProduct) => void;
  onDelete: (id: number) => void;
}) {
  const [search, setSearch] = useState('');
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-AR');
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.brand, product.category, String(product.id)].some(
        (value) => value.toLocaleLowerCase('es-AR').includes(query)
      )
    );
  }, [products, search]);

  return (
    <div className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9]">
      <div className="flex flex-col gap-4 border-b border-[#e9e0d4] p-4 sm:p-5">
        <div>
          <h2 className="font-serif text-2xl text-[#262320]">Productos</h2>
          <p className="mt-1 text-xs text-[#9b9288]">
            Administrá el catálogo y el stock disponible.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#e0d5c7] bg-white px-3 py-2.5">
            <Search size={16} className="shrink-0 text-[#9b9288]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por producto, marca, categoría o ID"
              aria-label="Buscar productos"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9288]"
            />
          </label>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#262320] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#a88b4c]"
          >
            <Plus data-icon="inline-start" />
            Nuevo producto
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-[#fcf7ef] text-[10px] tracking-[0.14em] text-[#9b9288] uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Foto</th>
              <th className="px-3 py-3 font-medium">Producto</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">Categoría</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">Marca</th>
              <th className="px-3 py-3 font-medium">Precio</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-5 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee6dc]">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="transition hover:bg-[#fffaf3]">
                <td className="px-5 py-3">
                  <img
                    src={product.image}
                    alt=""
                    className="size-11 rounded-xl object-cover"
                  />
                </td>
                <td className="px-3 py-3 font-medium text-[#403a35]">
                  {product.name}
                  <span className="mt-1 block text-[10px] text-[#aaa096]">
                    ID #{product.id}
                  </span>
                </td>
                <td className="hidden px-3 py-3 text-[#766e66] md:table-cell">
                  {product.category || '—'}
                </td>
                <td className="hidden px-3 py-3 text-[#766e66] md:table-cell">
                  {product.brand || '—'}
                </td>
                <td className="px-3 py-3 font-medium text-[#403a35]">
                  {money(product.price)}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${product.stock < 5 ? 'bg-[#f8e2dc] text-[#a33a32]' : 'bg-[#e5f0e2] text-[#4d7548]'}`}
                  >
                    {product.stock} unidades
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${product.name}`}
                      onClick={() => onEdit(product)}
                      className="flex size-8 items-center justify-center rounded-full text-[#9b9288] transition hover:bg-[#f1e7d7] hover:text-[#8c6f35]"
                    >
                      <Pencil />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar ${product.name}`}
                      onClick={() => onDelete(product.id)}
                      className="flex size-8 items-center justify-center rounded-full text-[#9b9288] transition hover:bg-[#f8e2dc] hover:text-[#a33a32]"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-sm text-[#766e66]"
                >
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductForm({
  onCancel,
  brands,
  categories,
  initialProduct,
}: {
  onCancel: () => void;
  brands: string[];
  categories: string[];
  initialProduct?: AdminProduct;
}) {
  const [variants, setVariants] = useState<Variant[]>(
    () =>
      initialProduct?.variants.map((variant, index) => ({
        id: index + 1,
        attribute: variant.attribute,
        value: variant.value,
        stock: String(variant.stock),
        image: variant.image,
        differentPrice: variant.price !== null,
        price: variant.price === null ? '' : String(variant.price),
      })) ?? []
  );
  const [removedGalleryIds, setRemovedGalleryIds] = useState<number[]>([]);
  const saveAction = initialProduct
    ? updateProduct.bind(null, initialProduct.id)
    : createProduct;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveAction,
    {}
  );
  const router = useRouter();
  const addVariant = () =>
    setVariants((current) => [
      ...current,
      {
        id: Date.now(),
        attribute: 'Tono',
        value: '',
        stock: '',
        image: '',
        differentPrice: false,
        price: '',
      },
    ]);
  const updateVariant = (id: number, patch: Partial<Variant>) =>
    setVariants((current) =>
      current.map((variant) =>
        variant.id === id ? { ...variant, ...patch } : variant
      )
    );
  if (state.success)
    return (
      <div className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-6">
        <p role="status" className="text-sm text-[#4d7548]">
          Producto guardado correctamente.
        </p>
        <button
          type="button"
          onClick={() => {
            router.refresh();
            onCancel();
          }}
          className="mt-4 rounded-full bg-[#262320] px-4 py-2.5 text-xs font-medium text-white"
        >
          Volver a productos
        </button>
      </div>
    );
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#262320]">
            {initialProduct ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <p className="mt-1 text-xs text-[#9b9288]">
            Cargá la información que va a ver tu comunidad.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[#e0d5c7] px-4 py-2 text-xs text-[#766e66] transition hover:bg-[#f6efe5]"
        >
          Cancelar
        </button>
      </div>
      <form
        action={formAction}
        className="space-y-5"
      >
        <input
          type="hidden"
          name="variants"
          value={JSON.stringify(
            variants.map(({ image: _image, ...variant }) => variant)
          )}
        />
        <input
          type="hidden"
          name="removedGalleryIds"
          value={JSON.stringify(removedGalleryIds)}
        />
        <section className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#f1e7d7] text-[#a88b4c]">
              <Package />
            </div>
            <div>
              <h3 className="font-medium text-[#262320]">
                {initialProduct ? 'Editar producto' : 'Nuevo producto'}
              </h3>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
              Nombre
              <input
                name="name"
                required
                maxLength={255}
                defaultValue={initialProduct?.name ?? ''}
                placeholder="Ej. Base líquida Skin ID"
                className="rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#c9ae73]"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
              Marca
              <select
                name="brand"
                defaultValue={initialProduct?.brand ?? ''}
                className="rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#c9ae73]"
              >
                <option value="">Sin marca</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
              Categoría
              <select
                name="category"
                defaultValue={initialProduct?.category ?? ''}
                className="rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#c9ae73]"
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
              Precio base
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={initialProduct?.price ?? ''}
                placeholder="0"
                className="rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#c9ae73]"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
              Stock general
              <input
                name="stockGeneral"
                type="number"
                min="0"
                defaultValue={initialProduct?.stockGeneral ?? ''}
                required={!variants.length}
                disabled={variants.length > 0}
                placeholder={
                  variants.length ? 'Se calcula con las variantes' : '0'
                }
                className="rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#c9ae73] disabled:opacity-50"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66] sm:col-span-2">
              Descripción
              <textarea
                name="description"
                maxLength={5000}
                defaultValue={initialProduct?.description ?? ''}
                rows={3}
                placeholder="Contale a tus clientes qué hace especial a este producto"
                className="resize-none rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#c9ae73]"
              />
            </label>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
              Imagen principal
              {initialProduct?.imageUrl && (
                <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border border-[#e9e0d4] bg-[#fcf8f1]">
                  <Image
                    src={initialProduct.imageUrl}
                    alt={`Imagen actual de ${initialProduct.name}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 320px"
                    className="object-contain"
                  />
                </div>
              )}
              <input
                name="mainImageFile"
                type="file"
                accept="image/*"
                required={!initialProduct?.imageUrl}
                className="w-full min-w-0 rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-2 py-2 text-xs font-normal outline-none file:mr-3 file:rounded-full file:border-0 file:bg-[#f1e7d7] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[#766e66] focus:border-[#c9ae73]"
              />
              <span className="text-[11px] font-normal text-[#9b9288]">
                {initialProduct?.imageUrl
                  ? 'La imagen actual se conserva si no elegís otra. Para reemplazarla, seleccioná un archivo.'
                  : 'Elegí un archivo de imagen para cargar el producto.'}
              </span>
            </label>
            <div className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
              Galería de imágenes secundarias
              {initialProduct?.gallery.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {initialProduct.gallery
                    .filter(
                      (image) => !removedGalleryIds.includes(image.id)
                    )
                    .map((image, index) => (
                      <div
                        key={image.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-[#e9e0d4]"
                      >
                        <Image
                          src={image.imageUrl}
                          alt={`Imagen secundaria ${index + 1} de ${initialProduct.name}`}
                          fill
                          sizes="(max-width: 640px) 30vw, 100px"
                          className="object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Quitar imagen secundaria ${index + 1}`}
                          onClick={() =>
                            setRemovedGalleryIds((current) => [
                              ...current,
                              image.id,
                            ])
                          }
                          className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-white/95 text-[#a33a32] shadow"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[11px] font-normal text-[#9b9288]">
                  Todavía no hay imágenes secundarias cargadas.
                </p>
              )}
              <input
                name="galleryFiles"
                type="file"
                accept="image/*"
                multiple
                className="w-full min-w-0 rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-2 py-2 text-xs font-normal outline-none file:mr-3 file:rounded-full file:border-0 file:bg-[#f1e7d7] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[#766e66] focus:border-[#c9ae73]"
              />
              <span className="text-[11px] font-normal text-[#9b9288]">
                Es opcional: podés agregar varias imágenes a la galería en una
                sola selección (hasta 20 en total). En el celular, tocá
                “Elegir archivos” y seleccioná las imágenes. Las imágenes
                existentes se conservan; no hace falta copiar ninguna URL.
              </span>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium text-[#262320]">Variantes</h3>
              <p className="text-xs text-[#9b9288]">
                Sumá tonos, diseños o presentaciones específicas.
              </p>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-[#c9ae73] px-3 py-2 text-xs font-medium text-[#8c6f35] transition hover:bg-[#f6efe5]"
            >
              <Plus data-icon="inline-start" />
              Agregar variante
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {variants.map((variant, index) => (
              <div
                key={variant.id}
                className="rounded-xl border border-[#eee6dc] bg-[#fcf8f1] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-[0.14em] text-[#a88b4c] uppercase">
                    Variante {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setVariants((current) =>
                        current.filter((item) => item.id !== variant.id)
                      )
                    }
                    aria-label="Eliminar variante"
                    className="text-[#9b9288] hover:text-[#a33a32]"
                  >
                    <X />
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    aria-label="Atributo"
                    value={variant.attribute}
                    onChange={(event) =>
                      updateVariant(variant.id, {
                        attribute: event.target.value,
                      })
                    }
                    placeholder="Atributo"
                    className="rounded-lg border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2 text-sm outline-none focus:border-[#c9ae73]"
                  />
                  <input
                    aria-label="Valor"
                    value={variant.value}
                    onChange={(event) =>
                      updateVariant(variant.id, { value: event.target.value })
                    }
                    placeholder="Valor"
                    className="rounded-lg border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2 text-sm outline-none focus:border-[#c9ae73]"
                  />
                  <input
                    aria-label="Stock"
                    type="number"
                    min="0"
                    value={variant.stock}
                    onChange={(event) =>
                      updateVariant(variant.id, { stock: event.target.value })
                    }
                    placeholder="Stock"
                    className="rounded-lg border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2 text-sm outline-none focus:border-[#c9ae73]"
                  />
                  <input
                    aria-label={`Imagen de variante ${index + 1}`}
                    name={`variantImage-${index}`}
                    type="file"
                    accept="image/*"
                    className="w-full min-w-0 rounded-lg border border-[#e0d5c7] bg-[#fffdf9] px-2 py-2 text-xs outline-none file:mr-2 file:rounded-full file:border-0 file:bg-[#f1e7d7] file:px-2 file:py-1.5 file:text-xs file:text-[#766e66] focus:border-[#c9ae73] md:col-span-4"
                  />
                </div>
                {variant.image && (
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-[#9b9288]">
                    <div className="relative size-14 overflow-hidden rounded-lg border border-[#e9e0d4]">
                      <Image
                        src={variant.image}
                        alt={`Imagen actual de la variante ${variant.value || index + 1}`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <span>
                      Imagen actual. Para cambiarla, seleccioná otro archivo.
                    </span>
                  </div>
                )}
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-[#766e66]">
                  <input
                    type="checkbox"
                    checked={variant.differentPrice}
                    onChange={(event) =>
                      updateVariant(variant.id, {
                        differentPrice: event.target.checked,
                      })
                    }
                    className="size-4 accent-[#a88b4c]"
                  />
                  Precio propio para esta variante
                </label>
                {variant.differentPrice && (
                  <label className="mt-3 flex max-w-xs flex-col gap-2 text-xs font-medium text-[#766e66]">
                    Precio de variante
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price}
                      onChange={(event) =>
                        updateVariant(variant.id, {
                          price: event.target.value,
                        })
                      }
                      placeholder="0"
                      className="rounded-lg border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2 text-sm font-normal outline-none focus:border-[#c9ae73]"
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>
        {state.error && (
          <p role="alert" className="text-sm text-[#a33a32]">
            {state.error}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-[#262320] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#a88b4c] disabled:opacity-60"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {pending
              ? 'Guardando…'
              : initialProduct
                ? 'Guardar cambios'
                : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Taxonomies({
  brands,
  categories,
}: {
  brands: string[];
  categories: string[];
}) {
  const [brandInput, setBrandInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const mutate = (kind: 'brand' | 'category', name: string, remove = false) =>
    startTransition(async () => {
      setError('');
      setNotice('');
      try {
        const result = await saveTaxonomy(kind, name, remove);
        if (result.error) {
          setError(result.error);
          return;
        }
        setNotice(remove ? 'Se eliminó correctamente.' : 'Se agregó correctamente.');
        router.refresh();
      } catch (mutationError) {
        console.error('No se pudo actualizar la taxonomía.', mutationError);
        setError('No se pudo completar la acción. Intentá nuevamente.');
      }
    });
  const list = (
    kind: 'brand' | 'category',
    title: string,
    items: string[],
    input: string,
    setInput: (value: string) => void
  ) => (
    <div className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-5 sm:p-6">
      <h2 className="font-serif text-2xl text-[#262320]">{title}</h2>
      <div className="mt-5 flex gap-2">
        <input
          value={input}
          disabled={pending}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (input.trim()) mutate(kind, input.trim());
              setInput('');
            }
          }}
          placeholder={`Nueva ${title.toLowerCase().slice(0, -1)}`}
          className="min-w-0 flex-1 rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-2.5 text-sm outline-none focus:border-[#c9ae73]"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (input.trim()) mutate(kind, input.trim());
            setInput('');
          }}
          aria-label={`Agregar ${title}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#262320] text-white transition hover:bg-[#a88b4c] disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Plus />
          )}
        </button>
      </div>
      <ul className="mt-5 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center justify-between rounded-xl bg-[#fcf8f1] px-3 py-3 text-sm text-[#4e4740]"
          >
            <span>{item}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  window.confirm(
                    `¿Eliminar ${item}? Esta acción no se puede deshacer.`
                  )
                )
                  mutate(kind, item, true);
              }}
              aria-label={`Eliminar ${item}`}
              className="text-[#aaa096] transition hover:text-[#a33a32] disabled:opacity-50"
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {list('brand', 'Marcas', brands, brandInput, setBrandInput)}
      {list(
        'category',
        'Categorías',
        categories,
        categoryInput,
        setCategoryInput
      )}
      {error && (
        <p role="alert" className="text-sm text-[#a33a32]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-[#3d704a]">
          {notice}
        </p>
      )}
    </div>
  );
}

export function AdminPanel({
  initialProducts,
  initialOrdersPage,
  initialHeroSlides,
  brands,
  categories,
}: {
  initialProducts: AdminProduct[];
  initialOrdersPage: AdminOrdersPage;
  initialHeroSlides: HeroSlide[];
  brands: string[];
  categories: string[];
}) {
  const initialOrders = initialOrdersPage.orders;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null
  );
  const [deletionError, setDeletionError] = useState('');
  const [dialogProduct, setDialogProduct] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const router = useRouter();
  const products = initialProducts;
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const activeLabel =
    navItems.find((item) => item.id === activeTab)?.label ?? 'Dashboard';
  const lowStock = useMemo(
    () => products.filter((product) => product.stock < 5).length,
    [products]
  );
  const renderContent = () => {
    if (activeTab === 'orders')
      return <OrdersManager initialPage={initialOrdersPage} />;
    if (activeTab === 'products')
      return (
        <ProductTable
          products={products}
          onNew={() => {
            setEditingProduct(null);
            setActiveTab('product-form');
          }}
          onEdit={(product) => {
            setEditingProduct(product);
            setActiveTab('product-form');
          }}
          onDelete={(id) => {
            setDeletionError('');
            setDialogProduct(id);
          }}
        />
      );
    if (activeTab === 'product-form')
      return (
        <ProductForm
          onCancel={() => {
            setEditingProduct(null);
            setActiveTab('products');
          }}
          brands={brands}
          categories={categories}
          initialProduct={editingProduct ?? undefined}
        />
      );
    if (activeTab === 'taxonomies')
      return <Taxonomies brands={brands} categories={categories} />;
    if (activeTab === 'hero')
      return <HeroManager initialSlides={initialHeroSlides} />;
    if (activeTab === 'featured')
      return <FeaturedManager products={products} />;

    return (
      <>
        <div className="mb-7">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a88b4c] uppercase">
            Buenos días, equipo
          </p>
          <h2 className="mt-2 font-serif text-4xl tracking-[-0.03em] text-[#262320]">
            Todo bajo control.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#766e66]">
            Una mirada rápida a lo que está pasando en Kunan hoy.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Ventas del mes"
            value="—"
            detail="No se contabilizan ventas confirmadas"
            icon={CircleDollarSign}
          />
          <StatCard
            label="Pedidos"
            value={String(
              initialOrders.filter((order) => order.status === 'PENDIENTE')
                .length
            )}
            detail="Reservas pendientes de confirmar"
            icon={ShoppingBag}
          />
          <StatCard
            label="Productos"
            value={String(products.length)}
            detail="Catálogo activo"
            icon={Boxes}
          />
          <StatCard
            label="Stock bajo"
            value={String(lowStock)}
            detail="Requieren atención"
            icon={BarChart3}
          />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl text-[#262320]">
                  Acciones rápidas
                </h3>
                <p className="mt-1 text-xs text-[#9b9288]">
                  Lo más usado, a un clic.
                </p>
              </div>
              <Settings2 className="text-[#c9ae73]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickAction
                icon={ShoppingBag}
                label="Revisar pedidos"
                onClick={() => setActiveTab('orders')}
              />
              <QuickAction
                icon={CirclePlus}
                label="Nuevo producto"
                onClick={() => setActiveTab('product-form')}
              />
              <QuickAction
                icon={ImagePlus}
                label="Editar carrusel Hero"
                onClick={() => setActiveTab('hero')}
              />
              <QuickAction
                icon={Tags}
                label="Gestionar destacados"
                onClick={() => setActiveTab('featured')}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-[#e9e0d4] bg-[#262320] p-5 text-[#fffdf9] sm:p-6">
            <p className="text-[10px] tracking-[0.16em] text-[#c9ae73] uppercase">
              Última actividad
            </p>
            <p className="mt-5 font-serif text-2xl">
              Tu tienda está creciendo.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Revisá los productos con stock bajo para no perder oportunidades
              de venta.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-[#f0dca8]"
            >
              Ver productos <ChevronRight />
            </button>
          </div>
        </div>
      </>
    );
  };

  const confirmDelete = () => {
    const id = dialogProduct;
    if (id === null) return;

    startDelete(async () => {
      const result = await deleteProduct(id);
      if (result.error) {
        setDeletionError(result.error);
        return;
      }
      setDialogProduct(null);
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f4ee] text-[#262320]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#e9e0d4] bg-[#fffdf9] transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-20 items-center border-b border-[#e9e0d4] px-7">
          <span className="font-serif text-3xl tracking-[-0.06em]">kunan</span>
          <span className="ml-2 mt-1 text-[9px] tracking-[0.16em] text-[#a88b4c] uppercase">
            admin
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeTab === item.id ? 'bg-[#f1e7d7] font-medium text-[#8c6f35]' : 'text-[#766e66] hover:bg-[#fcf8f1] hover:text-[#262320]'}`}
            >
              <item.icon data-icon="inline-start" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e9e0d4] bg-[#fffdf9]/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-[#e0d5c7] text-[#766e66] lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu />
            </button>
            <div>
              <p className="text-[10px] tracking-[0.16em] text-[#aaa096] uppercase">
                Panel de administración
              </p>
              <h1 className="text-sm font-medium">{activeLabel}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-[#e0d5c7] px-3 py-2 text-xs text-[#766e66] transition hover:bg-[#f6efe5]"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </form>
            <div className="flex size-9 items-center justify-center rounded-full bg-[#262320] text-xs font-medium text-white">
              AG
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-5 sm:p-8">
          {renderContent()}
        </main>
      </div>
      {dialogProduct !== null && (
        <ConfirmDialog
          pending={deletePending}
          error={deletionError}
          onClose={() => setDialogProduct(null)}
          onConfirm={confirmDelete}
        />
      )}
      {showBackToTop && (
        <button
          type="button"
          aria-label="Volver arriba"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed right-5 z-50 flex size-11 items-center justify-center rounded-full border border-[#ded3c6] bg-[#fffdf9]/95 text-[#766e66] shadow-md transition hover:text-[#262320] lg:hidden ${activeTab === 'featured' ? 'bottom-24' : 'bottom-5'}`}
        >
          <ChevronUp size={19} />
        </button>
      )}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 flex-col items-start justify-between rounded-xl border border-[#e9e0d4] bg-[#fcf8f1] p-4 text-left transition hover:border-[#c9ae73] hover:bg-[#f6efe5]"
    >
      <Icon className="text-[#a88b4c]" />
      <span className="text-xs font-medium text-[#4e4740]">{label}</span>
    </button>
  );
}
