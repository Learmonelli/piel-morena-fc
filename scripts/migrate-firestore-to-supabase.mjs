import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const exportOnly = has('--export-only');
const importOnly = has('--import-only');
const inputPath = path.resolve(getArg('--input', 'migration/firestore-export.json'));
const outputPath = path.resolve(getArg('--output', 'migration/firestore-export.json'));
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT || getArg('--service-account');
const collections = ['players', 'matches', 'backups'];
const batchSize = 500;

async function exportFirestore() {
  if (!serviceAccountPath) {
    throw new Error(
      'Falta el service account de Firebase. Pasá --service-account <ruta> o FIREBASE_SERVICE_ACCOUNT.'
    );
  }

  const raw = await fs.readFile(path.resolve(serviceAccountPath), 'utf8');
  const sa = JSON.parse(raw);

  if (!getApps().length) {
    initializeApp({
      credential: cert(sa),
      projectId: sa.project_id
    });
  }

  const db = getFirestore();
  const out = {
    exportedAt: new Date().toISOString(),
    projectId: sa.project_id,
    collections: {}
  };

  for (const name of collections) {
    const snap = await db.collection(name).get();
    out.collections[name] = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    console.log(`Firestore ${name}: ${snap.size} documentos`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Export guardado en ${outputPath}`);
  return out;
}

async function importToSupabase(payload) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno (usá la service_role solo en este script).'
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  for (const name of collections) {
    const docs = payload.collections?.[name] || [];
    const rows = docs.map(doc => ({
      id: doc.id,
      data: doc.data || {}
    }));

    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const { error } = await supabase.from(name).upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`${name}: ${error.message}`);
      console.log(`${name}: ${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
    }
  }

  console.log('Verificando conteos en Supabase...');
  for (const name of collections) {
    const expected = (payload.collections?.[name] || []).length;
    const { count, error } = await supabase
      .from(name)
      .select('*', { count: 'exact', head: true });
    if (error) throw new Error(`${name}: ${error.message}`);
    console.log(`${name}: Firestore=${expected} Supabase=${count}`);
    if (expected !== count) {
      console.warn(`ADVERTENCIA: ${name} no coincide (${expected} vs ${count}).`);
    }
  }
}

async function main() {
  let payload;

  if (!importOnly) {
    payload = await exportFirestore();
    if (exportOnly) return;
  }

  if (!payload) {
    payload = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  }

  await importToSupabase(payload);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
