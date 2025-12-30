export function getCurrentTime(headers?: Headers): number {
  // Check if TEST_MODE is enabled
  if (process.env.TEST_MODE === '1' && headers) {
    const testNowMs = headers.get('x-test-now-ms');
    if (testNowMs) {
      return parseInt(testNowMs, 10);
    }
  }
  return Date.now();
}

export function isExpired(expiresAt: number | null, currentTime: number): boolean {
  if (expiresAt === null) return false;
  return currentTime >= expiresAt;
}