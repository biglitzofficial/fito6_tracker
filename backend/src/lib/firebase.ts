import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { config } from '../config';

function loadServiceAccountFromFile(filePath: string): admin.ServiceAccount {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Firebase service account file not found: ${resolved}`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf-8')) as admin.ServiceAccount;
}

function getCredential(): admin.ServiceAccount {
  if (config.firebase.serviceAccountJson) {
    return JSON.parse(config.firebase.serviceAccountJson) as admin.ServiceAccount;
  }

  if (config.firebase.serviceAccountPath) {
    return loadServiceAccountFromFile(config.firebase.serviceAccountPath);
  }

  const defaultPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  if (fs.existsSync(defaultPath)) {
    return loadServiceAccountFromFile(defaultPath);
  }

  return {
    projectId: config.firebase.projectId,
    clientEmail: config.firebase.clientEmail,
    privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
  };
}

if (!admin.apps.length) {
  const credential = admin.credential.cert(getCredential());
  admin.initializeApp({
    credential,
    storageBucket: config.firebase.storageBucket,
  });
}

export const db = admin.firestore();
export const bucket = admin.storage().bucket();

export async function pingFirebase(): Promise<void> {
  await db.collection('_health').doc('ping').set({ at: new Date().toISOString() }, { merge: true });
}
