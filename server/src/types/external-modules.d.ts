declare module 'js-yaml' {
  export function load(input: string): unknown;
  export function dump(input: unknown, options?: Record<string, unknown>): string;
}

declare module 'qrcode' {
  const QRCode: {
    toDataURL(input: string): Promise<string>;
  };

  export default QRCode;
}
