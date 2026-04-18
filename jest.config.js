module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  collectCoverage: true,
  collectCoverageFrom: [
    "middleware/**/*.js",
    "!middleware/uploadMiddleware.js",
  ],
  coverageDirectory: "reports/test/coverage",
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "reports/test/junit",
        outputName: "junit.xml",
        addFileAttribute: "true",
      },
    ],
  ],
};
