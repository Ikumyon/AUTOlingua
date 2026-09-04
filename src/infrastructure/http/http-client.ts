export interface HttpRequest {
  readonly url: string;
  readonly method: 'POST';
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly signal: AbortSignal;
}

export interface HttpResponse {
  readonly status: number;
  readonly body: unknown;
}

export interface HttpClient {
  request(request: HttpRequest): Promise<HttpResponse>;
}
