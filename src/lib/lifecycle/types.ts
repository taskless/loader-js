import { type Plugin } from "@extism/extism";
import { type Logger, type Pack, type PluginOutput } from "@~/types.js";

type getModulesCallback = () => Promise<Map<string, Promise<Plugin>>>;
type onCompleteCallback = (requestId: string) => void;
type onResultCallback = (
  pack: Pack,
  result: NonNullable<PluginOutput>
) => Promise<void>;
type onErrorCallback = (error: any) => void;

export type LifecycleCallbacks = {
  getModules: getModulesCallback;
  onResult: onResultCallback;
  onComplete: onCompleteCallback;
  onError: onErrorCallback;
};

export type LifecycleExecutor = (
  requestId: string,
  lifecycle: string,
  packs: Pack[],
  data: {
    request: Request;
    response?: Response;
    callbacks: LifecycleCallbacks;
    logger: Logger;
    context: Record<string, Record<string, any>>;
  }
) => Promise<void>;
