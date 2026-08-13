module.exports = async function (context, req) {
  const reference =
    "CE-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  context.res = {
    headers: { "Content-Type": "application/json" },
    body: {
      reference: reference,
      issuedAt: new Date().toISOString()
    }
  };
};

