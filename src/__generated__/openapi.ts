export default {
  "openapi": "3.1.0",
  "info": {
    "title": "tskl.es",
    "termsOfService": "https://taskless.io/legal/terms",
    "license": {
      "name": "Apache 2.0",
      "url": "https://www.apache.org/licenses/LICENSE-2.0.html"
    },
    "version": "1.0.0"
  },
  "components": {
    "schemas": {}
  },
  "paths": {
    "/{version}/config": {
      "get": {
        "parameters": [
          {
            "schema": {
              "type": "string",
              "enum": [
                "v1"
              ]
            },
            "in": "path",
            "name": "version",
            "required": true,
            "description": "The schema version of the config to retrieve. Currently only 'v1' is supported."
          },
          {
            "schema": {
              "type": "string"
            },
            "in": "header",
            "name": "authorization",
            "required": true,
            "description": "Bearer token"
          }
        ],
        "responses": {
          "200": {
            "description": "A valid Taskless cloud configuration",
            "content": {
              "application/json": {
                "schema": {
                  "description": "A valid Taskless cloud configuration",
                  "type": "object",
                  "properties": {
                    "schema": {
                      "description": "The config schema version used",
                      "type": "number",
                      "enum": [
                        1
                      ]
                    },
                    "organizationId": {
                      "type": "string"
                    },
                    "packs": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "schema": {
                            "description": "The pack schema version used",
                            "type": "number",
                            "enum": [
                              2
                            ]
                          },
                          "name": {
                            "description": "The pack name",
                            "type": "string"
                          },
                          "version": {
                            "description": "The pack version",
                            "type": "string"
                          },
                          "description": {
                            "description": "The pack description",
                            "type": "string"
                          },
                          "permissions": {
                            "description": "The permissions requested for this pack",
                            "type": "object",
                            "properties": {
                              "capture": {
                                "type": "object",
                                "additionalProperties": {
                                  "type": "object",
                                  "properties": {
                                    "type": {
                                      "description": "The type of data to capture",
                                      "anyOf": [
                                        {
                                          "const": "string",
                                          "type": "string"
                                        },
                                        {
                                          "const": "number",
                                          "type": "string"
                                        }
                                      ]
                                    },
                                    "description": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "type",
                                    "description"
                                  ]
                                }
                              },
                              "domains": {
                                "description": "The domains this pack is allowed to request data from as regular expressions. A single null allows all domains",
                                "anyOf": [
                                  {
                                    "type": "null"
                                  },
                                  {
                                    "type": "string"
                                  },
                                  {
                                    "type": "array",
                                    "items": {
                                      "type": "string"
                                    }
                                  }
                                ]
                              },
                              "environment": {
                                "description": "The environment variables this pack is allowed to access from the host system",
                                "type": "array",
                                "items": {
                                  "type": "string"
                                }
                              },
                              "request": {
                                "description": "During the lifecycle, additional domains this pack is allowed to request data from",
                                "type": "array",
                                "items": {
                                  "type": "string"
                                }
                              }
                            }
                          },
                          "hooks": {
                            "type": "object",
                            "properties": {
                              "pre": {
                                "description": "The hook script, written in lua",
                                "type": "string"
                              },
                              "post": {
                                "description": "The hook script, written in lua",
                                "type": "string"
                              }
                            },
                            "required": [
                              "pre",
                              "post"
                            ]
                          },
                          "displays": {
                            "description": "A set of pre-configured graphs or display modules available in this pack",
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "name": {
                                  "description": "A name for the display module, unique to the pack",
                                  "type": "string"
                                },
                                "title": {
                                  "description": "The title",
                                  "type": "string"
                                },
                                "query": {
                                  "description": "Describes the query that retrieves data for this module",
                                  "type": "object",
                                  "properties": {
                                    "count": {
                                      "type": "string"
                                    },
                                    "group": {
                                      "type": "string"
                                    },
                                    "where": {
                                      "type": "object",
                                      "additionalProperties": {
                                        "anyOf": [
                                          {
                                            "type": "string"
                                          },
                                          {
                                            "type": "number"
                                          }
                                        ]
                                      }
                                    }
                                  }
                                },
                                "display": {
                                  "description": "The default display mode for this module",
                                  "anyOf": [
                                    {
                                      "type": "string",
                                      "enum": [
                                        "graph"
                                      ]
                                    },
                                    {
                                      "type": "string",
                                      "enum": [
                                        "table"
                                      ]
                                    }
                                  ]
                                }
                              },
                              "required": [
                                "name",
                                "title",
                                "query",
                                "display"
                              ]
                            }
                          }
                        },
                        "required": [
                          "schema",
                          "name",
                          "version"
                        ]
                      }
                    }
                  },
                  "required": [
                    "schema",
                    "organizationId",
                    "packs"
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/config": {
      "get": {
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    },
    "/{version}/events": {
      "post": {
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": {
                  "type": "array",
                  "items": {
                    "anyOf": [
                      {
                        "type": "object",
                        "properties": {
                          "seq": {
                            "description": "The sequence ID (uuid v7 as an unsighed 128-bit integer)",
                            "type": "string"
                          },
                          "dim": {
                            "description": "The dimension key",
                            "type": "string"
                          },
                          "str": {
                            "description": "The dimension value as a string",
                            "type": "string"
                          }
                        },
                        "required": [
                          "seq",
                          "dim",
                          "str"
                        ]
                      },
                      {
                        "type": "object",
                        "properties": {
                          "seq": {
                            "description": "The sequence ID (uuid v7 as an unsighed 128-bit integer)",
                            "type": "string"
                          },
                          "dim": {
                            "description": "The dimension key",
                            "type": "string"
                          },
                          "num": {
                            "description": "The dimension value as a number",
                            "type": "string"
                          }
                        },
                        "required": [
                          "seq",
                          "dim",
                          "num"
                        ]
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        "parameters": [
          {
            "schema": {
              "type": "string",
              "enum": [
                "v1"
              ]
            },
            "in": "path",
            "name": "version",
            "required": true,
            "description": "The schema version of the config to retrieve. Currently only 'v1' is supported."
          },
          {
            "schema": {
              "type": "string"
            },
            "in": "header",
            "name": "authorization",
            "required": true,
            "description": "Bearer token"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "received": {
                      "description": "The number of events received",
                      "type": "number"
                    }
                  },
                  "required": [
                    "received"
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
} as const;