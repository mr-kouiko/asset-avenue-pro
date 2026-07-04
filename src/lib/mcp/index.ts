import { defineMcp } from "@lovable.dev/mcp-js";
import searchMarketplace from "./tools/search-marketplace";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "visustock-mcp",
  title: "VisuStock Marketplace",
  version: "0.1.0",
  instructions:
    "Tools to browse the VisuStock marketplace — a premium digital marketplace for stock photos, videos, audio, VFX, and ebooks. Use `search_marketplace` to find products by keyword (optionally filter by price or free-only), `get_product` for full details on a single product by slug or ID, and `list_categories` for the current category taxonomy. All prices are in USD. Product URLs point to https://visustock.com/products/{slug}.",
  tools: [searchMarketplace, getProduct, listCategories],
});
