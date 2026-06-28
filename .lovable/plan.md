Google is reporting that the meta tag on visustock.com is incorrect because `index.html` currently contains two conflicting `google-site-verification` tags. The user confirmed the new `L0YPo9Qck4kjopDiCTjysuqYh2F0Bb2IxNjFJHZ_RVE` token is the authoritative one.

**Plan**
1. Edit `index.html` to remove the old verification meta tag `gZ9OtLFb30GwvlTsWqJqIiR1r4mqQMz02j6NufJJ9YY`.
2. Keep only the requested `L0YPo9Qck4kjopDiCTjysuqYh2F0Bb2IxNjFJHZ_RVE` tag in `<head>`.
3. Verify the tag is present in the rendered HTML at `https://visustock.com/` and confirm the Google Search Console property is still accessible via the linked workspace connector.

**Technical details**
- File changed: `index.html` (lines 7–8).
- No dependencies, no migrations, no backend changes.
- After deploy, Google will re-crawl the site and stop reporting the duplicate/incorrect tag. Note: Search Console cache may take a few hours to refresh.