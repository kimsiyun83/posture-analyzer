// Only public certificate fingerprints belong here. Never upload a private keystore.
export const dynamic = 'force-dynamic';

export function GET() {
  const fingerprints = [...new Set((process.env.ANDROID_APP_SHA256 || '')
    .split(',').map(value => value.trim().toUpperCase())
    .filter(value => /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value)))];
  return Response.json(fingerprints.length ? [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.lulucare.posture',
      sha256_cert_fingerprints: fingerprints,
    },
  }] : [], { headers: { 'Cache-Control': 'public, max-age=300' } });
}
