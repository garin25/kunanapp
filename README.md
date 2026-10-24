# Kunan

## PostgreSQL

Configure `DATABASE_URL` in `front/.env`. The Prisma schema maps the existing PostgreSQL tables in `prisma/schema.prisma`.

Install dependencies and generate the Prisma client before running the app:

```sh
npm install
npm run db:generate
npm run dev
```

`npm run db:push` synchronizes the Prisma schema with the configured database. Run it after pulling schema changes to add the required tables and columns.

## Admin access

The admin panel requires these server-only environment variables in `front/.env`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUTH_SECRET` (at least 32 characters)

The login creates an HTTP-only, signed session cookie. The panel and all product and taxonomy mutations verify that session on the server.

Product images are stored as URLs because the database schema has URL columns but no file-storage service. Enter publicly accessible HTTP(S) URLs or paths served by the app.

### Hero carousel and Cloudinary

The hero carousel is stored in `hero_slides`. Run the SQL in
[`prisma/hero-slides.sql`](./prisma/hero-slides.sql) once in the Neon SQL Editor,
then deploy the application. The admin panel can add, edit, reorder, and delete
slides. Uploaded hero images are stored in the separate Cloudinary folder
`kunan-hero`; Cloudinary creates the folder on the first upload. Deleting a
slide also deletes its Cloudinary image. Product images remain separate in
`kunan-productos`.

Set these server-only variables in `front/.env` and in the production hosting
environment. Never expose them with a `NEXT_PUBLIC_` prefix or paste the API
secret into chat:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Uploads accept JPG, PNG, WebP, or AVIF images up to 10 MB. Existing local hero
images remain as a fallback until at least one slide has been saved from the
admin panel.

## WhatsApp order reservations

The customer checkout creates a pending order and reserves its stock before opening WhatsApp. The admin panel's **Pedidos** section lists these reservations. Confirm an order only after receiving the customer's WhatsApp message; confirmation keeps the reserved stock deducted. Discarding an order releases its stock. Unconfirmed reservations expire after 12 hours.

Set `NEXT_PUBLIC_WHATSAPP_NUMBER` in the project-root `.env` file and in the production hosting environment. Use the international number with digits only (no `+`, spaces, or hyphens), for example `5491163524877`. This public variable sets the destination for both checkout orders and the WhatsApp link in the footer; restart the development server after changing it.

Change `ORDER_RESERVATION_HOURS` in `lib/order-config.ts` to adjust the reservation duration. On Vercel, `vercel.json` schedules expiration checks every five minutes. Set a strong `CRON_SECRET` environment variable in the deployment so the scheduled endpoint can authenticate. Expired reservations are also released when a new reservation is made or the admin opens the orders panel.

After pulling this schema change, run `npm run db:push` against the configured PostgreSQL database before deploying the updated app.

Featured products store their badge text, badge color, and whether they appear on the homepage.
