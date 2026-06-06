#!/usr/bin/env node
// Generates VAPID key pair for Web Push.
// Run: node generate-vapid-keys.js
// Then set the secrets with wrangler or Cloudflare dashboard.

const { subtle } = globalThis.crypto ?? require('crypto').webcrypto;

(async () => {
  const kp = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const pubRaw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  const privJwk = await subtle.exportKey('jwk', kp.privateKey);

  const b64u = (buf) => Buffer.from(buf).toString('base64url');
  const pub = b64u(pubRaw);
  const priv = privJwk.d;

  console.log('\n=== VAPID Keys ===\n');
  console.log('VAPID_PUBLIC_KEY (for wrangler.jsonc vars or .dev.vars):');
  console.log(pub);
  console.log('\nVAPID_PRIVATE_KEY (wrangler secret — NEVER commit):');
  console.log(priv);
  console.log('\nRun these commands to set secrets in Cloudflare:');
  console.log(`  echo "${pub}"  | wrangler secret put VAPID_PUBLIC_KEY`);
  console.log(`  echo "${priv}" | wrangler secret put VAPID_PRIVATE_KEY`);
  console.log(`  echo "mailto:you@example.com" | wrangler secret put VAPID_EMAIL`);
  console.log('\nAlso apply the DB migration:');
  console.log('  wrangler d1 execute trecker --remote --file=./schema.sql');
  console.log('');
})();
