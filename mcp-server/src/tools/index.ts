import type { ToolModule } from "../tool-types.js";
import { getProduct } from "./get_product.js";
import { listProducts } from "./list_products.js";
import { searchProducts } from "./search_products.js";

export const tools: ToolModule[] = [getProduct, listProducts, searchProducts];
