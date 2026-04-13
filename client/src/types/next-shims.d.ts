declare module 'next/headers' {
  type Cookie = {
    name: string
    value: string
    options?: Record<string, unknown>
  }

  export function cookies(): Promise<{
    getAll: () => Cookie[]
    set: (name: string, value: string, options?: Record<string, unknown>) => void
  }>
}

declare module 'next/server' {
  export type NextRequest = {
    cookies: {
      getAll: () => Array<{ name: string; value: string }>
      set: (name: string, value: string) => void
    }
    nextUrl: {
      pathname: string
      clone: () => { pathname: string }
    }
  }

  export class NextResponse {
    static next(init?: { request?: NextRequest }): NextResponse
    static redirect(url: { pathname: string }): NextResponse
    cookies: {
      set: (name: string, value: string, options?: Record<string, unknown>) => void
      getAll: () => Array<{ name: string; value: string }>
    }
  }
}
