'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import {
  Search,
  ShoppingCart,
  Menu,
  X,
  Camera,
  MessageCircle,
  Heart,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';

import {
  cartItemKey,
  money,
  productKey,
  type HeroSlide,
  type Product,
} from './store-data';
import { ProductCard } from '../components/product-card';
import { ProductDetail } from '../components/product-detail';
import { DesktopMenu } from '../components/desktop-menu';
import { CatalogPage } from '../components/catalog-page';
import { StorefrontLanding } from '../components/storefront-landing';
import { createOrderReservationAction } from '@/app/orders/actions';

type StorefrontProps = {
  products: Product[];
  categories: string[];
  brands: string[];
  heroSlides: HeroSlide[];
  initialView?: 'home' | 'category' | 'brand' | 'all' | 'product';
  initialProductId?: number;
  initialCategory?: string;
  initialBrand?: string;
  initialCategoryFilter?: string;
  initialBrandFilter?: string;
  initialPriceFilter?: number;
  initialSearch?: string;
};

const cartStorageKey = 'kunan-cart-v1';
const maxCartLineItems = 50;
const maxCartItemQuantity = 100;
const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';
const isWhatsAppConfigured = /^\d{10,15}$/.test(whatsappNumber);

function restoreCartItems(
  storedValue: string,
  products: Product[]
): Record<string, { product: Product; quantity: number }> {
  const parsed: unknown = JSON.parse(storedValue);
  if (!Array.isArray(parsed)) return {};

  const productsById = new Map(
    products.flatMap((product) =>
      product.id === undefined ? [] : [[product.id, product] as const]
    )
  );
  const restored: Record<string, { product: Product; quantity: number }> = {};

  for (const entry of parsed.slice(0, maxCartLineItems)) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    if (
      typeof record.productId !== 'number' ||
      !Number.isInteger(record.productId) ||
      typeof record.quantity !== 'number' ||
      !Number.isInteger(record.quantity) ||
      record.quantity < 1 ||
      record.quantity > maxCartItemQuantity ||
      (record.variantId !== null &&
        (typeof record.variantId !== 'number' ||
          !Number.isInteger(record.variantId)))
    )
      continue;

    const product = productsById.get(record.productId);
    if (!product) continue;

    const selectedVariant =
      record.variantId === null
        ? undefined
        : product.variants?.find((variant) => variant.id === record.variantId);
    if (
      (record.variantId !== null && !selectedVariant) ||
      (product.variants?.length && !selectedVariant)
    )
      continue;

    const cartProduct = selectedVariant
      ? {
          ...product,
          name: `${product.name} (${selectedVariant.attribute}: ${selectedVariant.value})`,
          price: selectedVariant.price ?? product.price,
          selectedVariant,
        }
      : product;
    restored[cartItemKey(cartProduct)] = {
      product: cartProduct,
      quantity: record.quantity,
    };
  }

  return restored;
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('es-AR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function editDistanceWithin(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) return false;
  let previousRow = Array.from(
    { length: right.length + 1 },
    (_, index) => index
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const currentRow = [leftIndex];
    let rowMinimum = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        currentRow[rightIndex - 1] + 1,
        previousRow[rightIndex] + 1,
        previousRow[rightIndex - 1] + cost
      );
      currentRow.push(distance);
      rowMinimum = Math.min(rowMinimum, distance);
    }
    if (rowMinimum > maxDistance) return false;
    previousRow = currentRow;
  }

  return previousRow[right.length] <= maxDistance;
}

function matchesSearch(values: string[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedValues = values.map(normalizeSearchText);
  if (normalizedValues.some((value) => value.includes(normalizedQuery)))
    return true;

  const valueWords = normalizedValues.flatMap((value) => value.split(/\s+/));
  return normalizedQuery.split(/\s+/).every((queryWord) =>
    valueWords.some((valueWord) => {
      if (valueWord.includes(queryWord)) return true;
      const maxDistance =
        queryWord.length >= 8 ? 2 : queryWord.length >= 5 ? 1 : 0;
      return (
        maxDistance > 0 &&
        editDistanceWithin(queryWord, valueWord, maxDistance)
      );
    })
  );
}

export function Storefront({
  products,
  categories,
  brands,
  heroSlides,
  initialView = 'home',
  initialProductId,
  initialCategory = 'Maquillaje',
  initialBrand = 'Maybelline',
  initialCategoryFilter = 'Todas',
  initialBrandFilter = 'Todas',
  initialPriceFilter,
  initialSearch = '',
}: StorefrontProps) {
  const [view, setView] = useState(initialView);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    () => products.find((product) => product.id === initialProductId) ?? null
  );
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  const [brandFilter, setBrandFilter] = useState(initialBrandFilter);
  const maxProductPrice = Math.max(
    0,
    ...products.map((product) => product.price)
  );
  const minProductPrice = products.length
    ? Math.min(...products.map((product) => product.price))
    : 0;
  const [priceFilter, setPriceFilter] = useState(
    initialPriceFilter ?? maxProductPrice
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [cartItems, setCartItems] = useState<
    Record<string, { product: Product; quantity: number }>
  >({});
  const [cartStorageReady, setCartStorageReady] = useState(false);
  useEffect(() => {
    try {
      const storedCart = window.localStorage.getItem(cartStorageKey);
      if (storedCart) setCartItems(restoreCartItems(storedCart, products));
    } catch (error) {
      console.error('No se pudo restaurar el carrito guardado.', error);
    } finally {
      setCartStorageReady(true);
    }
  }, [products]);
  useEffect(() => {
    if (!cartStorageReady) return;
    try {
      const storedCart = Object.values(cartItems).flatMap(
        ({ product, quantity }) =>
          product.id === undefined
            ? []
            : [
                {
                  productId: product.id,
                  variantId: product.selectedVariant?.id ?? null,
                  quantity,
                },
              ]
      );
      window.localStorage.setItem(cartStorageKey, JSON.stringify(storedCart));
    } catch (error) {
      console.error('No se pudo guardar el carrito en este dispositivo.', error);
    }
  }, [cartItems, cartStorageReady]);
  const cart = Object.values(cartItems).reduce(
    (total, item) => total + item.quantity,
    0
  );
  const addToCart = (product: Product, quantity = 1) => {
    const itemKey = cartItemKey(product);
    const available = product.selectedVariant?.stock ?? product.stock;
    const currentQuantity = cartItems[itemKey]?.quantity ?? 0;
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > maxCartItemQuantity ||
      currentQuantity + quantity > maxCartItemQuantity
    ) {
      notify(
        `No se pueden agregar más de ${maxCartItemQuantity} unidades del mismo producto`,
        'remove'
      );
      return;
    }
    if (
      !cartItems[itemKey] &&
      Object.keys(cartItems).length >= maxCartLineItems
    ) {
      notify(
        `El carrito admite hasta ${maxCartLineItems} productos diferentes`,
        'remove'
      );
      return;
    }
    if (available !== undefined && currentQuantity + quantity > available) {
      notify(`No hay stock suficiente de ${product.name}`, 'remove');
      return;
    }
    setCartItems((current) => ({
      ...current,
      [itemKey]: {
        product,
        quantity: (current[itemKey]?.quantity ?? 0) + quantity,
      },
    }));
    notify(`${product.name} agregado al carrito`, 'success');
  };
  const decreaseCartItem = (itemKey: string) =>
    setCartItems((current) => {
      const item = current[itemKey];
      if (!item) return current;
      if (item.quantity <= 1) {
        const next = { ...current };
        delete next[itemKey];
        notify('Producto eliminado del carrito', 'remove');
        return next;
      }
      return {
        ...current,
        [itemKey]: { ...item, quantity: item.quantity - 1 },
      };
    });
  const removeCartItem = (itemKey: string) => {
    setCartItems((current) => {
      const next = { ...current };
      delete next[itemKey];
      return next;
    });
    setReservationMessage('');
    setReservationAvailability(null);
    notify('Producto eliminado del carrito', 'remove');
  };
  const clearCart = () => {
    setCartItems({});
    notify('Carrito vaciado', 'remove');
  };
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: 'success' | 'remove';
  } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const notify = (message: string, tone: 'success' | 'remove') => {
    setToast({ message, tone });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };
  const [cartStep, setCartStep] = useState<1 | 2>(1);
  const [reservationMessage, setReservationMessage] = useState('');
  const [reservationAvailability, setReservationAvailability] = useState<{
    unavailableItem: string;
    isReserved: boolean;
    availableItems: string[];
  } | null>(null);
  const [reservationPending, startReservation] = useTransition();
  const [showCartDetail, setShowCartDetail] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<
    'pickup' | 'moto' | 'correo'
  >('pickup');
  const [pickupLocation, setPickupLocation] = useState<
    'Rafael Castillo' | 'Universidad de Morón'
  >('Rafael Castillo');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    postalCode: '',
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<
    'category' | 'brand' | null
  >(null);
  const catalogUrl = () => {
    const params = new URLSearchParams();
    if (view === 'category') params.set('view', 'category');
    if (view === 'brand') params.set('view', 'brand');
    if (view === 'category' && selectedCategory)
      params.set('category', selectedCategory);
    if (view === 'brand' && selectedBrand) params.set('brand', selectedBrand);
    if (categoryFilter !== 'Todas') params.set('category', categoryFilter);
    if (brandFilter !== 'Todas') params.set('brand', brandFilter);
    if (priceFilter < maxProductPrice)
      params.set('maxPrice', String(priceFilter));
    if (searchQuery) params.set('q', searchQuery);
    const query = params.toString();
    return `/catalogo${query ? `?${query}` : ''}`;
  };
  const navigate = (next: typeof view, value?: string) => {
    setView(next);
    if (next === 'category' && value) setSelectedCategory(value);
    if (next === 'brand' && value) setSelectedBrand(value);
    if (next === 'product' && value) {
      const product = products.find((item) => item.id === Number(value));
      if (product) setSelectedProduct(product);
    }
    if (next !== 'all') {
      setCategoryFilter('Todas');
      setBrandFilter('Todas');
      setPriceFilter(maxProductPrice);
    }
    if (next === 'home') {
      setSearch('');
      setSearchQuery('');
    }
    const nextUrl =
      next === 'home'
        ? '/'
        : next === 'product' && value
          ? `/productos/${value}`
          : catalogUrl();
    window.history.pushState(null, '', nextUrl);
    setMenuOpen(false);
    setMobileSection(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    const syncFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const productMatch = window.location.pathname.match(
        /^\/productos\/(\d+)\/?$/
      );
      if (productMatch) {
        const product =
          products.find((item) => item.id === Number(productMatch[1])) ?? null;
        setSelectedProduct(product);
        setView(product ? 'product' : 'all');
        return;
      }
      if (window.location.pathname === '/catalogo') {
        const urlView = params.get('view');
        const category = params.get('category');
        const brand = params.get('brand');
        setView(
          urlView === 'category' && category
            ? 'category'
            : urlView === 'brand' && brand
              ? 'brand'
              : 'all'
        );
        if (urlView === 'category' && category)
          setSelectedCategory(category);
        if (urlView === 'brand' && brand) setSelectedBrand(brand);
        setCategoryFilter(
          urlView === 'category' ? 'Todas' : (category ?? 'Todas')
        );
        setBrandFilter(urlView === 'brand' ? 'Todas' : (brand ?? 'Todas'));
        const maxPrice = Number(params.get('maxPrice'));
        setPriceFilter(
          Number.isFinite(maxPrice) && maxPrice > 0
            ? Math.min(maxPrice, maxProductPrice)
            : maxProductPrice
        );
        const query = params.get('q') ?? '';
        setSearch(query);
        setSearchQuery(query);
        return;
      }
      setView('home');
      setSelectedProduct(null);
      setSearch('');
      setSearchQuery('');
    };
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [maxProductPrice, products]);
  useEffect(() => {
    if (view === 'product' && selectedProduct?.id) return;
    if (view === 'home') return;
    window.history.replaceState(null, '', catalogUrl());
  }, [
    view,
    selectedCategory,
    selectedBrand,
    categoryFilter,
    brandFilter,
    priceFilter,
    searchQuery,
  ]);
  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchesView =
          view === 'category'
            ? product.category.includes(selectedCategory)
            : view === 'brand'
              ? product.brand === selectedBrand
              : true;
        const matchesCategory =
          categoryFilter === 'Todas' ||
          product.category.includes(categoryFilter);
        const matchesBrand =
          brandFilter === 'Todas' || product.brand === brandFilter;
        const matchesPrice = product.price <= priceFilter;
        return (
          matchesView &&
          matchesCategory &&
          matchesBrand &&
          matchesPrice &&
          matchesSearch(
            [
              product.name,
              product.brand,
              ...product.category,
              product.description ?? '',
            ],
            searchQuery
          )
        );
      }),
    [
      view,
      selectedCategory,
      selectedBrand,
      categoryFilter,
      brandFilter,
      priceFilter,
      searchQuery,
    ]
  );
  const searchSuggestions = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return [];

    return products
      .map((product, index) => {
        const name = normalizeSearchText(product.name);
        const brand = normalizeSearchText(product.brand);
        const values = [
          product.name,
          product.brand,
          ...product.category,
          product.description ?? '',
        ];
        const matches = matchesSearch(values, query);
        const rank =
          name === query
            ? 0
            : name.startsWith(query)
              ? 1
              : name.includes(query)
                ? 2
                : brand === query
                  ? 3
                  : brand.startsWith(query)
                    ? 4
                    : brand.includes(query)
                      ? 5
                      : 6;
        return { product, index, matches, rank };
      })
      .filter(({ matches }) => matches)
      .sort((left, right) => left.rank - right.rank || left.index - right.index)
      .slice(0, 5)
      .map(({ product }) => product);
  }, [products, search]);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearchQuery(search.trim());
    setSearchOpen(false);
    navigate('all');
  };
  const chooseSuggestion = (product: Product) => {
    setSearch(product.name);
    setSearchQuery(product.name);
    setSearchOpen(false);
    navigate('all');
  };
  const openAll = () => {
    setSearch('');
    setSearchQuery('');
    navigate('all');
  };
  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    navigate('product', product.id === undefined ? undefined : String(product.id));
  };
  const orderTotal = Object.values(cartItems).reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  const canSendOrder =
    deliveryMethod === 'pickup' ||
    Object.values(deliveryAddress).every((value) => value.trim().length > 0);
  const deliveryLabel =
    deliveryMethod === 'pickup'
      ? `Retiro gratuito — ${pickupLocation}`
      : deliveryMethod === 'moto'
        ? 'Envío en moto hasta 10 km — a coordinar'
        : 'Correo Argentino — a coordinar';
  const closeCart = () => {
    setCartOpen(false);
    setCartStep(1);
    setReservationMessage('');
    setReservationAvailability(null);
    setShowCartDetail(false);
    setDeliveryMethod('pickup');
    setPickupLocation('Rafael Castillo');
    setDeliveryAddress({
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      postalCode: '',
    });
  };
  const sendOrderToWhatsApp = () => {
    setReservationMessage('');
    setReservationAvailability(null);
    if (!isWhatsAppConfigured) {
      setReservationMessage(
        'WhatsApp no está configurado correctamente. Contactanos para completar tu pedido.'
      );
      return;
    }

    const whatsappWindow = window.open('about:blank', '_blank');
    if (!whatsappWindow) {
      setReservationMessage(
        'Permití las ventanas emergentes para abrir WhatsApp. No se generó ninguna reserva.'
      );
      return;
    }

    const lines = Object.values(cartItems).map(({ product, quantity }) => ({
      productId: product.id ?? 0,
      variantId: product.selectedVariant?.id ?? null,
      quantity,
    }));
    if (lines.some((line) => line.productId < 1)) {
      whatsappWindow.close();
      setReservationMessage(
        'No se pudo identificar un producto del pedido. Actualizá la página e intentá nuevamente.'
      );
      return;
    }

    const deliveryDetails =
      deliveryMethod === 'pickup'
        ? deliveryLabel
        : `${deliveryLabel} — ${deliveryAddress.street} ${deliveryAddress.number}, ${deliveryAddress.neighborhood}, ${deliveryAddress.city} (${deliveryAddress.postalCode})`;

    startReservation(async () => {
      try {
        const reservation = await createOrderReservationAction({
          lines,
          deliveryMethod,
          deliveryDetails,
        });
        if (!reservation.success) {
          whatsappWindow.close();
          if (reservation.availability) {
            setReservationAvailability(reservation.availability);
          } else {
            setReservationMessage(reservation.error);
          }
          return;
        }

        const message = [
          'Hola Kunan, quiero confirmar el pedido que preparé en la tienda.',
          '',
          ...reservation.items.map(
            (item) =>
              `• ${item.productName}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity} — ${money(item.unitPrice * item.quantity)}`
          ),
          '',
          `Total estimado: ${money(reservation.total)}`,
          `Entrega: ${deliveryDetails}`,
        ].join('\n');
        whatsappWindow.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        setReservationMessage(
          'Se reservó temporalmente tu pedido y se intentó abrir WhatsApp. Revisá que se haya abierto y enviá el mensaje para confirmar la compra. Si no recibimos el mensaje, la reserva vence y el stock se libera.'
        );
      } catch (error) {
        whatsappWindow.close();
        console.error('No se pudo registrar la reserva del pedido.', error);
        setReservationMessage(
          'No pudimos registrar la reserva. El stock no fue reservado; intentá nuevamente.'
        );
      }
    });
  };
  const cartPanel = cartOpen ? (
    <div className="fixed inset-0 z-50 bg-black/20" onClick={closeCart}>
      <aside
        onClick={(event) => event.stopPropagation()}
        className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-[#fbf8f3] p-4 shadow-2xl sm:rounded-l-2xl sm:rounded-r-none sm:p-5"
      >
        <div className="flex items-center justify-between border-b border-[#e9e0d4] pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {cartStep === 2 && (
              <button
                type="button"
                aria-label="Volver al paso 1"
                onClick={() => {
                  setCartStep(1);
                  setShowCartDetail(false);
                  setDeliveryMethod('pickup');
                  setDeliveryAddress({
                    street: '',
                    number: '',
                    neighborhood: '',
                    city: '',
                    postalCode: '',
                  });
                }}
                className="shrink-0 text-[#766e66]"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="mb-1 text-[9px] tracking-[0.16em] text-[#b48b36] uppercase">
                  Paso {cartStep} de 2
                </p>
                {cartStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setShowCartDetail(true)}
                    className="mb-1 text-[9px] font-semibold tracking-[0.08em] text-[#766e66] underline underline-offset-2"
                  >
                    Ver detalle
                  </button>
                )}
              </div>
              {cartStep === 1 && (
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-xl leading-tight">
                    Revisá tu pedido
                  </h2>
                  {cart > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="inline-flex items-center gap-1 text-[9px] tracking-[0.08em] text-[#9b9288] underline underline-offset-2 transition hover:text-[#a33a32]"
                    >
                      <Trash2 size={13} />
                      Vaciar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            aria-label="Cerrar carrito"
            onClick={closeCart}
            className="absolute right-4 top-4"
          >
            <X />
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 py-3 sm:py-4 ${cartStep === 1 ? 'overflow-y-auto overscroll-contain pr-1' : 'overflow-visible'}`}
        >
          {cart === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-[#766e66]">
              Tu pedido está vacío.
            </div>
          ) : (
            <div className={cartStep === 2 ? 'hidden' : 'space-y-2'}>
              {Object.entries(cartItems).map(
                ([itemKey, { product, quantity }]) => (
                <div
                  key={itemKey}
                  className="cart-item relative flex items-center gap-2 border-b border-[#e9e0d4] py-1"
                >
                  {cartStep === 1 && (
                    <Image
                      src={product.image}
                      alt=""
                      width={80}
                      height={80}
                      sizes="80px"
                      className="size-[4.5rem] shrink-0 rounded-lg object-cover sm:size-20"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {cartStep === 1 && (
                      <div className="cart-item-controls mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-full border border-[#e9e0d4] bg-[#fffdf9]">
                          <button
                            type="button"
                            aria-label={`Restar una unidad de ${product.name}`}
                            onClick={() => decreaseCartItem(itemKey)}
                            className="flex size-7 items-center justify-center text-sm text-[#766e66]"
                          >
                            −
                          </button>
                          <span className="min-w-6 text-center text-xs font-medium">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Agregar una unidad de ${product.name}`}
                            onClick={() => addToCart(product)}
                            className="flex size-7 items-center justify-center text-sm text-[#766e66]"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label={`Eliminar ${product.name} del carrito`}
                          onClick={() => removeCartItem(itemKey)}
                          className="cart-item-remove flex size-8 items-center justify-center rounded-full border border-[#e9e0d4] bg-[#fffdf9] text-[#a33a32] shadow-sm"
                          title="Eliminar producto"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <p
                      className={
                        cartStep === 2
                          ? 'truncate text-[11px] leading-4'
                          : 'text-sm'
                      }
                    >
                      {product.name}{' '}
                      <span className="font-semibold text-[#8b6a42]">
                        {product.brand}
                      </span>
                    </p>
                    <p className={cartStep === 2 ? 'hidden' : 'mt-1 text-sm'}>
                      {money(product.price)}
                    </p>
                  </div>
                </div>
                )
              )}
            </div>
          )}
        </div>
        {showCartDetail && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-5"
            onClick={() => setShowCartDetail(false)}
          >
            <div
              className="w-full max-w-xs rounded-2xl border border-[#e9e0d4] bg-[#fbf8f3] p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-lg">Detalle del pedido</h3>
                <button
                  type="button"
                  aria-label="Cerrar detalle"
                  onClick={() => setShowCartDetail(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="space-y-1.5 text-[11px] text-[#4e4740]">
                {Object.entries(cartItems).map(
                  ([itemKey, { product, quantity }]) => (
                  <p key={itemKey} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {product.name}{' '}
                      <strong className="font-semibold text-[#8b6a42]">
                        {product.brand}
                      </strong>
                    </span>
                    <span className="shrink-0">x{quantity}</span>
                  </p>
                  )
                )}
                <div className="mt-3 flex justify-between border-t border-[#e9e0d4] pt-2 font-semibold">
                  <span>Total estimado</span>
                  <span>{money(orderTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {cartStep === 2 && deliveryMethod === 'pickup' && (
          <div className="mb-3 rounded-lg border border-[#e9e0d4] bg-[#fffdf9] p-3">
            <p className="mb-2 text-[9px] font-semibold tracking-[0.12em] text-[#4e4740] uppercase">
              Elegí dónde retirar
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#e9e0d4] px-2 py-2 text-[10px] text-[#4e4740]">
                <input
                  type="radio"
                  name="pickup-location"
                  value="Rafael Castillo"
                  checked={pickupLocation === 'Rafael Castillo'}
                  onChange={() => setPickupLocation('Rafael Castillo')}
                  className="accent-[#b48b36]"
                />
                Rafael Castillo
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#e9e0d4] px-2 py-2 text-[10px] text-[#4e4740]">
                <input
                  type="radio"
                  name="pickup-location"
                  value="Universidad de Morón"
                  checked={pickupLocation === 'Universidad de Morón'}
                  onChange={() => setPickupLocation('Universidad de Morón')}
                  className="accent-[#b48b36]"
                />
                Universidad de Morón
              </label>
            </div>
          </div>
        )}
        {cart > 0 && (
          <div
            className={`cart-summary cart-step-${cartStep} border-t border-[#e9e0d4] pt-2 ${cartStep === 2 ? 'cart-summary-step-2-scroll' : ''}`}
            tabIndex={cartStep === 2 ? 0 : undefined}
            aria-label={cartStep === 2 ? 'Opciones y estado del pedido' : undefined}
          >
            <div className="mb-3 flex justify-between text-sm font-semibold">
              <span>Total estimado</span>
              <span>{money(orderTotal)}</span>
            </div>
            {cartStep === 1 && (
              <button
                type="button"
                onClick={() => setCartStep(2)}
                className="mb-3 w-full rounded-full bg-[#262320] px-5 py-3 text-[10px] font-semibold tracking-[0.14em] text-white uppercase"
              >
                Elegir retiro
              </button>
            )}
            <fieldset className={cartStep === 1 ? 'hidden' : 'space-y-2'}>
              <legend className="mb-2 text-[10px] font-semibold tracking-[0.12em] uppercase">
                ¿Cómo querés recibirlo?
              </legend>
              {(
                [
                  [
                    'pickup',
                    'Retiro gratuito',
                    'Rafael Castillo o Universidad de Morón',
                  ],
                  ['moto', 'Envío en moto', 'Hasta 10 km · a coordinar'],
                  [
                    'correo',
                    'Correo Argentino',
                    'Para larga distancia · a coordinar',
                  ],
                ] as const
              ).map(([value, title, description]) => (
                <label
                  key={value}
                  className="flex cursor-pointer gap-3 border border-[#e9e0d4] p-3 text-xs"
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={value}
                    checked={deliveryMethod === value}
                    onChange={() => setDeliveryMethod(value)}
                    className="mt-0.5 accent-[#b48b36]"
                  />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="text-[#766e66]">{description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {deliveryMethod !== 'pickup' && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <input
                  aria-label="Calle"
                  placeholder="Calle"
                  value={deliveryAddress.street}
                  onChange={(event) =>
                    setDeliveryAddress({
                      ...deliveryAddress,
                      street: event.target.value,
                    })
                  }
                  className="border border-[#e9e0d4] bg-transparent px-3 py-2 text-xs"
                  required
                />
                <input
                  aria-label="Número"
                  placeholder="Número"
                  value={deliveryAddress.number}
                  onChange={(event) =>
                    setDeliveryAddress({
                      ...deliveryAddress,
                      number: event.target.value,
                    })
                  }
                  className="border border-[#e9e0d4] bg-transparent px-3 py-2 text-xs"
                  required
                />
                <input
                  aria-label="Barrio o localidad"
                  placeholder="Barrio / localidad"
                  value={deliveryAddress.neighborhood}
                  onChange={(event) =>
                    setDeliveryAddress({
                      ...deliveryAddress,
                      neighborhood: event.target.value,
                    })
                  }
                  className="col-span-2 border border-[#e9e0d4] bg-transparent px-3 py-2 text-xs"
                  required
                />
                <input
                  aria-label="Ciudad"
                  placeholder="Ciudad"
                  value={deliveryAddress.city}
                  onChange={(event) =>
                    setDeliveryAddress({
                      ...deliveryAddress,
                      city: event.target.value,
                    })
                  }
                  className="border border-[#e9e0d4] bg-transparent px-3 py-2 text-xs"
                  required
                />
                <input
                  aria-label="Código postal"
                  placeholder="Código postal"
                  value={deliveryAddress.postalCode}
                  onChange={(event) =>
                    setDeliveryAddress({
                      ...deliveryAddress,
                      postalCode: event.target.value,
                    })
                  }
                  className="border border-[#e9e0d4] bg-transparent px-3 py-2 text-xs"
                  required
                />
              </div>
            )}
            {cartStep === 2 && (
              <button
                type="button"
                disabled={!canSendOrder || reservationPending}
                onClick={sendOrderToWhatsApp}
                className="mt-5 block w-full rounded-full bg-[#262320] px-5 py-4 text-center text-[10px] font-semibold tracking-[0.08em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-40"
              >
                {reservationPending
                  ? 'Reservando stock…'
                  : 'Enviar pedido por WhatsApp'}
              </button>
            )}
            {reservationAvailability && cartStep === 2 && (
              <div
                role="alert"
                className="max-h-[min(40svh,20rem)] overflow-y-auto overscroll-contain mt-3 rounded-xl border border-[#e7c9bd] bg-[#fff8f4] p-4 text-xs leading-5 text-[#4e4740]"
              >
                <p className="font-semibold text-[#a33a32]">
                  {reservationAvailability.isReserved
                    ? 'Este producto está reservado'
                    : 'Stock insuficiente'}
                </p>
                <p className="mt-1">
                  La unidad de{' '}
                  <span className="font-semibold">
                    {reservationAvailability.unavailableItem}
                  </span>{' '}
                  {reservationAvailability.isReserved
                    ? 'está reservada'
                    : 'no está disponible'}.
                </p>
                {reservationAvailability.availableItems.length > 0 ? (
                  <>
                    <p className="mt-3 font-medium text-[#4d7548]">
                      Sí disponible en tu pedido:
                    </p>
                    <ul className="mt-1 max-h-24 space-y-1 overflow-y-auto overscroll-contain pr-1">
                      {reservationAvailability.availableItems.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-[#4d7548]"
                        >
                          <span aria-hidden="true">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-[#766e66]">
                      Quitá la unidad reservada para continuar con los
                      productos disponibles.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[#766e66]">
                    Quitá esta unidad del pedido para continuar.
                  </p>
                )}
              </div>
            )}
            {reservationMessage && cartStep === 2 && (
              <p
                role="status"
                aria-live="polite"
                className="mt-3 rounded-lg border border-[#e9e0d4] bg-[#fffdf9] p-3 text-xs leading-5 text-[#4e4740]"
              >
                {reservationMessage}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setCartItems({});
                setReservationMessage('');
                setReservationAvailability(null);
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-1 text-xs text-[#766e66] underline"
            >
              <Trash2 size={16} />
              Vaciar pedido
            </button>
          </div>
        )}
      </aside>
    </div>
  ) : null;
  return (
    <main className="min-h-screen bg-[#fbf8f3] text-[#262320]">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`animate-in slide-in-from-bottom-3 fade-in fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full px-4 py-3 text-center text-[10px] tracking-[0.08em] text-white shadow-xl duration-300 ${toast.tone === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
        >
          {toast.message}
        </div>
      )}
      <div className="bg-[#262320] px-4 py-2 text-center text-[10px] tracking-[0.22em] text-[#f4df9c] uppercase">
        Envíos a todo el país · Comprá online
      </div>
      <header className="sticky top-0 z-20 border-b border-[#e9e0d4] bg-[#fbf8f3]/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 lg:px-10">
          <button
            className="flex items-center gap-2 lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
            <span className="text-[10px] tracking-[0.16em] uppercase">
              Menú
            </span>
          </button>
          <nav className="hidden h-full items-center gap-7 text-[11px] tracking-[0.13em] uppercase lg:flex">
            <DesktopMenu
              label="Categorías"
              items={categories}
              type="category"
              onNavigate={navigate}
            />
            <DesktopMenu
              label="Marcas"
              items={brands}
              type="brand"
              onNavigate={navigate}
            />
            <a href="/#nosotras">Nosotras</a>
          </nav>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="absolute left-1/2 -translate-x-1/2 cursor-pointer"
            aria-label="Volver al inicio"
          >
            <Image
              src="/kunan-logo.png"
              alt="Kunan Belleza y Accesorios"
              width={180}
              height={64}
              priority
              className="h-16 w-auto object-contain mix-blend-multiply"
            />
          </button>
          <div className="ml-auto flex items-center gap-5">
            <button
              aria-label="Buscar"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={19} strokeWidth={1.5} />
            </button>
            <button
              className="relative"
              aria-label="Carrito"
              onClick={() => {
                setCartStep(1);
                setCartOpen(true);
              }}
            >
              <ShoppingCart size={20} strokeWidth={1.7} />
              {cart > 0 && (
                <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-[#b48b36] text-[9px] text-white">
                  {cart}
                </span>
              )}
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-300 border-t border-[#e9e0d4] px-5 py-3">
            <form
              onSubmit={submitSearch}
              className="relative mx-auto max-w-[1320px]"
            >
              <div className="flex items-center gap-3">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#9b9288]"
                />
                <button
                  type="button"
                  aria-label="Cerrar búsqueda"
                  onClick={() => setSearchOpen(false)}
                  className="shrink-0 text-[#766e66]"
                >
                  <X size={16} />
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#262320] px-4 py-2 text-[10px] tracking-[0.12em] text-white uppercase"
                >
                  Buscar
                </button>
              </div>
              {searchSuggestions.length > 0 && (
                <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[#e9e0d4] bg-[#fffdf9] shadow-lg">
                  {searchSuggestions.map((product) => (
                    <button
                      type="button"
                      key={productKey(product)}
                      onClick={() => chooseSuggestion(product)}
                      className="flex w-full items-center gap-3 border-b border-[#e9e0d4] px-3 py-2 text-left last:border-0"
                    >
                      <Image
                        src={product.image}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 rounded-md object-cover"
                      />
                      <span>
                        <span className="block text-xs text-[#262320]">
                          {product.name}
                        </span>
                        <span className="block text-[10px] text-[#9b9288]">
                          {product.brand} · {money(product.price)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>
        )}
        {menuOpen && (
          <nav className="flex flex-col gap-5 border-t border-[#e9e0d4] px-5 py-6 text-xs tracking-[0.13em] uppercase lg:hidden">
            <button className="text-left" onClick={() => navigate('all')}>
              Todos los productos
            </button>
            <div className="border-t border-[#e9e0d4] pt-4">
              <button
                className="flex w-full items-center justify-between text-left text-[#b48b36]"
                onClick={() =>
                  setMobileSection(
                    mobileSection === 'category' ? null : 'category'
                  )
                }
              >
                Categorías
                <ChevronDown
                  className={`size-4 transition-transform ${mobileSection === 'category' ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileSection === 'category' && (
                <div className="mt-3 flex flex-col gap-3">
                  {categories.map((item) => (
                    <button
                      key={item}
                      className="pl-4 text-left"
                      onClick={() => navigate('category', item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-[#e9e0d4] pt-4">
              <button
                className="flex w-full items-center justify-between text-left text-[#b48b36]"
                onClick={() =>
                  setMobileSection(mobileSection === 'brand' ? null : 'brand')
                }
              >
                Marcas
                <ChevronDown
                  className={`size-4 transition-transform ${mobileSection === 'brand' ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileSection === 'brand' && (
                <div className="mt-3 flex flex-col gap-3">
                  {brands.map((item) => (
                    <button
                      key={item}
                      className="pl-4 text-left"
                      onClick={() => navigate('brand', item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a href="/#nosotras" onClick={() => setMenuOpen(false)}>
              Nosotras
            </a>
          </nav>
        )}
      </header>
      {view === 'home' ? (
        <StorefrontLanding
          categories={categories}
          products={products.filter((product) => product.showInLanding)}
          brands={brands}
          heroSlides={heroSlides}
          cartAdd={addToCart}
          onCategorySelect={(category) => navigate('category', category)}
          onProductSelect={openProduct}
          onOpenAll={openAll}
          onBrandSelect={(brand) => navigate('brand', brand)}
        />
      ) : view === 'product' && selectedProduct ? (
        <ProductDetail
          product={selectedProduct}
          cartAdd={addToCart}
          onBack={() => navigate('all')}
        />
      ) : (
        <CatalogPage
          view={view}
          category={selectedCategory}
          brand={selectedBrand}
          categoryFilter={categoryFilter}
          brandFilter={brandFilter}
          priceFilter={priceFilter}
          minProductPrice={minProductPrice}
          maxProductPrice={maxProductPrice}
          setCategoryFilter={setCategoryFilter}
          setBrandFilter={setBrandFilter}
          setPriceFilter={setPriceFilter}
          items={filtered}
          categories={categories}
          brands={brands}
          cartAdd={addToCart}
          onSelect={openProduct}
        />
      )}
      <footer className="bg-[#f5eee5] px-5 py-10 lg:px-10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Image
              src="/kunan-logo.png"
              alt="Kunan"
              width={135}
              height={48}
              className="h-12 w-auto mix-blend-multiply"
            />
          </div>
          <div className="flex gap-5 text-[#766e66]">
            <a
              href="https://www.instagram.com/kunan.glow/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de Kunan"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-[19px] fill-none stroke-current"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle
                  cx="17.5"
                  cy="6.5"
                  r="1"
                  className="fill-current stroke-none"
                />
              </svg>
            </a>
            {isWhatsAppConfigured && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp de Kunan"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-[19px] fill-none stroke-current"
                  strokeWidth="1.5"
                >
                  <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" />
                  <path d="M9.2 8.7c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.5c.1.2.1.4-.1.6l-.5.6c.7 1.2 1.5 1.9 2.7 2.4l.6-.5c.2-.2.4-.2.6-.1l1.4.7c.2.1.3.3.2.5-.2.8-.8 1.2-1.5 1.2-2.5-.2-5.8-3.1-6.3-5.7-.1-.5.1-.9.5-1.2Z" />
                </svg>
              </a>
            )}
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-[1320px] border-t border-[#ded3c6] pt-5 text-[10px] text-[#9b9288]">
          © 2026 Kunan · Belleza & Accesorios
        </p>
      </footer>
      {cartPanel}
    </main>
  );
}
