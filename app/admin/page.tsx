import { AdminPanel } from '@/components/admin-panel';
import { getAdminProducts, getHeroSlides } from '@/lib/catalog';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { getAdminOrders } from '@/lib/order-reservations';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin/login');

  const [products, brands, categories, ordersPage, heroSlides] = await Promise.all([
    getAdminProducts(),
    prisma.marca.findMany({ select: { nombre: true }, orderBy: { id: 'asc' } }),
    prisma.categoria.findMany({
      select: { nombre: true },
      orderBy: { id: 'asc' },
    }),
    getAdminOrders(1),
    getHeroSlides(),
  ]);

  return (
    <AdminPanel
      initialProducts={products}
      initialOrdersPage={ordersPage}
      initialHeroSlides={heroSlides}
      brands={brands.map(({ nombre }) => nombre.toLocaleUpperCase('es-AR'))}
      categories={categories.map(({ nombre }) => nombre)}
    />
  );
}
