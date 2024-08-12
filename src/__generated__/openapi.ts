
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
                    "__v": {
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
                          "__v": {
                            "description": "The pack schema version used",
                            "type": "number",
                            "enum": [
                              1
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
                          "sends": {
                            "description": "Descriptive information about the events this pack sends. Helps Taskless understand how to retrieve and display the data this pack creates.",
                            "type": "object",
                            "additionalProperties": {
                              "type": "object",
                              "properties": {
                                "type": {
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
                                "type"
                              ]
                            }
                          },
                          "rules": {
                            "description": "A set of rules to apply when this pack is used",
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "matches": {
                                  "description": "A regex-friendly match string that will be used to check every outgoing URL",
                                  "type": "string"
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
                                }
                              },
                              "required": [
                                "matches"
                              ]
                            }
                          }
                        },
                        "required": [
                          "__v",
                          "name",
                          "version",
                          "rules"
                        ]
                      }
                    }
                  },
                  "required": [
                    "__v",
                    "organizationId",
                    "packs"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "description": "Unauthorized",
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "number",
                      "enum": [
                        401
                      ]
                    },
                    "message": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "code",
                    "message"
                  ]
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
                  "additionalProperties": false,
                  "type": "object",
                  "patternProperties": {
                    "^(.*)$": {
                      "type": "array",
                      "items": {
                        "description": "To support multiple data points in the same batch operation, key/value pairs are expressed as a tuple of [key, type, value]",
                        "type": "array",
                        "minItems": 3,
                        "maxItems": 3,
                        "items": {},
                        "prefixItems": [
                          {
                            "type": "string"
                          },
                          {
                            "anyOf": [
                              {
                                "const": "s",
                                "type": "string"
                              },
                              {
                                "const": "n",
                                "type": "string"
                              }
                            ]
                          },
                          {
                            "type": "string"
                          }
                        ]
                      }
                    }
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
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "description": "Unauthorized",
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "number",
                      "enum": [
                        401
                      ]
                    },
                    "message": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "code",
                    "message"
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
