export function parseAnswerKey(text, count) {
  const value = JSON.parse(text);
  if (!value || Array.isArray(value) || typeof value !== 'object' || !Object.keys(value).length ||
      !Object.entries(value).every(([k,v]) => /^[1-9]\d*$/.test(k) && Number(k) <= count && ['A','B','C','D'].includes(v))) {
    throw new Error('Use question numbers within this test and answers A, B, C or D.');
  }
  return value;
}
export async function bounded(promise, ms = 20000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('The server did not confirm publishing. Check your connection and retry here using the same test ID. A pending write may still complete.')), ms);
  })]); } finally { clearTimeout(timer); }
}
export function publishError(error) {
  const code = error.code || '';
  if (code.includes('permission-denied') || code.includes('unauthorized')) return 'Firebase denied access. Ask the project owner to check Firestore and Storage rules for this signed-in account.';
  if (code.includes('bucket-not-found') || code.includes('no-default-bucket')) return 'PDF storage is not configured. Enable Firebase Storage and check VITE_FIREBASE_STORAGE_BUCKET, or use a PDF link.';
  if (code.includes('canceled')) return 'Upload cancelled. Your form is ready to retry.';
  return error.message || 'Publishing failed. Please retry.';
}
