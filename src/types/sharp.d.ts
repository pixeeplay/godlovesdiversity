declare module 'sharp' {
  interface OverlayOptions {
    input?: string | Buffer;
    left?: number;
    top?: number;
  }
  interface Sharp {
    grayscale(): Sharp;
    blur(sigma?: number): Sharp;
    resize(w: number, h: number, opts?: { fit?: string }): Sharp;
    raw(): Sharp;
    extract(opts: { left: number; top: number; width: number; height: number }): Sharp;
    composite(items: OverlayOptions[]): Sharp;
    metadata(): Promise<{ width?: number; height?: number; format?: string }>;
    toBuffer(): Promise<Buffer>;
  }
  function sharp(input?: Buffer | string): Sharp;
  namespace sharp {
    interface OverlayOptions {
      input?: string | Buffer;
      left?: number;
      top?: number;
    }
  }
  export = sharp;
}
