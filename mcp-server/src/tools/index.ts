import type { ToolModule } from "../tool-types.js";
import { createOrder } from "./create_order.js";
import { deleteOrder } from "./delete_order.js";
import { getOrder } from "./get_order.js";
import { getProduct } from "./get_product.js";
import { getUser } from "./get_user.js";
import { listProducts } from "./list_products.js";
import { searchProducts } from "./search_products.js";

export const tools: ToolModule[] = [
  createOrder,
  deleteOrder,
  getOrder,
  getProduct,
  getUser,
  listProducts,
  searchProducts,
];
