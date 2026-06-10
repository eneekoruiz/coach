export function isE2EMockMode() {
  return process.env.E2E_MOCK_MODE === '1';
}
