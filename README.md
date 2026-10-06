# E-Shop API (Node.js + Express + MongoDB)

Authentication (JWT access + rotating refresh token in httpOnly cookie) and
authorization (roles + ownership checks) for an e-commerce backend.

## Setup
```bash
npm install
cp .env.example .env     # then edit the secrets
npm run dev
```
Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Roles
`customer` (default) · `seller` · `admin`

Make your first admin by registering, then in MongoDB shell:
```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```
After that, admins promote sellers with `PATCH /api/users/:id/role`.

## Endpoints
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| POST | /api/auth/refresh | Cookie |
| POST | /api/auth/logout | Cookie |
| GET | /api/products?search=&page=&limit= | Public |
| GET | /api/products/:id | Public |
| POST | /api/products | Seller, Admin |
| PUT/DELETE | /api/products/:id | Owner seller, Admin |
| GET | /api/cart | Logged in |
| POST | /api/cart/items | Logged in |
| DELETE | /api/cart/items/:productId | Logged in |
| POST | /api/orders | Customer, Admin (checkout from cart) |
| GET | /api/orders | Own orders (admin: all) |
| GET | /api/orders/:id | Owner, Admin |
| POST | /api/orders/:id/cancel | Owner, Admin (pending only) |
| PATCH | /api/orders/:id/status | Admin |
| GET | /api/users/me | Logged in |
| GET | /api/users | Admin |
| PATCH | /api/users/:id/role | Admin |
| DELETE | /api/users/:id | Admin |

## Try it
```bash
curl -X POST localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Abel","email":"abel@test.com","password":"password123"}'

curl -c cookies.txt -X POST localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"abel@test.com","password":"password123"}'

curl localhost:5000/api/users/me -H "Authorization: Bearer <accessToken>"
```
Frontend: send `Authorization: Bearer <accessToken>` and use `credentials: 'include'`
when calling `/api/auth/refresh`.

## Security notes
- Role is set server-side on register; request bodies can't set it.
- Prices/totals are computed from the DB; stock is decremented atomically.
- Passwords hashed with bcrypt; refresh tokens stored only as SHA-256 hashes and rotated.
- Helmet, CORS allow-list, body size limit, rate limit on /api/auth, zod validation.
- Payments: integrate Stripe (Checkout + verified webhooks) and set order to `paid` from the webhook, never from the client.
