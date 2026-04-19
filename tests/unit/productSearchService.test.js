jest.mock("../../models/Product", () => ({
  find: jest.fn(),
}));

const {
  searchProducts,
  __testables,
} = require("../../services/search/productSearchService");

describe("productSearchService", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete global.fetch;
  });

  test("buildSolrQuery returns wildcard when query is empty", () => {
    expect(__testables.buildSolrQuery("")).toBe("*:*");
    expect(__testables.buildSolrQuery("   ")).toBe("*:*");
  });

  test("buildSolrQuery creates exact plus fuzzy clauses", () => {
    const built = __testables.buildSolrQuery("toyta filter");

    expect(built).toContain("(toyta filter)");
    expect(built).toContain("(toyta~1 filter~2)");
    expect(built).toContain("(toyta* filter*)");
    expect(built).toContain("OR");
  });

  test("buildSolrQuery includes prefix clause for short typed input", () => {
    expect(__testables.buildSolrQuery("e")).toBe("(e) OR (e*)");
  });

  test("searchProducts sends typo-tolerant q to Solr", async () => {
    process.env.SEARCH_ENGINE = "solr";
    process.env.SOLR_BASE_URL = "http://solr.test:8983";
    process.env.SOLR_COLLECTION = "products";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          numFound: 0,
          docs: [],
        },
      }),
    });

    const result = await searchProducts({ q: "toyta", limit: 5, offset: 0 });

    expect(result.engine).toBe("solr");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const calledUrl = global.fetch.mock.calls[0][0];
    const parsed = new URL(calledUrl);
    const qParam = parsed.searchParams.get("q");

    expect(qParam).toBe("(toyta) OR (toyta~1) OR (toyta*)");
    expect(parsed.searchParams.get("mm")).toBe("1<75%");
  });
});
