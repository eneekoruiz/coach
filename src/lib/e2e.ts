export function isE2EMockMode() {
  return process.env.E2E_MOCK_MODE === '1' || process.env.NEXT_PUBLIC_E2E_MOCK_MODE === '1';
}
