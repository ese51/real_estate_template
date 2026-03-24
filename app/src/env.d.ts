/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module '@data/*' {
  const value: unknown;
  export default value;
}
