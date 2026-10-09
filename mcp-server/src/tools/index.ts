import type { ToolModule } from "../tool-types.js";
import { getOrder } from "./get_order.js";
import { getProduct } from "./get_product.js";
import { listProducts } from "./list_products.js";
import { searchProducts } from "./search_products.js";

export const tools: ToolModule[] = [
  getOrder,
  getProduct,
  listProducts,
  searchProducts,
];
