'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';

import {
  loadAdminOrdersAction,
  processOrderAction,
} from '@/app/admin/order-actions';
import type { AdminOrder, AdminOrdersPage } from '@/lib/order-reservations';
import { ORDER_RESERVATION_HOURS } from '@/lib/order-config';

const orderStatusLabels: Record<AdminOrder['status'], string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  DESCARTADO: 'Descartado',
  EXPIRADO: 'Expirado',
};

const deliveryLabels: Record<string, string> = {
  pickup: 'Retiro',
  moto: 'Envío en moto',
  correo: 'Correo Argentino',
};

function money(value: number) {
  return `$${value.toLocaleString('es-AR')}`;
}

function reservationTimeRemaining(expiresAt: string, currentTime: number | null) {
  if (currentTime === null) return 'Calculando tiempo restante…';

  const remainingMilliseconds = new Date(expiresAt).getTime() - currentTime;
  if (remainingMilliseconds <= 0) return 'La reserva venció.';

  const totalMinutes = Math.ceil(remainingMilliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours)
    return `Te ${minutes === 1 ? 'queda' : 'quedan'} ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} para confirmar el pedido.`;
  if (!minutes)
    return `Te ${hours === 1 ? 'queda' : 'quedan'} ${hours} ${hours === 1 ? 'hora' : 'horas'} para confirmar el pedido.`;
  return `Te ${hours === 1 ? 'queda' : 'quedan'} ${hours} ${hours === 1 ? 'hora' : 'horas'} y ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} para confirmar el pedido.`;
}

export function OrdersManager({
  initialPage,
}: {
  initialPage: AdminOrdersPage;
}) {
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [pageLoading, setPageLoading] = useState(false);
  const [pageData, setPageData] = useState(initialPage);
  const [page, setPage] = useState(initialPage.page);
  const [isPending, startTransition] = useTransition();
  const loadRequestId = useRef(0);
  const orders = pageData.orders;
  const pendingOrders = orders.filter((order) => order.status === 'PENDIENTE');
  const processedOrders = orders.filter((order) => order.status !== 'PENDIENTE');

  const loadPage = useCallback(async (requestedPage: number) => {
    const requestId = ++loadRequestId.current;
    setPageLoading(true);
    setPageError('');
    try {
      const result = await loadAdminOrdersAction(requestedPage);
      if (requestId !== loadRequestId.current) return;
      if (!result.success) {
        setPageError(result.error);
        return;
      }
      setPageData(result.data);
      setPage(result.data.page);
    } catch (loadError) {
      if (requestId !== loadRequestId.current) return;
      console.error('No se pudieron cargar los pedidos.', loadError);
      setPageError('No se pudieron cargar los pedidos. Intentá nuevamente.');
    } finally {
      if (requestId === loadRequestId.current) setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentTime(Date.now());
    const countdownTimer = window.setInterval(
      () => setCurrentTime(Date.now()),
      60_000
    );
    void loadPage(page);
    const refreshTimer = window.setInterval(() => void loadPage(page), 60_000);
    return () => {
      loadRequestId.current += 1;
      window.clearInterval(countdownTimer);
      window.clearInterval(refreshTimer);
    };
  }, [loadPage, page]);

  const processOrder = (order: AdminOrder, decision: 'confirm' | 'discard') => {
    const actionLabel = decision === 'confirm' ? 'confirmar' : 'descartar';
    if (
      !window.confirm(
        `¿Querés ${actionLabel} el pedido #${order.id}? ${
          decision === 'confirm'
            ? 'El stock reservado quedará descontado.'
            : 'Las unidades reservadas volverán al stock.'
        }`
      )
    )
      return;

    setError('');
    setPendingOrderId(order.id);
    startTransition(async () => {
      try {
        const result = await processOrderAction(order.id, decision);
        if (result.error) {
          setError(result.error);
          setPendingOrderId(null);
          void loadPage(page);
          return;
        }
        setPendingOrderId(null);
        void loadPage(page);
      } catch (actionError) {
        console.error('No se pudo procesar el pedido.', actionError);
        setError('No se pudo procesar el pedido. Intentá nuevamente.');
        setPendingOrderId(null);
      }
    });
  };

  const pageNumbers = (() => {
    const firstPage = Math.max(1, Math.min(page - 2, pageData.pageCount - 4));
    const lastPage = Math.min(pageData.pageCount, firstPage + 4);
    return Array.from(
      { length: Math.max(0, lastPage - firstPage + 1) },
      (_, index) => firstPage + index
    );
  })();

  const renderOrder = (order: AdminOrder, isPendingOrder: boolean) => (
    <article
      key={order.id}
      className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl text-[#262320]">
            Pedido #{order.id}
          </h3>
          <p className="mt-1 text-xs text-[#9b9288]">
            Creado{' '}
            {new Intl.DateTimeFormat('es-AR', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(order.createdAt))}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-medium ${
            order.status === 'PENDIENTE'
              ? 'bg-[#f8e9d2] text-[#8c6f35]'
              : order.status === 'CONFIRMADO'
                ? 'bg-[#e5f0e2] text-[#4d7548]'
                : 'bg-[#f1e7d7] text-[#766e66]'
          }`}
        >
          {orderStatusLabels[order.status]}
        </span>
      </div>
      <ul className="mt-4 space-y-2 border-y border-[#eee6dc] py-3 text-sm">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap justify-between gap-x-3 gap-y-1"
          >
            <span className="text-[#4e4740]">
              {item.productName}
              {item.variantName ? ` · ${item.variantName}` : ''} ×{' '}
              {item.quantity}
            </span>
            <span className="font-medium text-[#403a35]">
              {money(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
        <li className="flex justify-between gap-3 pt-1 font-semibold">
          <span>Total</span>
          <span>{money(order.total)}</span>
        </li>
      </ul>
      <div className="mt-3 space-y-1 text-xs leading-5 text-[#766e66]">
        <p>
          <span className="font-semibold">Entrega:</span>{' '}
          {deliveryLabels[order.deliveryMethod] ?? order.deliveryMethod}
        </p>
        <p className="break-words">{order.deliveryDetails}</p>
        {isPendingOrder && (
          <p aria-live="polite">
            {reservationTimeRemaining(order.expiresAt, currentTime)}
          </p>
        )}
      </div>
      {isPendingOrder && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={isPending}
            onClick={() => processOrder(order, 'confirm')}
            className="rounded-full bg-[#4d7548] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#3f633a] disabled:opacity-50"
          >
            {isPending && pendingOrderId === order.id
              ? 'Procesando…'
              : 'Confirmar pedido'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => processOrder(order, 'discard')}
            className="rounded-full border border-[#e0d5c7] px-4 py-2.5 text-xs font-medium text-[#766e66] transition hover:bg-[#f6efe5] disabled:opacity-50"
          >
            Descartar y liberar stock
          </button>
        </div>
      )}
    </article>
  );

  return (
    <section>
      <div className="mb-5">
        <h2 className="font-serif text-3xl text-[#262320]">Pedidos</h2>
        <p className="mt-1 text-sm text-[#766e66]">
          Los pedidos se registran al iniciar WhatsApp; confirmá solo cuando
          recibas el mensaje del cliente. Las reservas vencen a las{' '}
          {ORDER_RESERVATION_HOURS} horas.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-[#e8c1bb] bg-[#fff3f0] p-3 text-sm text-[#a33a32]"
        >
          {error}
        </p>
      )}
      {pageError && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8c1bb] bg-[#fff3f0] p-3 text-sm text-[#a33a32]"
        >
          <span>{pageError}</span>
          <button
            type="button"
            onClick={() => void loadPage(page)}
            disabled={pageLoading}
            className="font-medium underline underline-offset-2 disabled:opacity-50"
          >
            Reintentar
          </button>
        </div>
      )}
      {pageLoading && (
        <p
          role="status"
          className="mb-3 inline-flex items-center gap-2 text-xs text-[#766e66]"
        >
          <LoaderCircle className="size-4 animate-spin" />
          Actualizando pedidos…
        </p>
      )}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold tracking-[0.14em] text-[#9b9288] uppercase">
          Pendientes ({pendingOrders.length})
        </h3>
        {pendingOrders.length ? (
          pendingOrders.map((order) => renderOrder(order, true))
        ) : (
          <p className="rounded-2xl border border-dashed border-[#e0d5c7] p-6 text-sm text-[#9b9288]">
            No hay pedidos pendientes.
          </p>
        )}
      </div>
      {processedOrders.length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-xs font-semibold tracking-[0.14em] text-[#9b9288] uppercase">
            Procesados
          </h3>
          {processedOrders.map((order) => renderOrder(order, false))}
        </div>
      )}
      {pageData.pageCount > 1 && (
        <nav
          aria-label="Paginación de pedidos"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-3 sm:p-4"
        >
          <p className="text-xs text-[#766e66]">
            Página {pageData.page} de {pageData.pageCount} · {pageData.total}{' '}
            pedidos
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={page <= 1 || pageLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex size-9 items-center justify-center rounded-lg border border-[#e0d5c7] text-[#766e66] disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                aria-label={`Ir a la página ${pageNumber}`}
                aria-current={pageNumber === pageData.page ? 'page' : undefined}
                disabled={pageLoading}
                onClick={() => setPage(pageNumber)}
                className={`flex size-9 items-center justify-center rounded-lg border text-xs font-medium disabled:opacity-50 ${
                  pageNumber === pageData.page
                    ? 'border-[#262320] bg-[#262320] text-white'
                    : 'border-[#e0d5c7] text-[#766e66]'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={page >= pageData.pageCount || pageLoading}
              onClick={() =>
                setPage((current) =>
                  Math.min(pageData.pageCount, current + 1)
                )
              }
              className="flex size-9 items-center justify-center rounded-lg border border-[#e0d5c7] text-[#766e66] disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
