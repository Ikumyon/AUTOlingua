import type { HttpClient, HttpRequest, HttpResponse } from './http-client';

export class FetchHttpClient implements HttpClient {
  public async request(request: HttpRequest): Promise<HttpResponse> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: request.signal,
    });
    const text = await response.text();
    let body: unknown = null;
    if (text.length > 0) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }
    return { status: response.status, body };
  }
}
