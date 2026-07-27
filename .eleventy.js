module.exports = function(eleventyConfig) {
  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("*.pdf");
  eleventyConfig.addPassthroughCopy("*.docx");

  // Filters
  eleventyConfig.addFilter("dateIso", date => {
    return date.toISOString();
  });
  
  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    }
  };
};
