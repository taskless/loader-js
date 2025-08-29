/**
 * Manifests describe packs as they're uploaded to Taskless. They contain additional metadata about the default displays, graphs, and configuration panels
 */
export type Manifest = {
  /**
   * The pack schema version used
   */
  schema: "pre2";
  /**
   * The pack name
   */
  name: string;
  /**
   * The pack version, using semantic versioning conventions
   */
  version: string;
  /**
   * A short description of the pack's functionality
   */
  description: string;
  /**
   * Supported methods for this pack, defaults to pre and post
   */
  methods?: Array<"pre" | "post" | "chunk">;
  /**
   * The permissions requested for this pack from the host system
   */
  permissions: {
    /**
     * The environment variables this pack is allowed to access on the host system
     */
    environment?: string[];
    /**
     * [deprecated] Whether this pack can access the request and response body, always true
     */
    body?: boolean;
  };
  /**
   * [deprecated] Default dashboard configurations for this pack - see dashboards
   */
  displays?: Array<{
    /**
     * A name for the display module, unique to the pack
     */
    name: string;
    /**
     * The title
     */
    title: string;
    /**
     * Describes the query that retrieves data for this module
     */
    query: {
      count?: string;
      group?: string;
      where?: Record<string, string | number>;
    };
    /**
     * The default display mode for this module
     */
    display: "graph" | "table";
  }>;
  /**
   * User-configurable fields for this pack
   */
  fields?: Array<
    | {
        name: string;
        type: "string";
        description: string;
        default: string;
      }
    | {
        name: string;
        type: "string[]";
        description: string;
        default: string[];
      }
    | {
        name: string;
        type: "number";
        description: string;
        default: number;
      }
    | {
        name: string;
        type: "number[]";
        description: string;
        default: number[];
      }
    | {
        name: string;
        type: "boolean";
        description: string;
        default: boolean;
      }
  >;
  /**
   * Charts available in this Pack
   */
  charts?: Array<{
    /**
     * The title of the chart
     */
    title: string;
    /**
     * A short description of the chart
     */
    description?: string;
    /**
     * The type of the chart
     */
    type: "step" | "pie" | "table";
    definition: {
      /**
       * Describes the aggregation funciton to use, usually expressed on the Y-axis
       */
      aggregate: Record<string, string>;
      /**
       * How should the data be grouped? Usually expressed on the X-axis
       */
      bucket: Record<string, string>;
      /**
       * The graph series
       */
      series?:
        | {
            query: string;
          }
        | {
            dimension: string;
            /**
             * The type of data this is
             */
            dimensionType: "string" | "number";
            /**
             * The per-series query with optional placeholders
             */
            query: string;
          };
    };
  }>;
};
