const { app } = require("@azure/functions");

app.http("confirmation", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "function",
  handler: async (request, context) => {
    const reference =
      "CE-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    return {
      jsonBody: {
        reference: reference,
        issuedAt: new Date().toISOString()
      }
    };
  }
});
