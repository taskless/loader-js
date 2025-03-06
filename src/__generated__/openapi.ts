export default {
  openapi: "3.1.0",
  info: {
    title: "tskl.es",
    termsOfService: "https://taskless.io/legal/terms",
    license: {
      name: "Apache 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0.html",
    },
    version: "1.0.0",
  },
  components: {
    schemas: {},
  },
  paths: {
    "/{version}/config": {
      get: {
        parameters: [
          {
            schema: {
              type: "string",
            },
            in: "path",
            name: "version",
            required: true,
            description: "The schema version of the config to retrieve.",
          },
          {
            schema: {
              type: "string",
            },
            in: "header",
            name: "authorization",
            required: true,
            description: "Bearer token",
          },
        ],
        responses: {
          "200": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    options: [
                      {
                        _def: {
                          unknownKeys: "strip",
                          catchall: {
                            _def: {
                              typeName: "ZodNever",
                            },
                          },
                          typeName: "ZodObject",
                          description: "A valid Taskless cloud configuration",
                        },
                        _cached: null,
                      },
                      {
                        _def: {
                          unknownKeys: "strip",
                          catchall: {
                            _def: {
                              typeName: "ZodNever",
                            },
                          },
                          typeName: "ZodObject",
                          description: "A valid Taskless cloud configuration",
                        },
                        _cached: null,
                      },
                    ],
                    typeName: "ZodUnion",
                  },
                },
              },
            },
          },
          "404": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                    },
                    typeName: "ZodObject",
                  },
                  _cached: null,
                },
              },
            },
          },
        },
      },
    },
    "/{version}/events": {
      post: {
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      seq: {
                        type: "string",
                        description:
                          "The sequence ID (uuid v7 as an unsigned 128-bit integer)",
                      },
                      dim: {
                        type: "string",
                        description: "The dimension key",
                      },
                      str: {
                        type: "string",
                        description: "The dimension value as a string",
                      },
                      num: {
                        type: "string",
                        description: "The dimension value as a number",
                      },
                    },
                    required: ["seq", "dim"],
                    additionalProperties: false,
                  },
                },
              },
            },
          },
        },
        parameters: [
          {
            schema: {
              type: "string",
            },
            in: "path",
            name: "version",
            required: true,
            description: "The schema version of the config to retrieve.",
          },
          {
            schema: {
              type: "string",
            },
            in: "header",
            name: "authorization",
            required: true,
            description: "Bearer token",
          },
        ],
        responses: {
          "200": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                    },
                    typeName: "ZodObject",
                  },
                  _cached: null,
                },
              },
            },
          },
          "404": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                    },
                    typeName: "ZodObject",
                  },
                  _cached: null,
                },
              },
            },
          },
        },
      },
    },
    "/public/config": {
      get: {
        responses: {
          "200": {
            description: "A valid Taskless cloud configuration",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                    },
                    typeName: "ZodObject",
                    description: "A valid Taskless cloud configuration",
                  },
                  _cached: null,
                },
              },
            },
          },
        },
      },
    },
    "/public/{version}/config": {
      get: {
        parameters: [
          {
            schema: {
              type: "string",
            },
            in: "path",
            name: "version",
            required: true,
            description: "The schema version of the config to retrieve.",
          },
        ],
        responses: {
          "200": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    options: [
                      {
                        _def: {
                          unknownKeys: "strip",
                          catchall: {
                            _def: {
                              typeName: "ZodNever",
                            },
                          },
                          typeName: "ZodObject",
                          description: "A valid Taskless cloud configuration",
                        },
                        _cached: null,
                      },
                      {
                        _def: {
                          unknownKeys: "strip",
                          catchall: {
                            _def: {
                              typeName: "ZodNever",
                            },
                          },
                          typeName: "ZodObject",
                          description: "A valid Taskless cloud configuration",
                        },
                        _cached: null,
                      },
                    ],
                    typeName: "ZodUnion",
                  },
                },
              },
            },
          },
          "404": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                    },
                    typeName: "ZodObject",
                  },
                  _cached: null,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
