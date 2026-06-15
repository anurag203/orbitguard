module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      isSinglePageApplication: true,
      url: ["/"],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        chromeFlags: "--headless=new --no-sandbox --disable-gpu"
      }
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }]
      }
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci"
    }
  }
};
