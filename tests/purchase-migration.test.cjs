const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const enginePath = process.env.PURCHASE_MIGRATION_PGLITE_PATH;

test('purchase migration backfills exact references, enforces foreign keys and signing permissions, and is rerunnable', {
    skip: !enginePath && 'Set PURCHASE_MIGRATION_PGLITE_PATH to an isolated @electric-sql/pglite installation',
    timeout: 120000,
}, async () => {
    const { PGlite } = require(enginePath);
    const db = new PGlite();
    try {
        await db.exec(`
            CREATE ROLE authenticated;
            CREATE ROLE anon;
            CREATE SCHEMA auth;
            CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
                $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
            GRANT USAGE ON SCHEMA auth TO authenticated;
            CREATE TABLE public.cars (id bigint PRIMARY KEY);
            CREATE TABLE public.bills (id bigint PRIMARY KEY, deal_id bigint, free_text text);
            CREATE TABLE public.roles (id bigint PRIMARY KEY, name text);
            CREATE TABLE public.user_roles (user_id uuid, role_id bigint);
            CREATE TABLE public.permissions (id bigint PRIMARY KEY, key text);
            CREATE TABLE public.user_permissions (user_id uuid, permission_id bigint, granted boolean);
            GRANT SELECT ON public.roles, public.user_roles, public.permissions, public.user_permissions TO authenticated;
            INSERT INTO public.cars VALUES (1), (10), (11);
            INSERT INTO public.bills VALUES
                (101, null, 'purchase_car_id:1'),
                (102, null, E'purchase_car_id:10\\nFixture note'),
                (103, null, 'purchase_car_id:100'),
                (104, 5, 'purchase_car_id:1'),
                (105, null, 'Notes containing purchase_car_id:1'),
                (106, null, E'purchase_car_id:1\\nNotes containing purchase_car_id:10');
            INSERT INTO public.roles VALUES (1, 'Admin'), (2, 'Sales');
            INSERT INTO public.user_roles VALUES
                ('00000000-0000-0000-0000-000000000001', 1),
                ('00000000-0000-0000-0000-000000000002', 2),
                ('00000000-0000-0000-0000-000000000003', 2),
                ('00000000-0000-0000-0000-000000000004', 2);
            INSERT INTO public.permissions VALUES (1, 'view_cars'), (2, 'manage_bills');
            INSERT INTO public.user_permissions VALUES
                ('00000000-0000-0000-0000-000000000002', 2, true),
                ('00000000-0000-0000-0000-000000000003', 1, true);
        `);
        const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'add_purchase_billing_and_signatures.sql'), 'utf8');
        await db.exec(migration);
        await db.exec(migration);
        const links = await db.query('SELECT id, purchase_car_id FROM public.bills ORDER BY id');
        assert.deepEqual(links.rows.map((row) => [row.id, row.purchase_car_id]), [[101, 1], [102, 10], [103, null], [104, null], [105, null], [106, 1]]);
        await assert.rejects(db.exec('INSERT INTO public.bills (id, purchase_car_id) VALUES (108, 999)'), (error) => error.code === '23503');
        await assert.rejects(db.exec('DELETE FROM public.cars WHERE id = 1'), (error) => error.code === '23503');

        const asUser = async (id) => {
            await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-${String(id).padStart(12, '0')}', false);`);
        };
        const insert = (carId) => db.exec(`INSERT INTO public.purchase_signatures (car_id, seller_id, seller_type, seller_signature_url, signed_by_name) VALUES (${carId}, 2, 'customer', 'http://fixture.test/signature.png', 'Fixture seller')`);
        await asUser(1);
        await insert(1);
        await asUser(2);
        await insert(10);
        await db.exec("INSERT INTO public.purchase_signatures (car_id, seller_id, seller_type, seller_signature_url, signed_by_name) VALUES (10, 2, 'customer', 'http://fixture.test/updated.png', 'Fixture seller') ON CONFLICT (car_id) DO UPDATE SET seller_signature_url = EXCLUDED.seller_signature_url");
        assert.equal((await db.query('SELECT count(*)::int AS count FROM public.purchase_signatures')).rows[0].count, 2);
        await asUser(3);
        assert.equal((await db.query('SELECT count(*)::int AS count FROM public.purchase_signatures')).rows[0].count, 2);
        await assert.rejects(insert(11), (error) => error.code === '42501');
        const deniedUpdate = await db.query("UPDATE public.purchase_signatures SET seller_signature_url = 'http://fixture.test/denied.png' RETURNING car_id");
        assert.equal(deniedUpdate.rows.length, 0);
        await asUser(4);
        assert.equal((await db.query('SELECT count(*)::int AS count FROM public.purchase_signatures')).rows[0].count, 0);
        await assert.rejects(insert(11), (error) => error.code === '42501');
        await db.exec('RESET ROLE; SET ROLE anon;');
        await assert.rejects(db.query('SELECT * FROM public.purchase_signatures'), (error) => error.code === '42501');
    } finally {
        await db.close();
    }
});
