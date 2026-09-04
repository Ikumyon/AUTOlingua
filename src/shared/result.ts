export type Result<T, E> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E> {
  readonly ok: false;
  readonly error: E;
}

export const success = <T>(value: T): Success<T> => ({ ok: true, value });

export const failure = <E>(error: E): Failure<E> => ({ ok: false, error });

export const mapResult = <T, U, E>(
  result: Result<T, E>,
  transform: (value: T) => U,
): Result<U, E> => (result.ok ? success(transform(result.value)) : result);
