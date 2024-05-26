import anyTest, { type TestFn } from "ava";

export type ContextBuilder<P = Record<string, unknown>> = {
  use<T = unknown>(
    context: (test: TestFn<T>) => TestFn<T>
  ): ContextBuilder<P & T>;
  build(): TestFn<P>;
};

export const withContext = <P = Record<string, unknown>>(
  test: TestFn
): ContextBuilder<P> => {
  return {
    use(contextFunction) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      contextFunction(test as any);
      return withContext(test);
    },
    build() {
      return test as TestFn<P>;
    },
  };
};
