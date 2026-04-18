function createMockReq(overrides = {}) {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    session: {},
    app: { get: () => null },
    ...overrides,
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    rendered: null,
    redirectedTo: null,
    sent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    render(view, model) {
      this.rendered = { view, model };
      return this;
    },
    redirect(url) {
      this.redirectedTo = url;
      return this;
    },
    send(value) {
      this.sent = value;
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
    clearCookie() {
      return this;
    },
  };
}

module.exports = {
  createMockReq,
  createMockRes,
};
