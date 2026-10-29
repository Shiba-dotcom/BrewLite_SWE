"use client";

import RevenueChartSection from "./components/RevenueChartSection";
import StaffManagementSection, { StaffUser } from "./components/StaffManagementSection";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrewLiteLogo from "../components/BrewLiteLogo";
import { useAuthStore, apiFetch } from "../store/authStore";

interface Ingredient {
  id: number;
  code: string;
  name: string;
  unit: string;
  stock: number;
  minThreshold: number;
  costPerUnit?: number;
  costPerBulkUnit?: number;
  bulkUnitLabel?: string;
  totalInventoryValue?: number;
  version: number;
  status: "OK" | "LOW_STOCK" | "OUT_OF_STOCK";
  percentage: number;
  recipesCount?: number;
}

interface RecipeEntry {
  id: number;
  productId?: number;
  ingredientId?: number;
  size: string;
  amount: number;
  ingredient: Ingredient;
}

interface ProductItem {
  id: number;
  name: string;
  description: string | null;
  basePrice: number;
  sizeUpchargeM?: number | null;
  sizeUpchargeL?: number | null;
  cogsSizeS?: number;
  cogsSizeM?: number;
  cogsSizeL?: number;
  grossProfitS?: number;
  marginPercentS?: number;
  imageUrl?: string | null;
  category?: string;
  tag?: string | null;
  isActive?: boolean;
  isSoldOutManual?: boolean;
  availableServings?: number;
  isOutOfStock?: boolean;
  ingredientOutOfStock?: boolean;
  recipesCount?: number;
  orderItemsCount?: number;
  recipes: RecipeEntry[];
}

interface ToppingRecipeEntry {
  id: number;
  toppingId?: string;
  toppingCode?: string;
  toppingName: string;
  subtext?: string | null;
  price?: number;
  isActive?: boolean;
  amount: number;
  ingredientId?: number;
  ingredient: Ingredient;
}

interface InventoryLogEntry {
  id: number;
  ingredientId: number;
  action: string;
  changeAmount: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  totalCost: number;
  note?: string | null;
  performedBy?: string | null;
  createdAt: string;
  ingredient?: {
    id: number;
    code: string;
    name: string;
    unit: string;
  };
}

interface VoucherAdminItem {
  id: number;
  code: string;
  description: string;
  discountPercent: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
  isActive: boolean;
  usageCount: number;
}

interface OrderItemDetail {
  id: number;
  productId: number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
  unitPrice: number;
}

interface OrderSummary {
  id: number;
  status: string;
  totalAmount: number;
  discountCode?: string | null;
  discountAmount?: number;
  createdAt: string;
  updatedAt?: string;
  items?: OrderItemDetail[];
  user?: {
    id?: number;
    fullName: string | null;
    email: string;
    phone?: string | null;
  };
}

interface TopSellingProduct {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

type AdminTab = "overview" | "products" | "inventory" | "recipes" | "vouchers" | "revenue" | "staff";

const CATEGORY_OPTIONS = [
  { id: "vietnamese", label: "Cà Phê Phin Việt Nam" },
  { id: "espresso", label: "Signature Espresso" },
  { id: "tea", label: "Trà Trái Cây & Matcha" },
  { id: "coldbrew", label: "Cold Brew Ủ Lạnh" },
  { id: "bakery", label: "Bánh Ngọt Thủ Công" },
];

const BUILTIN_PRODUCT_IMAGES = [
  { label: "Cà phê Đen", url: "/images/products/ca-phe-den.png" },
  { label: "Cà phê Sữa", url: "/images/products/ca-phe-sua.png" },
  { label: "Bạc Xỉu", url: "/images/products/ca-phe-bac-xiu.png" },
  { label: "Cà phê Muối", url: "/images/products/ca-phe-muoi.png" },
  {
    label: "Caramel Macchiato",
    url: "/images/products/iced-caramel-macchiato.png",
  },
  { label: "Matcha Latte", url: "/images/products/matcha-latte.png" },
  { label: "Trà Đào Cam Sả", url: "/images/products/tra-dao-cam-sa.png" },
  { label: "Pain au Chocolat", url: "/images/products/pain-au-chocolat.png" },
  {
    label: "Basque Cheesecake",
    url: "/images/products/basque-burnt-cheesecake.png",
  },
  { label: "Classic Tiramisu", url: "/images/products/classic-tiramisu.png" },
  { label: "Bánh Croissant", url: "/images/products/croissant.png" },
];

export default function AdminPortalPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Core Data States
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [toppingRecipes, setToppingRecipes] = useState<ToppingRecipeEntry[]>(
    []
  );
  const [allOrders, setAllOrders] = useState<OrderSummary[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<
    TopSellingProduct[]
  >([]);
  const [dashboardRevenue, setDashboardRevenue] = useState<number>(0);
  const [dashboardCogsSold, setDashboardCogsSold] = useState<number>(0);
  const [dashboardGrossProfit, setDashboardGrossProfit] = useState<number>(0);
  const [dashboardInventoryValue, setDashboardInventoryValue] = useState<number>(0);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLogEntry[]>([]);
  const [vouchers, setVouchers] = useState<VoucherAdminItem[]>([]);
  const [sizePricing, setSizePricing] = useState<{ sizeS: string; sizeM: string; sizeL: string }>({
    sizeS: "0",
    sizeM: "5000",
    sizeL: "10000",
  });
  const [isSavingSizePricing, setIsSavingSizePricing] = useState<boolean>(false);
  const [inlineProductDrafts, setInlineProductDrafts] = useState<
    Record<number, { basePrice: string; description: string; sizeUpchargeM: string; sizeUpchargeL: string }>
  >({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ─── 1. PRODUCT MANAGEMENT STATES ──────────────────────────────────────────
  const [productSearch, setProductSearch] = useState<string>("");
  const [productCategoryFilter, setProductCategoryFilter] =
    useState<string>("all");
  const [productVisibilityFilter, setProductVisibilityFilter] = useState<
    "all" | "active" | "hidden" | "soldout"
  >("all");

  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(
    null
  );
  const [prodName, setProdName] = useState<string>("");
  const [prodDesc, setProdDesc] = useState<string>("");
  const [prodPrice, setProdPrice] = useState<string>("39000");
  const [prodSizeUpchargeM, setProdSizeUpchargeM] = useState<string>("");
  const [prodSizeUpchargeL, setProdSizeUpchargeL] = useState<string>("");
  const [prodCategory, setProdCategory] = useState<string>("vietnamese");
  const [prodTag, setProdTag] = useState<string>("Phổ biến");
  const [prodImageUrl, setProdImageUrl] = useState<string>(
    "/images/products/ca-phe-sua.png"
  );
  const [imageInputMode, setImageInputMode] = useState<
    "preset" | "upload" | "url"
  >("preset");
  const [prodIsActive, setProdIsActive] = useState<boolean>(true);
  const [prodIsSoldOutManual, setProdIsSoldOutManual] =
    useState<boolean>(false);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);

  // Delete Confirmation Modal (shared for Product or Ingredient)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "product" | "ingredient";
    id: number;
    name: string;
    recipesCount: number;
    ordersCount?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // ─── 2. INVENTORY MANAGEMENT STATES ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<
    "all" | "low" | "pastry" | "beverage"
  >("all");

  // Restock / Set Stock Modal
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [modalMode, setModalMode] = useState<"restock" | "set">("restock");
  const [amountInput, setAmountInput] = useState<string>("500");
  const [restockCostInput, setRestockCostInput] = useState<string>("");
  const [restockCostMode, setRestockCostMode] = useState<"unit" | "bulk">("bulk");
  const [noteInput, setNoteInput] = useState<string>(
    "Nhập hàng định kỳ ca sáng"
  );
  const [isSubmittingModal, setIsSubmittingModal] = useState<boolean>(false);

  // Create / Edit Ingredient Info Modal
  const [isIngFormOpen, setIsIngFormOpen] = useState<boolean>(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingCode, setIngCode] = useState<string>("");
  const [ingName, setIngName] = useState<string>("");
  const [ingUnit, setIngUnit] = useState<string>("g");
  const [ingStock, setIngStock] = useState<string>("1000");
  const [ingMinThreshold, setIngMinThreshold] = useState<string>("200");
  const [ingCostPerUnit, setIngCostPerUnit] = useState<string>("250");
  const [ingCostBulk, setIngCostBulk] = useState<string>("250000");
  const [inlineIngCostDrafts, setInlineIngCostDrafts] = useState<Record<number, string>>({});
  const [isSavingIng, setIsSavingIng] = useState<boolean>(false);

  // ─── 3. BOM RECIPES EDITOR STATES ──────────────────────────────────────────
  const [focusedProductIdForBom, setFocusedProductIdForBom] = useState<
    number | "all"
  >("all");
  const [editingRecipeAmounts, setEditingRecipeAmounts] = useState<
    Record<number, string>
  >({});
  const [editingToppingAmounts, setEditingToppingAmounts] = useState<
    Record<number, string>
  >({});
  const [editingToppingPrices, setEditingToppingPrices] = useState<
    Record<number, string>
  >({});
  const [editingToppingNames, setEditingToppingNames] = useState<
    Record<number, string>
  >({});
  const [editingToppingSubtexts, setEditingToppingSubtexts] = useState<
    Record<number, string>
  >({});
  const [isToppingModalOpen, setIsToppingModalOpen] = useState<boolean>(false);
  const [newTopCode, setNewTopCode] = useState<string>("");
  const [newTopName, setNewTopName] = useState<string>("");
  const [newTopSubtext, setNewTopSubtext] = useState<string>("");
  const [newTopPrice, setNewTopPrice] = useState<string>("10000");
  const [newTopAmount, setNewTopAmount] = useState<string>("30");
  const [newTopIngId, setNewTopIngId] = useState<number>(0);
  const [isSavingTopping, setIsSavingTopping] = useState<boolean>(false);

  // ─── 5. VOUCHERS MANAGEMENT STATES ─────────────────────────────────────────
  const [newVoucherCode, setNewVoucherCode] = useState<string>("");
  const [newVoucherDesc, setNewVoucherDesc] = useState<string>("");
  const [newVoucherPercent, setNewVoucherPercent] = useState<string>("15");
  const [newVoucherMinOrder, setNewVoucherMinOrder] = useState<string>("0");
  const [newVoucherMaxDiscount, setNewVoucherMaxDiscount] = useState<string>("");
  const [isSavingVoucher, setIsSavingVoucher] = useState<boolean>(false);
  const [editingVoucherDrafts, setEditingVoucherDrafts] = useState<
    Record<
      number,
      {
        discountPercent: string;
        minOrderAmount: string;
        maxDiscountAmount: string;
        description: string;
      }
    >
  >({});
  // Add new recipe row modal
  const [bomModalProduct, setBomModalProduct] = useState<ProductItem | null>(
    null
  );
  const [bomSelectedIngId, setBomSelectedIngId] = useState<number>(0);
  const [bomSelectedSize, setBomSelectedSize] = useState<string>("M");
  const [bomAmountInput, setBomAmountInput] = useState<string>("25");
  const [isSavingBom, setIsSavingBom] = useState<boolean>(false);

  // ─── 4. ORDERS & REVENUE MANAGEMENT STATES ─────────────────────────────────
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [selectedOrderDetail, setSelectedOrderDetail] =
    useState<OrderSummary | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Auth & Role Guard
  useEffect(() => {
    if (_hasHydrated) {
      if (!isAuthenticated || !user) {
        router.replace("/login?redirect=/admin");
      } else if (user.role !== "ADMIN") {
        router.replace(user.role === "STAFF" ? "/staff" : "/menu");
      }
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  const fetchAdminData = useCallback(async () => {
    if (!_hasHydrated || !isAuthenticated || user?.role !== "ADMIN") return;
    setIsLoading(true);
    try {
      const [ingRes, recRes, prodRes, dashRes, logsRes, vouchersRes] = await Promise.all([
        apiFetch("/inventory/ingredients", { cache: "no-store" }),
        apiFetch("/inventory/recipes", { cache: "no-store" }),
        apiFetch("/products?includeInactive=true", { cache: "no-store" }),
        apiFetch("/inventory/dashboard", { cache: "no-store" }),
        apiFetch("/inventory/logs?limit=40", { cache: "no-store" }),
        apiFetch("/inventory/vouchers", { cache: "no-store" }),
      ]);

      if (ingRes.ok) {
        const ingData = await ingRes.json();
        setIngredients(Array.isArray(ingData) ? ingData : []);
      }

      const prodList: ProductItem[] = prodRes.ok ? await prodRes.json() : [];

      if (recRes.ok) {
        const recData = await recRes.json();
        const rawProducts: ProductItem[] = Array.isArray(recData?.products)
          ? recData.products
          : [];
        const merged = prodList.map((p) => {
          const matchRec = rawProducts.find((rp) => rp.id === p.id);
          return {
            ...p,
            recipes: matchRec?.recipes ?? p.recipes ?? [],
          };
        });
        setProducts(merged);
        setToppingRecipes(
          Array.isArray(recData?.toppingRecipes) ? recData.toppingRecipes : []
        );
      } else {
        setProducts(prodList);
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setDashboardRevenue(dashData?.totalRevenue ?? 0);
        setDashboardCogsSold(dashData?.totalCogsSold ?? 0);
        setDashboardGrossProfit(dashData?.totalGrossProfit ?? 0);
        setDashboardInventoryValue(dashData?.totalInventoryValue ?? 0);
        if (dashData?.sizePricing) {
          setSizePricing({
            sizeS: String(dashData.sizePricing.sizeS ?? 0),
            sizeM: String(dashData.sizePricing.sizeM ?? 5000),
            sizeL: String(dashData.sizePricing.sizeL ?? 10000),
          });
        }
        setAllOrders(
          Array.isArray(dashData?.recentOrders) ? dashData.recentOrders : []
        );
        setTopSellingProducts(
          Array.isArray(dashData?.topSellingProducts)
            ? dashData.topSellingProducts
            : []
        );
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setInventoryLogs(Array.isArray(logsData) ? logsData : []);
      }
      if (vouchersRes.ok) {
        const vData = await vouchersRes.json();
        setVouchers(Array.isArray(vData) ? vData : []);
      }
    } catch {
      showToast("Không thể tải dữ liệu quản trị từ máy chủ");
    } finally {
      setIsLoading(false);
    }
  }, [_hasHydrated, isAuthenticated, user]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // ─── PRODUCT HANDLERS ──────────────────────────────────────────────────────
  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProdName("");
    setProdDesc("");
    setProdPrice("39000");
    setProdSizeUpchargeM("");
    setProdSizeUpchargeL("");
    setProdCategory("vietnamese");
    setProdTag("Mới");
    setProdImageUrl("/images/products/ca-phe-sua.png");
    setImageInputMode("preset");
    setProdIsActive(false);
    setProdIsSoldOutManual(false);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: ProductItem) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdDesc(prod.description || "");
    setProdPrice(String(prod.basePrice));
    setProdSizeUpchargeM(
      prod.sizeUpchargeM !== null && prod.sizeUpchargeM !== undefined
        ? String(prod.sizeUpchargeM)
        : ""
    );
    setProdSizeUpchargeL(
      prod.sizeUpchargeL !== null && prod.sizeUpchargeL !== undefined
        ? String(prod.sizeUpchargeL)
        : ""
    );
    setProdCategory(prod.category || "vietnamese");
    setProdTag(prod.tag || "Phổ biến");
    const img = prod.imageUrl || "/images/products/ca-phe-sua.png";
    setProdImageUrl(img);
    if (img.startsWith("data:")) {
      setImageInputMode("upload");
    } else if (BUILTIN_PRODUCT_IMAGES.some((b) => b.url === img)) {
      setImageInputMode("preset");
    } else {
      setImageInputMode("url");
    }
    setProdIsActive(prod.isActive !== false);
    setProdIsSoldOutManual(Boolean(prod.isSoldOutManual));
    setIsProductModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) return;
      // Compress via canvas to 640x640 JPEG (0.84) for fast DB storage & instant rendering
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 640;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h >= w && h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.84);
          setProdImageUrl(compressed);
        } else {
          setProdImageUrl(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast("Vui lòng nhập tên sản phẩm");
      return;
    }
    const priceNum = Number(prodPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast("Giá bán không hợp lệ");
      return;
    }

    setIsSavingProduct(true);
    try {
      const payload = {
        name: prodName.trim(),
        description: prodDesc.trim(),
        basePrice: priceNum,
        sizeUpchargeM:
          prodSizeUpchargeM.trim() === "" ? null : Number(prodSizeUpchargeM),
        sizeUpchargeL:
          prodSizeUpchargeL.trim() === "" ? null : Number(prodSizeUpchargeL),
        category: prodCategory,
        tag: prodTag.trim() || "Phổ biến",
        imageUrl: prodImageUrl.trim() || "/images/products/ca-phe-sua.png",
        isActive: prodIsActive,
        isSoldOutManual: prodIsSoldOutManual,
      };

      const res = await apiFetch(
        editingProduct ? `/products/${editingProduct.id}` : "/products",
        {
          method: editingProduct ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể lưu sản phẩm");
      }

      const savedProduct = await res.json().catch(() => null);
      setIsProductModalOpen(false);
      await fetchAdminData();

      if (!editingProduct && savedProduct) {
        showToast(
          `✅ Đã thêm món "${savedProduct.name || prodName.trim()}" (Mặc định ẨN). Mời bạn cấu hình công thức BOM.`
        );
        setActiveTab("recipes");
        setFocusedProductIdForBom(savedProduct.id);
        openAddBomModal(savedProduct);
      } else {
        showToast(
          editingProduct
            ? `✅ Đã cập nhật món "${prodName.trim()}"`
            : `✅ Đã thêm món mới "${prodName.trim()}" vào thực đơn`
        );
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi khi lưu sản phẩm");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleSaveInlineProduct = async (prod: ProductItem) => {
    const draft = inlineProductDrafts[prod.id];
    if (!draft) return;
    const priceNum = Number(draft.basePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast("Giá bán không hợp lệ");
      return;
    }
    try {
      const payload = {
        basePrice: priceNum,
        description: draft.description.trim(),
        sizeUpchargeM:
          draft.sizeUpchargeM.trim() === "" ? null : Number(draft.sizeUpchargeM),
        sizeUpchargeL:
          draft.sizeUpchargeL.trim() === "" ? null : Number(draft.sizeUpchargeL),
      };
      const res = await apiFetch(`/products/${prod.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Không thể cập nhật nhanh sản phẩm");
      showToast(`✅ Đã lưu nhanh giá bán, giá size & mô tả cho "${prod.name}"`);
      setInlineProductDrafts((prev) => {
        const next = { ...prev };
        delete next[prod.id];
        return next;
      });
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi cập nhật nhanh");
    }
  };

  const handleSaveGlobalSizePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSizePricing(true);
    try {
      const res = await apiFetch("/inventory/size-pricing", {
        method: "PATCH",
        body: JSON.stringify({
          sizeS: Number(sizePricing.sizeS) || 0,
          sizeM: Number(sizePricing.sizeM) || 0,
          sizeL: Number(sizePricing.sizeL) || 0,
        }),
      });
      if (!res.ok) throw new Error("Không thể lưu cấu hình giá Size");
      showToast("✅ Đã cập nhật bảng giá phụ thu Size S / M / L toàn cửa hàng!");
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi lưu giá Size");
    } finally {
      setIsSavingSizePricing(false);
    }
  };

  const handleToggleProductVisibility = async (
    prod: ProductItem,
    field: "isActive" | "isSoldOutManual"
  ) => {
    const nextVal =
      field === "isActive"
        ? prod.isActive === false
          ? true
          : false
        : !prod.isSoldOutManual;

    try {
      const res = await apiFetch(`/products/${prod.id}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: nextVal }),
      });
      if (!res.ok) {
        throw new Error("Không thể cập nhật trạng thái hiển thị");
      }
      if (field === "isActive") {
        showToast(
          nextVal
            ? `👁️ Đã HIỆN món "${prod.name}" trên trang Thực đơn khách hàng`
            : `🙈 Đã ẨN món "${prod.name}" khỏi trang Thực đơn khách hàng`
        );
      } else {
        showToast(
          nextVal
            ? `🚫 Đã bật báo HẾT HÀNG thủ công cho "${prod.name}"`
            : `✅ Đã mở bán lại bình thường cho "${prod.name}"`
        );
      }
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const endpoint =
        deleteTarget.type === "product"
          ? `/products/${deleteTarget.id}`
          : `/inventory/ingredients/${deleteTarget.id}`;

      const res = await apiFetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Lỗi khi xóa dữ liệu");
      }

      showToast(
        deleteTarget.type === "product"
          ? `🗑️ Đã xóa món "${deleteTarget.name}" khỏi hệ thống`
          : `🗑️ Đã xóa nguyên vật liệu "${deleteTarget.name}" khỏi kho`
      );
      setDeleteTarget(null);
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Không thể xóa mục này");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── INGREDIENT HANDLERS ───────────────────────────────────────────────────
  const openRestockModal = (ing: Ingredient, mode: "restock" | "set") => {
    setSelectedIngredient(ing);
    setModalMode(mode);
    const isBulk = ing.unit === "g" || ing.unit === "ml";
    const unitCost = Number(ing.costPerUnit ?? 0);
    setRestockCostMode(isBulk ? "bulk" : "unit");
    setRestockCostInput(String(isBulk ? Math.round(unitCost * 1000) : unitCost));
    if (mode === "restock") {
      setAmountInput(isBulk ? "1000" : "20");
      setNoteInput("Nhập kho bổ sung");
    } else {
      setAmountInput(String(ing.stock));
      setNoteInput("Kiểm kê điều chỉnh tồn kho thực tế");
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;
    const numericVal = Number(amountInput);
    if (isNaN(numericVal) || numericVal < 0) {
      showToast("Số lượng không hợp lệ");
      return;
    }

    setIsSubmittingModal(true);
    try {
      const isBulk = selectedIngredient.unit === "g" || selectedIngredient.unit === "ml";
      const rawCost = Number(restockCostInput);
      const computedUnitCost =
        !isNaN(rawCost) && rawCost >= 0
          ? restockCostMode === "bulk" && isBulk
            ? rawCost / 1000
            : rawCost
          : undefined;

      if (modalMode === "restock") {
        const res = await apiFetch(
          `/inventory/ingredients/${selectedIngredient.id}/restock`,
          {
            method: "PATCH",
            body: JSON.stringify({
              addAmount: numericVal,
              unitCost: computedUnitCost,
              note: noteInput.trim(),
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Lỗi nhập kho");
        }
        showToast(
          `✅ Đã nhập thêm +${numericVal.toLocaleString("vi-VN")} ${selectedIngredient.unit} cho ${selectedIngredient.name}`
        );
      } else {
        const res = await apiFetch(
          `/inventory/ingredients/${selectedIngredient.id}/stock`,
          {
            method: "PATCH",
            body: JSON.stringify({
              stock: numericVal,
              costPerUnit: computedUnitCost,
              note: noteInput.trim(),
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Lỗi cập nhật tồn kho");
        }
        showToast(
          `✅ Đã đặt mức tồn kho ${selectedIngredient.name} = ${numericVal.toLocaleString("vi-VN")} ${selectedIngredient.unit}`
        );
      }
      setSelectedIngredient(null);
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const openCreateIngredientModal = () => {
    setEditingIng(null);
    setIngCode("ING_NEW_ITEM");
    setIngName("");
    setIngUnit("ml");
    setIngStock("2000");
    setIngMinThreshold("300");
    setIngCostPerUnit("45");
    setIngCostBulk("45000");
    setIsIngFormOpen(true);
  };

  const openEditIngredientModal = (ing: Ingredient) => {
    setEditingIng(ing);
    setIngCode(ing.code);
    setIngName(ing.name);
    setIngUnit(ing.unit);
    setIngStock(String(ing.stock));
    setIngMinThreshold(String(ing.minThreshold));
    const cpu = Number(ing.costPerUnit ?? 0);
    setIngCostPerUnit(String(cpu));
    setIngCostBulk(
      String(ing.unit === "g" || ing.unit === "ml" ? Math.round(cpu * 1000) : cpu)
    );
    setIsIngFormOpen(true);
  };

  const handleSaveInlineIngCost = async (ing: Ingredient) => {
    const draft = inlineIngCostDrafts[ing.id];
    if (draft === undefined) return;
    const val = Number(draft);
    if (isNaN(val) || val < 0) {
      showToast("Giá nhập không hợp lệ");
      return;
    }
    const isBulk = ing.unit === "g" || ing.unit === "ml";
    const costPerUnit = isBulk ? val / 1000 : val;
    try {
      const res = await apiFetch(`/inventory/ingredients/${ing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ costPerUnit }),
      });
      if (!res.ok) throw new Error("Không thể lưu giá nhập");
      showToast(
        `✅ Đã cập nhật giá nhập "${ing.name}" = ${val.toLocaleString("vi-VN")}đ / ${
          isBulk ? (ing.unit === "g" ? "1 Kg" : "1 Lít") : `1 ${ing.unit}`
        }`
      );
      setInlineIngCostDrafts((prev) => {
        const next = { ...prev };
        delete next[ing.id];
        return next;
      });
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi cập nhật giá nhập");
    }
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim() || !ingCode.trim()) {
      showToast("Vui lòng nhập đầy đủ mã và tên nguyên vật liệu");
      return;
    }
    const stockNum = Number(ingStock);
    const minNum = Number(ingMinThreshold);
    if (isNaN(stockNum) || stockNum < 0 || isNaN(minNum) || minNum < 0) {
      showToast("Số lượng tồn kho hoặc ngưỡng cảnh báo không hợp lệ");
      return;
    }

    setIsSavingIng(true);
    try {
      const payload = {
        code: ingCode.trim().toUpperCase(),
        name: ingName.trim(),
        unit: ingUnit.trim(),
        stock: stockNum,
        minThreshold: minNum,
        costPerUnit: Math.max(0, Number(ingCostPerUnit) || 0),
      };
      const res = await apiFetch(
        editingIng
          ? `/inventory/ingredients/${editingIng.id}`
          : "/inventory/ingredients",
        {
          method: editingIng ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể lưu nguyên vật liệu");
      }

      showToast(
        editingIng
          ? `✅ Đã cập nhật thông tin nguyên liệu "${ingName.trim()}"`
          : `✅ Đã thêm nguyên liệu mới "${ingName.trim()}" vào kho`
      );
      setIsIngFormOpen(false);
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setIsSavingIng(false);
    }
  };

  // ─── BOM RECIPE HANDLERS ───────────────────────────────────────────────────
  const openAddBomModal = (prod: ProductItem) => {
    setBomModalProduct(prod);
    setBomSelectedIngId(ingredients[0]?.id ?? 0);
    setBomSelectedSize(prod.category === "bakery" ? "ALL" : "M");
    setBomAmountInput(prod.category === "bakery" ? "1" : "25");
  };

  const handleSaveBomEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomModalProduct || !bomSelectedIngId) return;
    const amt = Number(bomAmountInput);
    if (isNaN(amt) || amt <= 0) {
      showToast("Định lượng phải lớn hơn 0");
      return;
    }

    setIsSavingBom(true);
    try {
      const res = await apiFetch("/inventory/recipes", {
        method: "POST",
        body: JSON.stringify({
          productId: bomModalProduct.id,
          ingredientId: Number(bomSelectedIngId),
          size: bomSelectedSize,
          amount: amt,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể lưu công thức BOM");
      }
      showToast(
        `✅ Đã cập nhật định lượng Size ${bomSelectedSize} cho món "${bomModalProduct.name}"`
      );
      setBomModalProduct(null);
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi cập nhật BOM");
    } finally {
      setIsSavingBom(false);
    }
  };

  const handleUpdateInlineRecipeAmount = async (recipe: RecipeEntry) => {
    const rawVal = editingRecipeAmounts[recipe.id];
    if (rawVal === undefined) return;
    const numVal = Number(rawVal);
    if (isNaN(numVal) || numVal <= 0) {
      showToast("Định lượng phải lớn hơn 0");
      return;
    }

    try {
      const res = await apiFetch(`/inventory/recipes/${recipe.id}`, {
        method: "PATCH",
        body: JSON.stringify({ amount: numVal }),
      });
      if (!res.ok) {
        throw new Error("Không thể lưu định lượng");
      }
      showToast(
        `✅ Đã lưu định lượng ${recipe.ingredient?.name} (Size ${recipe.size}) = ${numVal}${recipe.ingredient?.unit}`
      );
      setEditingRecipeAmounts((prev) => {
        const next = { ...prev };
        delete next[recipe.id];
        return next;
      });
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi lưu định lượng");
    }
  };

  const handleDeleteRecipeRow = async (
    recipeId: number,
    ingName: string,
    size: string
  ) => {
    try {
      const res = await apiFetch(`/inventory/recipes/${recipeId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Không thể xóa dòng công thức");
      }
      showToast(`🗑️ Đã gỡ "${ingName}" (Size ${size}) khỏi công thức`);
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi khi xóa công thức");
    }
  };

  const handleUpdateToppingItem = async (
    tr: ToppingRecipeEntry,
    overrideActive?: boolean
  ) => {
    const rawAmt = editingToppingAmounts[tr.id];
    const rawPrice = editingToppingPrices[tr.id];
    const rawName = editingToppingNames[tr.id];
    const rawSubtext = editingToppingSubtexts[tr.id];

    const numAmt = rawAmt !== undefined ? Number(rawAmt) : tr.amount;
    const numPrice = rawPrice !== undefined ? Number(rawPrice) : Number(tr.price ?? 8000);
    if (isNaN(numAmt) || numAmt <= 0 || isNaN(numPrice) || numPrice < 0) {
      showToast("Giá bán hoặc định lượng Topping không hợp lệ");
      return;
    }
    try {
      const res = await apiFetch(`/inventory/topping-recipes/${tr.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: numAmt,
          price: numPrice,
          toppingName: rawName !== undefined ? rawName.trim() : tr.toppingName,
          subtext: rawSubtext !== undefined ? rawSubtext.trim() : tr.subtext,
          isActive: overrideActive !== undefined ? overrideActive : tr.isActive !== false,
        }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật Topping");
      showToast(
        `✅ Đã cập nhật Topping "${rawName ?? tr.toppingName}" (Giá: +${numPrice.toLocaleString("vi-VN")}đ, Tiêu hao: ${numAmt}${tr.ingredient?.unit})`
      );
      setEditingToppingAmounts((prev) => {
        const next = { ...prev };
        delete next[tr.id];
        return next;
      });
      setEditingToppingPrices((prev) => {
        const next = { ...prev };
        delete next[tr.id];
        return next;
      });
      setEditingToppingNames((prev) => {
        const next = { ...prev };
        delete next[tr.id];
        return next;
      });
      setEditingToppingSubtexts((prev) => {
        const next = { ...prev };
        delete next[tr.id];
        return next;
      });
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi cập nhật Topping");
    }
  };

  const handleCreateTopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopName.trim() || !newTopCode.trim() || !newTopIngId) {
      showToast("Vui lòng điền mã, tên Topping và chọn nguyên liệu");
      return;
    }
    setIsSavingTopping(true);
    try {
      const res = await apiFetch("/inventory/topping-recipes", {
        method: "POST",
        body: JSON.stringify({
          toppingId: newTopCode.trim().toLowerCase(),
          toppingName: newTopName.trim(),
          subtext: newTopSubtext.trim() || "Topping đặc biệt",
          price: Number(newTopPrice) || 8000,
          amount: Number(newTopAmount) || 25,
          ingredientId: Number(newTopIngId),
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể thêm Topping");
      }
      showToast(`✅ Đã lưu Topping "${newTopName.trim()}" vào Menu!`);
      setIsToppingModalOpen(false);
      setNewTopCode("");
      setNewTopName("");
      setNewTopSubtext("");
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi thêm Topping");
    } finally {
      setIsSavingTopping(false);
    }
  };

  const handleDeleteTopping = async (tr: ToppingRecipeEntry) => {
    try {
      const res = await apiFetch(`/inventory/topping-recipes/${tr.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Không thể xóa Topping");
      showToast(`🗑️ Đã xóa Topping "${tr.toppingName}"`);
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi xóa Topping");
    }
  };

  // ─── VOUCHER HANDLERS ──────────────────────────────────────────────────────
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherCode.trim()) {
      showToast("Vui lòng nhập mã giảm giá");
      return;
    }
    setIsSavingVoucher(true);
    try {
      const res = await apiFetch("/inventory/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: newVoucherCode.trim().toUpperCase(),
          description: newVoucherDesc.trim() || `Giảm ${newVoucherPercent}% đơn hàng`,
          discountPercent: Number(newVoucherPercent) || 10,
          minOrderAmount: Number(newVoucherMinOrder) || 0,
          maxDiscountAmount:
            newVoucherMaxDiscount.trim() === ""
              ? null
              : Number(newVoucherMaxDiscount),
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể tạo mã giảm giá");
      }
      showToast(`✅ Đã tạo mã giảm giá ${newVoucherCode.trim().toUpperCase()} (-${newVoucherPercent}%)`);
      setNewVoucherCode("");
      setNewVoucherDesc("");
      setNewVoucherMaxDiscount("");
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi tạo mã giảm giá");
    } finally {
      setIsSavingVoucher(false);
    }
  };

  const handleUpdateVoucher = async (
    v: VoucherAdminItem,
    overrideActive?: boolean
  ) => {
    const draft = editingVoucherDrafts[v.id];
    try {
      const res = await apiFetch(`/inventory/vouchers/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          discountPercent: draft ? Number(draft.discountPercent) : v.discountPercent,
          minOrderAmount: draft ? Number(draft.minOrderAmount) : v.minOrderAmount,
          maxDiscountAmount: draft
            ? draft.maxDiscountAmount.trim() === ""
              ? null
              : Number(draft.maxDiscountAmount)
            : v.maxDiscountAmount,
          description: draft ? draft.description : v.description,
          isActive: overrideActive !== undefined ? overrideActive : v.isActive,
        }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật mã giảm giá");
      showToast(`✅ Đã cập nhật mã giảm giá ${v.code}`);
      setEditingVoucherDrafts((prev) => {
        const next = { ...prev };
        delete next[v.id];
        return next;
      });
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi cập nhật mã giảm giá");
    }
  };

  const handleDeleteVoucher = async (v: VoucherAdminItem) => {
    try {
      const res = await apiFetch(`/inventory/vouchers/${v.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Không thể xóa mã giảm giá");
      showToast(`🗑️ Đã xóa mã giảm giá ${v.code}`);
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi xóa mã giảm giá");
    }
  };

  // ─── ORDER MANAGEMENT HANDLERS ─────────────────────────────────────────────
  const handleAdminOrderStatusChange = async (
    orderId: number,
    nextStatus: string
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await apiFetch(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể chuyển trạng thái đơn hàng");
      }
      showToast(
        nextStatus === "CANCELLED"
          ? `🔄 Đã hủy đơn #${orderId} và tự động hoàn trả nguyên vật liệu về kho!`
          : `✅ Đã chuyển đơn #${orderId} sang trạng thái ${nextStatus}`
      );
      if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
        setSelectedOrderDetail({ ...selectedOrderDetail, status: nextStatus });
      }
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lỗi cập nhật đơn hàng");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ─── COMPUTED METRICS & FILTERS ────────────────────────────────────────────
  const totalIngredients = ingredients.length;
  const lowStockCount = ingredients.filter(
    (i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK"
  ).length;
  const activeProductsCount = products.filter(
    (p) => p.isActive !== false
  ).length;
  const hiddenProductsCount = products.filter(
    (p) => p.isActive === false
  ).length;
  const outOfStockProductsCount = products.filter((p) => p.isOutOfStock).length;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      const matchCat =
        productCategoryFilter === "all" || p.category === productCategoryFilter;
      let matchVis = true;
      if (productVisibilityFilter === "active") {
        matchVis = p.isActive !== false;
      } else if (productVisibilityFilter === "hidden") {
        matchVis = p.isActive === false;
      } else if (productVisibilityFilter === "soldout") {
        matchVis = Boolean(p.isOutOfStock);
      }
      return matchSearch && matchCat && matchVis;
    });
  }, [
    products,
    productSearch,
    productCategoryFilter,
    productVisibilityFilter,
  ]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchSearch =
        !searchQuery.trim() ||
        ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ing.code.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (stockFilter === "low") {
        return ing.status === "LOW_STOCK" || ing.status === "OUT_OF_STOCK";
      }
      if (stockFilter === "pastry") {
        return (
          ing.unit === "chiếc" || ing.unit === "lát" || ing.unit === "phần"
        );
      }
      if (stockFilter === "beverage") {
        return ing.unit === "g" || ing.unit === "ml";
      }
      return true;
    });
  }, [ingredients, searchQuery, stockFilter]);

  const filteredBomProducts = useMemo(() => {
    if (focusedProductIdForBom === "all") return products;
    return products.filter((p) => p.id === focusedProductIdForBom);
  }, [products, focusedProductIdForBom]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const matchStatus =
        orderStatusFilter === "ALL" || o.status === orderStatusFilter;
      const q = orderSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(o.id).includes(q) ||
        (o.user?.fullName && o.user.fullName.toLowerCase().includes(q)) ||
        (o.user?.email && o.user.email.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [allOrders, orderStatusFilter, orderSearchQuery]);

  if (!_hasHydrated || !isAuthenticated || user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#9E5A2B]/30 border-t-[#9E5A2B] rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#7A6A5E]">
            Đang xác thực quyền Quản trị viên (Admin)...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2C1E18] flex font-body">
      {/* ─── LEFT SIDEBAR NAVIGATION ─── */}
      <aside
        className={`${
          sidebarCollapsed ? "w-20" : "w-64"
        } transition-all duration-300 bg-[#2C1810] text-[#FAF6F0] flex flex-col justify-between shrink-0 sticky top-0 h-screen z-30 shadow-xl`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            {!sidebarCollapsed && (
              <Link href="/menu" className="brightness-0 invert">
                <BrewLiteLogo className="h-8 w-auto" />
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#FEB785] transition-colors mx-auto"
              title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {sidebarCollapsed ? "menu_open" : "menu"}
              </span>
            </button>
          </div>

          {/* Role Badge */}
          {!sidebarCollapsed && (
            <div className="px-4 py-3.5 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#9E5A2B] flex items-center justify-center font-bold text-white shadow-inner">
                  AD
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user.fullName || "Quản Trị Viên"}
                  </p>
                  <p className="text-[11px] text-[#FEB785] font-medium truncate">
                    Cổng Quản Trị Toàn Diện
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="p-3 space-y-1.5">
            {[
              {
                id: "overview" as AdminTab,
                icon: "space_dashboard",
                label: "Tổng Quan",
              },
              {
                id: "products" as AdminTab,
                icon: "restaurant_menu",
                label: "Quản Lý Thực Đơn",
                badge: products.length,
              },
              {
                id: "inventory" as AdminTab,
                icon: "inventory_2",
                label: "Kho Nguyên Liệu",
                badge: lowStockCount > 0 ? lowStockCount : undefined,
                badgeAlert: lowStockCount > 0,
              },
              {
                id: "recipes" as AdminTab,
                icon: "science",
                label: "BOM & Giá Topping",
                badge: toppingRecipes.length,
              },
              {
                id: "vouchers" as AdminTab,
                icon: "loyalty",
                label: "Mã Giảm Giá (Voucher)",
                badge: vouchers.length,
              },
              {
                id: "revenue" as AdminTab,
                icon: "monitoring",
                label: "Doanh Thu & Đơn Hàng",
                badge: allOrders.length,
              },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#9E5A2B] text-white shadow-md"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                        item.badgeAlert
                          ? "bg-[#DC2626] text-white"
                          : "bg-white/15 text-white/90"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Links */}
        <div className="p-3 border-t border-white/10 space-y-1.5">
          <Link
            href="/staff"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#FEB785] bg-white/5 hover:bg-white/15 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              coffee_maker
            </span>
            {!sidebarCollapsed && <span>Màn hình Pha Chế (KDS)</span>}
          </Link>
          <Link
            href="/menu"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              storefront
            </span>
            {!sidebarCollapsed && <span>Xem Trang Khách Hàng</span>}
          </Link>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            {!sidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Bar */}
        <header className="h-16 bg-white/85 backdrop-blur-md border-b border-[#E6DDD5] px-6 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="font-headline text-lg md:text-xl font-extrabold text-[#2C1E18]">
              {activeTab === "overview" && "Tổng Quan Vận Hành Cửa Hàng"}
              {activeTab === "products" &&
                "Quản Lý Thực Đơn & Sản Phẩm (Menu CRUD)"}
              {activeTab === "inventory" &&
                "Quản Lý Kho Nguyên Vật Liệu (Inventory CRUD)"}
              {activeTab === "recipes" &&
                "Thiết Lập Định Lượng BOM & Quản Lý Giá Topping"}
              {activeTab === "vouchers" &&
                "Quản Lý Mã Giảm Giá & Khuyến Mãi (Voucher CRUD)"}
              {activeTab === "revenue" &&
                "Quản Trị Đơn Hàng & Báo Cáo Doanh Thu"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "products" && (
              <button
                onClick={openCreateProductModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C1810] hover:bg-[#3F2E26] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add_circle
                </span>
                Thêm món mới
              </button>
            )}
            {activeTab === "inventory" && (
              <button
                onClick={openCreateIngredientModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C1810] hover:bg-[#3F2E26] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add_box
                </span>
                Thêm nguyên vật liệu
              </button>
            )}
            <button
              onClick={fetchAdminData}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F3ECE4] hover:bg-[#E6DDD5] text-xs font-bold text-[#2C1E18] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                refresh
              </span>
              Làm mới dữ liệu
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#2C1810] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#9E5A2B] flex items-center gap-3 animate-bounce">
            <span className="material-symbols-outlined text-[#FEB785]">
              notifications_active
            </span>
            <span className="text-sm font-semibold">{toastMsg}</span>
          </div>
        )}

        <main className="p-6 space-y-6 max-w-[1560px] w-full mx-auto">
          {/* ─── TOP KPI ROW ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab("revenue")}
              className="bg-white rounded-2xl p-5 border border-[#E6DDD5] shadow-sm flex items-center justify-between cursor-pointer hover:border-[#9E5A2B]/50 transition-all"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#7A6A5E]">
                  Doanh Thu Thực Nhận
                </p>
                <p className="text-2xl font-extrabold text-[#9E5A2B] mt-1 font-headline">
                  {dashboardRevenue.toLocaleString("vi-VN")}đ
                </p>
                <p className="text-[11px] text-[#166534] font-bold mt-1">
                  Lãi gộp: +{dashboardGrossProfit.toLocaleString("vi-VN")}đ (Giá vốn: {dashboardCogsSold.toLocaleString("vi-VN")}đ)
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">
                  payments
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("products")}
              className="bg-white rounded-2xl p-5 border border-[#E6DDD5] shadow-sm flex items-center justify-between cursor-pointer hover:border-[#9E5A2B]/50 transition-all"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#7A6A5E]">
                  Thực Đơn Cửa Hàng
                </p>
                <p className="text-2xl font-extrabold text-[#2C1E18] mt-1 font-headline">
                  {activeProductsCount}{" "}
                  <span className="text-sm font-semibold text-[#7A6A5E]">
                    / {products.length} món
                  </span>
                </p>
                <p className="text-[11px] text-[#7A6A5E] mt-1">
                  Đang ẩn: <strong>{hiddenProductsCount}</strong> • Hết hàng:{" "}
                  <strong className="text-[#991B1B]">
                    {outOfStockProductsCount}
                  </strong>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#F3ECE4] text-[#9E5A2B] flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">
                  restaurant_menu
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("inventory")}
              className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                lowStockCount > 0
                  ? "bg-[#FEF2F2] border-red-200"
                  : "bg-white border-[#E6DDD5]"
              }`}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#7A6A5E]">
                  Kho Nguyên Vật Liệu
                </p>
                <p
                  className={`text-2xl font-extrabold mt-1 font-headline ${
                    lowStockCount > 0 ? "text-[#991B1B]" : "text-[#166534]"
                  }`}
                >
                  {totalIngredients} mặt hàng
                </p>
                <p className="text-[11px] text-[#7A6A5E] mt-1">
                  Giá trị kho: <strong className="text-[#2C1E18]">{dashboardInventoryValue.toLocaleString("vi-VN")}đ</strong> •{" "}
                  {lowStockCount > 0 ? `⚠️ ${lowStockCount} sắp hết` : "✅ Đủ định mức"}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  lowStockCount > 0
                    ? "bg-red-100 text-[#991B1B]"
                    : "bg-emerald-100 text-[#166534]"
                }`}
              >
                <span className="material-symbols-outlined text-[26px]">
                  inventory_2
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("recipes")}
              className="bg-white rounded-2xl p-5 border border-[#E6DDD5] shadow-sm flex items-center justify-between cursor-pointer hover:border-[#9E5A2B]/50 transition-all"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#7A6A5E]">
                  Công Thức Định Lượng
                </p>
                <p className="text-2xl font-extrabold text-[#166534] mt-1 font-headline">
                  {products.reduce(
                    (sum, p) => sum + (p.recipes?.length || 0),
                    0
                  )}{" "}
                  dòng BOM
                </p>
                <p className="text-[11px] text-[#7A6A5E] mt-1">
                  Tự động trừ & hoàn kho theo Size/Topping
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">
                  science
                </span>
              </div>
            </div>
          </div>

          {/* ===================================================================
              TAB 1: PRODUCTS MANAGEMENT (QUẢN LÝ THỰC ĐƠN — XEM, ẨN/HIỆN, THÊM, SỬA, XÓA)
             =================================================================== */}
          {activeTab === "products" && (
            <div className="space-y-5">
              {/* Global Size Pricing Bar (Đồng bộ trực tiếp với Modal Chọn Size của Khách Hàng) */}
              <form
                onSubmit={handleSaveGlobalSizePricing}
                className="bg-gradient-to-r from-[#2C1810] to-[#43281C] text-white p-4 rounded-2xl shadow-md flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#9E5A2B] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#FEB785]">
                      straighten
                    </span>
                  </div>
                  <div>
                    <h2 className="font-headline text-sm font-extrabold text-white flex items-center gap-2">
                      Cấu Hình Giá Phụ Thu Size Mặc Định Toàn Cửa Hàng (S / M / L)
                      <span className="px-2 py-0.5 rounded-full bg-[#166534] text-[10px] font-bold">
                        Đồng bộ Menu Khách
                      </span>
                    </h2>
                    <p className="text-[11px] text-[#E6DDD5]">
                      Áp dụng cho tất cả đồ uống (trừ khi món có cài đặt giá phụ thu Size M/L riêng bên dưới).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-xs font-bold text-[#FEB785]">Size S (+đ):</span>
                    <input
                      type="number"
                      step="1000"
                      value={sizePricing.sizeS}
                      onChange={(e) =>
                        setSizePricing((prev) => ({ ...prev, sizeS: e.target.value }))
                      }
                      className="w-20 bg-white text-[#2C1E18] px-2 py-1 rounded-lg text-xs font-extrabold text-right"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-xs font-bold text-[#FEB785]">Size M (+đ):</span>
                    <input
                      type="number"
                      step="1000"
                      value={sizePricing.sizeM}
                      onChange={(e) =>
                        setSizePricing((prev) => ({ ...prev, sizeM: e.target.value }))
                      }
                      className="w-24 bg-white text-[#2C1E18] px-2 py-1 rounded-lg text-xs font-extrabold text-right"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-xs font-bold text-[#FEB785]">Size L (+đ):</span>
                    <input
                      type="number"
                      step="1000"
                      value={sizePricing.sizeL}
                      onChange={(e) =>
                        setSizePricing((prev) => ({ ...prev, sizeL: e.target.value }))
                      }
                      className="w-24 bg-white text-[#2C1E18] px-2 py-1 rounded-lg text-xs font-extrabold text-right"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSizePricing}
                    className="px-4 py-2 rounded-xl bg-[#FEB785] hover:bg-[#fca868] text-[#2C1810] text-xs font-extrabold transition-colors cursor-pointer shrink-0"
                  >
                    {isSavingSizePricing ? "Đang lưu..." : "Lưu Giá Size"}
                  </button>
                </div>
              </form>

              {/* Filter & Action Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-[#E6DDD5] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6A5E] text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Tìm theo tên món hoặc mô tả hương vị..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm focus:outline-none focus:border-[#9E5A2B]"
                    />
                  </div>

                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                  >
                    <option value="all">Tất cả danh mục</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: `Tất cả (${products.length})` },
                    {
                      id: "active",
                      label: `Đang hiện (${activeProductsCount})`,
                    },
                    {
                      id: "hidden",
                      label: `Đang ẩn (${hiddenProductsCount})`,
                    },
                    {
                      id: "soldout",
                      label: `Hết hàng (${outOfStockProductsCount})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() =>
                        setProductVisibilityFilter(
                          tab.id as "all" | "active" | "hidden" | "soldout"
                        )
                      }
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        productVisibilityFilter === tab.id
                          ? "bg-[#2C1810] text-white shadow-sm"
                          : "bg-[#F3ECE4] text-[#7A6A5E] hover:text-[#2C1E18]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Cards Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-72 rounded-2xl bg-white border border-[#E6DDD5] animate-pulse p-5"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E6DDD5] p-12 text-center space-y-3">
                  <span className="material-symbols-outlined text-4xl text-[#7A6A5E]">
                    Menu_book
                  </span>
                  <p className="text-base font-bold text-[#2C1E18]">
                    Không tìm thấy món nào khớp bộ lọc
                  </p>
                  <button
                    onClick={() => {
                      setProductSearch("");
                      setProductCategoryFilter("all");
                      setProductVisibilityFilter("all");
                    }}
                    className="px-4 py-2 rounded-xl bg-[#9E5A2B] text-white text-xs font-bold"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredProducts.map((prod) => {
                    const isVisible = prod.isActive !== false;
                    const isManualSoldOut = Boolean(prod.isSoldOutManual);
                    const isIngredientEmpty = Boolean(
                      prod.ingredientOutOfStock
                    );
                    const catLabel =
                      CATEGORY_OPTIONS.find((c) => c.id === prod.category)
                        ?.label || "Cà Phê Việt";

                    return (
                      <div
                        key={prod.id}
                        className={`bg-white rounded-2xl border transition-all shadow-sm flex flex-col justify-between overflow-hidden ${
                          !isVisible
                            ? "border-dashed border-[#7A6A5E]/50 opacity-80 bg-[#FAF6F0]/60"
                            : prod.isOutOfStock
                            ? "border-red-200"
                            : "border-[#E6DDD5] hover:border-[#9E5A2B]/50"
                        }`}
                      >
                        <div>
                          {/* Top Media + Info Header */}
                          <div className="p-4 flex gap-4">
                            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#F3ECE4] shrink-0 border border-[#E6DDD5]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  prod.imageUrl ||
                                  "/images/products/ca-phe-sua.png"
                                }
                                alt={prod.name}
                                className={`w-full h-full object-cover ${
                                  !isVisible || prod.isOutOfStock
                                    ? "grayscale"
                                    : ""
                                }`}
                              />
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-bold">
                                #{prod.id}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F3ECE4] text-[#9E5A2B] truncate">
                                  {catLabel}
                                </span>
                                {prod.tag && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] shrink-0">
                                    {prod.tag}
                                  </span>
                                )}
                              </div>

                              <h3 className="font-headline font-extrabold text-base text-[#2C1E18] mt-1.5 truncate">
                                {prod.name}
                              </h3>

                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-lg font-extrabold text-[#9E5A2B]">
                                  {prod.basePrice.toLocaleString("vi-VN")}đ
                                </span>
                                <span className="text-[11px] font-semibold text-[#7A6A5E]">
                                  • Đã bán: {prod.orderItemsCount ?? 0} ly
                                </span>
                              </div>

                              {/* Stock Availability Pill */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {!isVisible ? (
                                  <span className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[10px] font-bold">
                                    🙈 Đang ẩn khỏi Menu khách
                                  </span>
                                ) : isManualSoldOut ? (
                                  <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#991B1B] text-[10px] font-bold">
                                    🚫 Báo hết hàng thủ công
                                  </span>
                                ) : isIngredientEmpty ? (
                                  <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#991B1B] text-[10px] font-bold">
                                    ⚠️ Hết nguyên liệu pha
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#166534] text-[10px] font-bold">
                                    ✅ Pha được ~{prod.availableServings ?? 99}{" "}
                                    ly
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* COGS (Giá Vốn) & Gross Profit Margin Badge */}
                          <div className="mx-4 mb-2.5 px-3 py-2 rounded-xl bg-[#F3ECE4]/70 border border-[#E6DDD5] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div>
                              <span className="text-[#7A6A5E] font-medium">Giá vốn (COGS): </span>
                              <strong className="text-[#2C1E18]">
                                {(prod.cogsSizeS ?? 0).toLocaleString("vi-VN")}đ
                              </strong>
                              {prod.cogsSizeM ? (
                                <span className="text-[#7A6A5E] ml-1">
                                  (M: {prod.cogsSizeM.toLocaleString("vi-VN")}đ • L: {(prod.cogsSizeL ?? 0).toLocaleString("vi-VN")}đ)
                                </span>
                              ) : null}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                (prod.marginPercentS ?? 70) >= 60
                                  ? "bg-[#DCFCE7] text-[#166534]"
                                  : (prod.marginPercentS ?? 70) >= 40
                                  ? "bg-[#FEF3C7] text-[#B45309]"
                                  : "bg-[#FEE2E2] text-[#991B1B]"
                              }`}
                            >
                              Lãi gộp: +{(prod.grossProfitS ?? prod.basePrice).toLocaleString("vi-VN")}đ ({prod.marginPercentS ?? 100}%)
                            </span>
                          </div>

                          {/* Quick Inline Editor: Sửa nhanh Giá Bán, Phụ thu Size M/L & Mô Tả */}
                          {(() => {
                            const draft = inlineProductDrafts[prod.id] ?? {
                              basePrice: String(prod.basePrice),
                              description: prod.description || "",
                              sizeUpchargeM:
                                prod.sizeUpchargeM !== null && prod.sizeUpchargeM !== undefined
                                  ? String(prod.sizeUpchargeM)
                                  : "",
                              sizeUpchargeL:
                                prod.sizeUpchargeL !== null && prod.sizeUpchargeL !== undefined
                                  ? String(prod.sizeUpchargeL)
                                  : "",
                            };
                            const hasInlineChanges = Boolean(inlineProductDrafts[prod.id]);
                            return (
                              <div className="mx-4 mb-3 p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#7A6A5E] mb-0.5">
                                      Giá gốc Size S (đ)
                                    </label>
                                    <input
                                      type="number"
                                      step="1000"
                                      value={draft.basePrice}
                                      onChange={(e) =>
                                        setInlineProductDrafts((prev) => ({
                                          ...prev,
                                          [prod.id]: { ...draft, basePrice: e.target.value },
                                        }))
                                      }
                                      className="w-full px-2 py-1 rounded-lg bg-white border border-[#E6DDD5] text-xs font-extrabold text-[#9E5A2B]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#7A6A5E] mb-0.5">
                                      +Size M riêng
                                    </label>
                                    <input
                                      type="number"
                                      step="1000"
                                      placeholder={`Mặc định +${sizePricing.sizeM}`}
                                      value={draft.sizeUpchargeM}
                                      onChange={(e) =>
                                        setInlineProductDrafts((prev) => ({
                                          ...prev,
                                          [prod.id]: { ...draft, sizeUpchargeM: e.target.value },
                                        }))
                                      }
                                      className="w-full px-2 py-1 rounded-lg bg-white border border-[#E6DDD5] text-xs font-bold text-[#2C1E18]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#7A6A5E] mb-0.5">
                                      +Size L riêng
                                    </label>
                                    <input
                                      type="number"
                                      step="1000"
                                      placeholder={`Mặc định +${sizePricing.sizeL}`}
                                      value={draft.sizeUpchargeL}
                                      onChange={(e) =>
                                        setInlineProductDrafts((prev) => ({
                                          ...prev,
                                          [prod.id]: { ...draft, sizeUpchargeL: e.target.value },
                                        }))
                                      }
                                      className="w-full px-2 py-1 rounded-lg bg-white border border-[#E6DDD5] text-xs font-bold text-[#2C1E18]"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-[#7A6A5E] mb-0.5">
                                    Mô tả sản phẩm (Hiển thị trên Menu & Modal)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={draft.description}
                                    onChange={(e) =>
                                      setInlineProductDrafts((prev) => ({
                                        ...prev,
                                        [prod.id]: { ...draft, description: e.target.value },
                                      }))
                                    }
                                    placeholder="Nhập mô tả hương vị sản phẩm..."
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                                  />
                                </div>

                                {hasInlineChanges && (
                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setInlineProductDrafts((prev) => {
                                          const next = { ...prev };
                                          delete next[prod.id];
                                          return next;
                                        })
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E6DDD5] text-[11px] font-bold text-[#7A6A5E] cursor-pointer"
                                    >
                                      Hoàn tác
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveInlineProduct(prod)}
                                      className="px-3 py-1 rounded-lg bg-[#166534] hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer shadow-xs"
                                    >
                                      💾 Lưu nhanh giá & mô tả
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Quick Toggle Switches (Ẩn/Hiện & Báo Hết Hàng Thủ Công) */}
                          <div className="mx-4 mb-3 p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleProductVisibility(prod, "isActive")
                              }
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-[#E6DDD5] hover:border-[#9E5A2B] transition-colors cursor-pointer"
                            >
                              <span className="text-[11px] font-bold text-[#2C1E18]">
                                Hiện trên Menu
                              </span>
                              <span
                                className={`w-8 h-4 rounded-full relative transition-colors ${
                                  isVisible ? "bg-[#166534]" : "bg-gray-300"
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                    isVisible ? "right-0.5" : "left-0.5"
                                  }`}
                                />
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleProductVisibility(
                                  prod,
                                  "isSoldOutManual"
                                )
                              }
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-[#E6DDD5] hover:border-[#9E5A2B] transition-colors cursor-pointer"
                            >
                              <span className="text-[11px] font-bold text-[#2C1E18]">
                                Báo hết hàng
                              </span>
                              <span
                                className={`w-8 h-4 rounded-full relative transition-colors ${
                                  isManualSoldOut
                                    ? "bg-[#DC2626]"
                                    : "bg-gray-300"
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                    isManualSoldOut ? "right-0.5" : "left-0.5"
                                  }`}
                                />
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Bottom Action Buttons (Sửa, Cấu hình BOM, Xóa) */}
                        <div className="px-4 py-3 bg-[#FAF6F0]/70 border-t border-[#E6DDD5] flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(prod)}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#2C1810] hover:bg-[#3F2E26] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              edit_square
                            </span>
                            Chỉnh sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFocusedProductIdForBom(prod.id);
                              setActiveTab("recipes");
                            }}
                            className="py-2 px-3 rounded-xl bg-[#F3ECE4] hover:bg-[#E6DDD5] text-[#2C1E18] text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Cấu hình công thức nguyên liệu (BOM)"
                          >
                            <span className="material-symbols-outlined text-[15px] text-[#9E5A2B]">
                              science
                            </span>
                            BOM ({prod.recipes?.length || 0})
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: "product",
                                id: prod.id,
                                name: prod.name,
                                recipesCount: prod.recipes?.length || 0,
                                ordersCount: prod.orderItemsCount || 0,
                              })
                            }
                            className="py-2 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#991B1B] text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================
              TAB 2: INVENTORY BENTO GRID (FULL CRUD NGUYÊN VẬT LIỆU)
             =================================================================== */}
          {activeTab === "inventory" && (
            <div className="space-y-5">
              {/* Filter & Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-[#E6DDD5] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6A5E] text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm nguyên vật liệu theo tên hoặc mã..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm focus:outline-none focus:border-[#9E5A2B]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: "Tất cả (100%)" },
                    {
                      id: "low",
                      label: `Cần nhập gấp (${lowStockCount})`,
                    },
                    { id: "beverage", label: "Pha chế (g / ml)" },
                    { id: "pastry", label: "Bánh ngọt (Chiếc / Phần)" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        setStockFilter(
                          f.id as "all" | "low" | "pastry" | "beverage"
                        )
                      }
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        stockFilter === f.id
                          ? "bg-[#2C1810] text-white shadow-sm"
                          : "bg-[#F3ECE4] text-[#7A6A5E] hover:text-[#2C1E18]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bento Grid of Ingredients */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-44 rounded-2xl bg-white border border-[#E6DDD5] animate-pulse p-5"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredIngredients.map((ing) => {
                    const isOut = ing.status === "OUT_OF_STOCK";
                    const isLow = ing.status === "LOW_STOCK";

                    return (
                      <div
                        key={ing.id}
                        className={`bg-white rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between ${
                          isOut
                            ? "border-red-300 bg-red-50/30"
                            : isLow
                            ? "border-amber-300 bg-amber-50/20"
                            : "border-[#E6DDD5] hover:border-[#9E5A2B]/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F3ECE4] text-[#7A6A5E]">
                                {ing.code}
                              </span>
                              <h3 className="font-headline font-bold text-base text-[#2C1E18] mt-1.5">
                                {ing.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                                  isOut
                                    ? "bg-[#FEE2E2] text-[#991B1B]"
                                    : isLow
                                    ? "bg-[#FEF3C7] text-[#B45309]"
                                    : "bg-[#DCFCE7] text-[#166534]"
                                }`}
                              >
                                {isOut
                                  ? "Cạn kho"
                                  : isLow
                                  ? "Sắp hết"
                                  : "Ổn định"}
                              </span>
                              <button
                                onClick={() => openEditIngredientModal(ing)}
                                className="w-7 h-7 rounded-lg bg-[#FAF6F0] hover:bg-[#E6DDD5] text-[#2C1E18] flex items-center justify-center transition-colors cursor-pointer"
                                title="Sửa tên, mã, đơn vị hoặc ngưỡng cảnh báo"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  edit
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "ingredient",
                                    id: ing.id,
                                    name: ing.name,
                                    recipesCount: ing.recipesCount ?? 0,
                                  })
                                }
                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-[#991B1B] flex items-center justify-center transition-colors cursor-pointer"
                                title="Xóa nguyên vật liệu"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Stock Meter */}
                          <div className="mt-4">
                            <div className="flex items-baseline justify-between">
                              <div>
                                <span className="text-2xl font-extrabold text-[#2C1E18] font-headline">
                                  {ing.stock.toLocaleString("vi-VN")}
                                </span>
                                <span className="text-xs font-bold text-[#7A6A5E] ml-1">
                                  {ing.unit}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#7A6A5E]">
                                Cảnh báo dưới:{" "}
                                <strong>
                                  {ing.minThreshold.toLocaleString("vi-VN")}{" "}
                                  {ing.unit}
                                </strong>
                              </span>
                            </div>

                            <div className="w-full h-2.5 bg-[#F3ECE4] rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOut
                                    ? "bg-[#DC2626]"
                                    : isLow
                                    ? "bg-[#D97706]"
                                    : "bg-[#166534]"
                                }`}
                                style={{
                                  width: `${Math.max(4, ing.percentage)}%`,
                                }}
                              />
                            </div>

                            {/* Giá Nhập Nguyên Liệu (Quick Inline Edit) */}
                            {(() => {
                              const isBulk = ing.unit === "g" || ing.unit === "ml";
                              const defaultDisplayCost = isBulk
                                ? Math.round(Number(ing.costPerUnit ?? 0) * 1000)
                                : Math.round(Number(ing.costPerUnit ?? 0));
                              const draftCost = inlineIngCostDrafts[ing.id];
                              const isCostChanged =
                                draftCost !== undefined &&
                                Number(draftCost) !== defaultDisplayCost;
                              const unitLabel = isBulk
                                ? ing.unit === "g"
                                  ? "1 Kg (1000g)"
                                  : "1 Lít (1000ml)"
                                : `1 ${ing.unit}`;

                              return (
                                <div className="mt-3 p-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] flex items-center justify-between gap-2">
                                  <div className="text-[11px]">
                                    <span className="text-[#7A6A5E] font-semibold">
                                      Giá nhập / {unitLabel}:
                                    </span>
                                    <p className="text-[10px] text-[#7A6A5E]">
                                      Giá trị tồn:{" "}
                                      <strong className="text-[#2C1E18]">
                                        {Math.round(
                                          ing.stock * Number(ing.costPerUnit ?? 0)
                                        ).toLocaleString("vi-VN")}
                                        đ
                                      </strong>
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={
                                        draftCost !== undefined
                                          ? draftCost
                                          : String(defaultDisplayCost)
                                      }
                                      onChange={(e) =>
                                        setInlineIngCostDrafts((prev) => ({
                                          ...prev,
                                          [ing.id]: e.target.value,
                                        }))
                                      }
                                      className="w-24 px-2 py-1 rounded-lg bg-white border border-[#E6DDD5] text-xs font-extrabold text-[#9E5A2B] text-right"
                                    />
                                    <span className="text-[10px] font-bold text-[#7A6A5E]">
                                      đ
                                    </span>
                                    {isCostChanged && (
                                      <button
                                        type="button"
                                        onClick={() => handleSaveInlineIngCost(ing)}
                                        className="px-2 py-1 rounded-lg bg-[#166534] text-white text-[10px] font-bold cursor-pointer"
                                      >
                                        Lưu
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-[#E6DDD5] flex items-center justify-between gap-2">
                          <span className="text-[10px] text-[#7A6A5E] font-mono">
                            v{ing.version} • {ing.recipesCount ?? 0} công thức
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openRestockModal(ing, "set")}
                              className="px-3 py-1.5 rounded-lg bg-[#F3ECE4] hover:bg-[#E6DDD5] text-[#2C1E18] text-xs font-bold transition-colors cursor-pointer"
                            >
                              Kiểm kê
                            </button>
                            <button
                              onClick={() => openRestockModal(ing, "restock")}
                              className="px-3.5 py-1.5 rounded-lg bg-[#9E5A2B] hover:bg-[#7D4620] text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                add
                              </span>
                              Nhập hàng
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* NHẬT KÝ NHẬP / XUẤT KHO & LỊCH SỬ GIÁ NHẬP (INVENTORY AUDIT LOG) */}
              <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#E6DDD5] flex items-center justify-between">
                  <div>
                    <h3 className="font-headline text-base font-extrabold text-[#2C1E18]">
                      📋 Nhật Ký Nhập Hàng & Kiểm Kê Kho (Inventory Audit Logs)
                    </h3>
                    <p className="text-xs text-[#7A6A5E]">
                      Lưu vết tự động mọi phiếu nhập kho, điều chỉnh tồn kho, đơn giá nhập và tổng chi phí lô hàng
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#F3ECE4] text-xs font-bold text-[#9E5A2B]">
                    {inventoryLogs.length} bản ghi gần nhất
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FAF6F0] text-[11px] font-bold uppercase tracking-wider text-[#7A6A5E] border-b border-[#E6DDD5]">
                        <th className="py-3 px-4">Thời Gian</th>
                        <th className="py-3 px-4">Nguyên Vật Liệu</th>
                        <th className="py-3 px-4">Loại Phiếu</th>
                        <th className="py-3 px-4">Biến Động</th>
                        <th className="py-3 px-4">Tồn Trước → Sau</th>
                        <th className="py-3 px-4">Giá Vốn / ĐV</th>
                        <th className="py-3 px-4">Thành Tiền Lô</th>
                        <th className="py-3 px-4">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6DDD5] text-xs">
                      {inventoryLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-[#7A6A5E]">
                            Chưa có nhật ký nhập/xuất kho nào. Hãy thử bấm &ldquo;Nhập hàng&rdquo; hoặc &ldquo;Kiểm kê&rdquo; trên thẻ nguyên liệu!
                          </td>
                        </tr>
                      ) : (
                        inventoryLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#FAF6F0]/60">
                            <td className="py-3 px-4 text-[#7A6A5E] whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString("vi-VN")}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#2C1E18]">
                              {log.ingredient?.name || `#${log.ingredientId}`}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.action === "RESTOCK"
                                    ? "bg-[#DCFCE7] text-[#166534]"
                                    : "bg-[#FEF3C7] text-[#B45309]"
                                }`}
                              >
                                {log.action === "RESTOCK" ? "NHẬP KHO (+)" : "KIỂM KÊ (=)"}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-4 font-extrabold ${
                                log.changeAmount >= 0 ? "text-[#166534]" : "text-[#DC2626]"
                              }`}
                            >
                              {log.changeAmount >= 0 ? "+" : ""}
                              {log.changeAmount.toLocaleString("vi-VN")}{" "}
                              {log.ingredient?.unit || ""}
                            </td>
                            <td className="py-3 px-4 text-[#7A6A5E]">
                              {log.previousStock.toLocaleString("vi-VN")} →{" "}
                              <strong className="text-[#2C1E18]">
                                {log.newStock.toLocaleString("vi-VN")} {log.ingredient?.unit || ""}
                              </strong>
                            </td>
                            <td className="py-3 px-4 font-semibold text-[#9E5A2B]">
                              {Number(log.unitCost || 0).toLocaleString("vi-VN")}đ/{log.ingredient?.unit || "đv"}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#2C1E18]">
                              {log.totalCost > 0
                                ? `${Math.round(log.totalCost).toLocaleString("vi-VN")}đ`
                                : "—"}
                            </td>
                            <td className="py-3 px-4 text-[#7A6A5E]">
                              {log.note || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 3: RECIPES BOM MATRIX (CHỈNH SỬA TRỰC TIẾP ĐỊNH LƯỢNG BOM)
             =================================================================== */}
          {activeTab === "recipes" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#E6DDD5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-headline text-base font-extrabold text-[#2C1E18]">
                      Bảng Định Lượng Công Thức Đồ Uống & Bánh Ngọt (BOM Editor)
                    </h2>
                    <p className="text-xs text-[#7A6A5E] mt-0.5">
                      Điều chỉnh trực tiếp lượng nguyên vật liệu tiêu hao (g /
                      ml / chiếc) cho từng Size S, M, L. Hệ thống tự động trừ
                      kho khi khách đặt và hoàn kho khi hủy đơn.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={String(focusedProductIdForBom)}
                      onChange={(e) =>
                        setFocusedProductIdForBom(
                          e.target.value === "all"
                            ? "all"
                            : Number(e.target.value)
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold text-[#2C1E18]"
                    >
                      <option value="all">
                        Hiển thị tất cả ({products.length} món)
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} - {p.name}
                        </option>
                      ))}
                    </select>
                    {focusedProductIdForBom !== "all" && (
                      <button
                        onClick={() => setFocusedProductIdForBom("all")}
                        className="px-3 py-2 rounded-xl bg-[#F3ECE4] text-xs font-bold text-[#2C1E18] cursor-pointer"
                      >
                        Xem tất cả
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-[#E6DDD5]">
                  {filteredBomProducts.map((prod) => {
                    const sizes = ["S", "M", "L", "ALL"].filter((sz) =>
                      prod.recipes.some((r) => r.size === sz)
                    );
                    return (
                      <div
                        key={prod.id}
                        className="p-5 hover:bg-[#FAF6F0]/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-[#2C1810] text-white text-xs font-bold flex items-center justify-center">
                              #{prod.id}
                            </span>
                            <div>
                              <h3 className="font-headline font-bold text-base text-[#2C1E18]">
                                {prod.name}
                              </h3>
                              <p className="text-xs text-[#7A6A5E]">
                                Giá chuẩn:{" "}
                                {prod.basePrice.toLocaleString("vi-VN")}đ
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                prod.isOutOfStock
                                  ? "bg-[#FEE2E2] text-[#991B1B]"
                                  : "bg-[#DCFCE7] text-[#166534]"
                              }`}
                            >
                              {prod.isOutOfStock
                                ? "🚫 Tạm hết hàng"
                                : `Có thể phục vụ: ~${prod.availableServings ?? 99} phần`}
                            </span>
                            <button
                              onClick={() => openAddBomModal(prod)}
                              className="px-3 py-1.5 rounded-xl bg-[#9E5A2B] hover:bg-[#7D4620] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                add
                              </span>
                              Thêm nguyên liệu
                            </button>
                          </div>
                        </div>

                        {sizes.length === 0 ? (
                          <div className="p-4 rounded-xl bg-[#FAF6F0] border border-dashed border-[#E6DDD5] text-xs text-[#7A6A5E] flex items-center justify-between">
                            <span>
                              Chưa có định lượng nguyên liệu nào cho món này.
                            </span>
                            <button
                              onClick={() => openAddBomModal(prod)}
                              className="font-bold text-[#9E5A2B] underline cursor-pointer"
                            >
                              + Thiết lập ngay
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {sizes.map((sz) => {
                              const entries = prod.recipes.filter(
                                (r) => r.size === sz
                              );
                              return (
                                <div
                                  key={sz}
                                  className="bg-[#FAF6F0] rounded-xl p-3.5 border border-[#E6DDD5]"
                                >
                                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#9E5A2B] mb-2.5 flex items-center justify-between">
                                    <span>
                                      {sz === "ALL"
                                        ? "Định lượng chuẩn (1 phần)"
                                        : `Size ${sz}`}
                                    </span>
                                    <span className="text-[10px] text-[#7A6A5E]">
                                      {entries.length} thành phần
                                    </span>
                                  </div>
                                  <ul className="space-y-2">
                                    {entries.map((e) => {
                                      const currentDraft =
                                        editingRecipeAmounts[e.id];
                                      const isEdited =
                                        currentDraft !== undefined &&
                                        Number(currentDraft) !== e.amount;
                                      return (
                                        <li
                                          key={e.id}
                                          className="text-xs flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-[#E6DDD5]"
                                        >
                                          <span className="text-[#2C1E18] font-medium truncate flex-1">
                                            {e.ingredient?.name}
                                          </span>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <input
                                              type="number"
                                              min="0.1"
                                              step="any"
                                              value={
                                                currentDraft !== undefined
                                                  ? currentDraft
                                                  : String(e.amount)
                                              }
                                              onChange={(ev) =>
                                                setEditingRecipeAmounts(
                                                  (prev) => ({
                                                    ...prev,
                                                    [e.id]: ev.target.value,
                                                  })
                                                )
                                              }
                                              className="w-16 px-2 py-1 rounded bg-[#FAF6F0] border border-[#E6DDD5] text-right font-bold text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                                            />
                                            <span className="text-[11px] font-bold text-[#7A6A5E] w-7">
                                              {e.ingredient?.unit}
                                            </span>
                                            {isEdited && (
                                              <button
                                                onClick={() =>
                                                  handleUpdateInlineRecipeAmount(
                                                    e
                                                  )
                                                }
                                                className="px-2 py-1 rounded bg-[#166534] text-white text-[10px] font-bold cursor-pointer"
                                                title="Lưu định lượng mới"
                                              >
                                                Lưu
                                              </button>
                                            )}
                                            <button
                                              onClick={() =>
                                                handleDeleteRecipeRow(
                                                  e.id,
                                                  e.ingredient?.name || "",
                                                  sz
                                                )
                                              }
                                              className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                                              title="Xóa thành phần này"
                                            >
                                              <span className="material-symbols-outlined text-[15px]">
                                                close
                                              </span>
                                            </button>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Topping Full CRUD & Pricing Table */}
              <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-headline text-base font-extrabold text-[#2C1E18]">
                      🍮 Quản Lý Giá Bán Topping, Mô Tả & Định Lượng Trừ Kho (Topping CRUD)
                    </h3>
                    <p className="text-xs text-[#7A6A5E]">
                      Chỉnh sửa trực tiếp giá bán Topping (+VNĐ), tên hiển thị, mô tả phụ, ẩn/hiện trên Menu khách hàng và định lượng trừ kho.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTopIngId(ingredients[0]?.id ?? 0);
                      setIsToppingModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2C1810] hover:bg-[#3F2E26] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add_circle
                    </span>
                    Thêm Topping mới
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toppingRecipes.map((tr) => {
                    const draftAmt = editingToppingAmounts[tr.id];
                    const draftPrice = editingToppingPrices[tr.id];
                    const draftName = editingToppingNames[tr.id];
                    const draftSubtext = editingToppingSubtexts[tr.id];
                    const isChanged =
                      draftAmt !== undefined ||
                      draftPrice !== undefined ||
                      draftName !== undefined ||
                      draftSubtext !== undefined;
                    const isActive = tr.isActive !== false;
                    const toppingCogs = Math.round(
                      tr.amount * Number(tr.ingredient?.costPerUnit ?? 0)
                    );

                    return (
                      <div
                        key={tr.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isActive
                            ? "bg-[#FAF6F0] border-[#E6DDD5]"
                            : "bg-gray-100/80 border-dashed border-gray-300 opacity-75"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#2C1810] text-white text-[10px] font-mono font-bold">
                                #{tr.toppingCode || tr.toppingId}
                              </span>
                              <span className="text-[11px] text-[#7A6A5E]">
                                Nguyên liệu gốc: <strong>{tr.ingredient?.name}</strong>
                              </span>
                            </div>
                            <input
                              type="text"
                              value={
                                draftName !== undefined ? draftName : tr.toppingName
                              }
                              onChange={(e) =>
                                setEditingToppingNames((prev) => ({
                                  ...prev,
                                  [tr.id]: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#E6DDD5] text-xs font-extrabold text-[#2C1E18]"
                              placeholder="Tên Topping"
                            />
                            <input
                              type="text"
                              value={
                                draftSubtext !== undefined
                                  ? draftSubtext
                                  : tr.subtext || ""
                              }
                              onChange={(e) =>
                                setEditingToppingSubtexts((prev) => ({
                                  ...prev,
                                  [tr.id]: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#E6DDD5] text-[11px] text-[#7A6A5E]"
                              placeholder="Mô tả phụ (VD: Giòn dai sần sật...)"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateToppingItem(tr, !isActive)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                isActive
                                  ? "bg-[#DCFCE7] text-[#166534]"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {isActive ? "Đang hiện" : "Đang ẩn"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTopping(tr)}
                              className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#991B1B] cursor-pointer"
                              title="Xóa Topping"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                delete
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E6DDD5]">
                          <div>
                            <label className="block text-[10px] font-bold text-[#7A6A5E] mb-0.5">
                              Giá bán cộng thêm (+VNĐ)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={
                                draftPrice !== undefined
                                  ? draftPrice
                                  : String(tr.price ?? 8000)
                              }
                              onChange={(ev) =>
                                setEditingToppingPrices((prev) => ({
                                  ...prev,
                                  [tr.id]: ev.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#E6DDD5] text-xs font-extrabold text-[#9E5A2B]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#7A6A5E] mb-0.5">
                              Định lượng trừ kho ({tr.ingredient?.unit})
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={
                                draftAmt !== undefined ? draftAmt : String(tr.amount)
                              }
                              onChange={(ev) =>
                                setEditingToppingAmounts((prev) => ({
                                  ...prev,
                                  [tr.id]: ev.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#E6DDD5] text-xs font-extrabold text-[#2C1E18]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#7A6A5E]">
                          <span>
                            Giá vốn 1 phần Topping: <strong>{toppingCogs.toLocaleString("vi-VN")}đ</strong>
                          </span>
                          {isChanged && (
                            <button
                              type="button"
                              onClick={() => handleUpdateToppingItem(tr)}
                              className="px-3 py-1 rounded-lg bg-[#166534] text-white text-xs font-bold cursor-pointer shadow-xs"
                            >
                              💾 Lưu Topping
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 4: VOUCHERS / DISCOUNT CODES MANAGEMENT
             =================================================================== */}
          {activeTab === "vouchers" && (
            <div className="space-y-6">
              {/* Create Voucher Form */}
              <form
                onSubmit={handleCreateVoucher}
                className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm p-5 space-y-4"
              >
                <div>
                  <h2 className="font-headline text-base font-extrabold text-[#2C1E18]">
                    🎟️ Tạo Mã Giảm Giá / Voucher Khuyến Mãi Mới
                  </h2>
                  <p className="text-xs text-[#7A6A5E]">
                    Mã giảm giá sau khi bật sẽ hiển thị ngay lập tức ở trang Giỏ hàng của khách và được kiểm tra tự động khi thanh toán.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                      Mã Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={newVoucherCode}
                      onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                      placeholder="VD: HE2026"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-mono font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                      Mức giảm (%) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={newVoucherPercent}
                      onChange={(e) => setNewVoucherPercent(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-extrabold text-[#9E5A2B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                      Đơn tối thiểu (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={newVoucherMinOrder}
                      onChange={(e) => setNewVoucherMinOrder(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                      Giảm tối đa (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={newVoucherMaxDiscount}
                      onChange={(e) => setNewVoucherMaxDiscount(e.target.value)}
                      placeholder="Trống = K.giới hạn"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold text-[#9E5A2B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                      Mô tả chương trình
                    </label>
                    <input
                      type="text"
                      value={newVoucherDesc}
                      onChange={(e) => setNewVoucherDesc(e.target.value)}
                      placeholder="VD: Ưu đãi trà chiều -20%"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingVoucher}
                    className="px-4 py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3F2E26] text-white text-xs font-bold cursor-pointer"
                  >
                    {isSavingVoucher ? "Đang lưu..." : "+ Tạo Mã Giảm Giá"}
                  </button>
                </div>
              </form>

              {/* Vouchers List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vouchers.map((v) => {
                  const draft = editingVoucherDrafts[v.id] ?? {
                    discountPercent: String(v.discountPercent),
                    minOrderAmount: String(v.minOrderAmount || 0),
                    maxDiscountAmount:
                      v.maxDiscountAmount !== null && v.maxDiscountAmount !== undefined
                        ? String(v.maxDiscountAmount)
                        : "",
                    description: v.description || "",
                  };
                  const hasChanged = Boolean(editingVoucherDrafts[v.id]);
                  return (
                    <div
                      key={v.id}
                      className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between gap-3 ${
                        v.isActive
                          ? "border-[#E6DDD5]"
                          : "border-dashed border-gray-300 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#9E5A2B] font-mono text-sm font-extrabold">
                              {v.code}
                            </span>
                            {v.maxDiscountAmount && Number(v.maxDiscountAmount) > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#FAF0E6] text-[#845326] text-[10px] font-bold border border-[#845326]/20">
                                Trần: {Number(v.maxDiscountAmount).toLocaleString("vi-VN")}đ
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold">
                                Không giới hạn trần
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7A6A5E] mt-1">
                            Đã sử dụng: <strong>{v.usageCount ?? 0} lượt</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateVoucher(v, !v.isActive)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              v.isActive
                                ? "bg-[#DCFCE7] text-[#166534]"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {v.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVoucher(v)}
                            className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#991B1B] cursor-pointer"
                            title="Xóa mã giảm giá"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-[#7A6A5E]">
                              Giảm (%)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={draft.discountPercent}
                              onChange={(e) =>
                                setEditingVoucherDrafts((prev) => ({
                                  ...prev,
                                  [v.id]: { ...draft, discountPercent: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-extrabold text-[#9E5A2B]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#7A6A5E]">
                              Đơn tối thiểu (đ)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="5000"
                              value={draft.minOrderAmount}
                              onChange={(e) =>
                                setEditingVoucherDrafts((prev) => ({
                                  ...prev,
                                  [v.id]: { ...draft, minOrderAmount: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#7A6A5E]">
                              Giảm tối đa (đ)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="5000"
                              placeholder="K.giới hạn"
                              value={draft.maxDiscountAmount}
                              onChange={(e) =>
                                setEditingVoucherDrafts((prev) => ({
                                  ...prev,
                                  [v.id]: { ...draft, maxDiscountAmount: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold text-[#9E5A2B]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#7A6A5E]">
                            Mô tả ưu đãi
                          </label>
                          <input
                            type="text"
                            value={draft.description}
                            onChange={(e) =>
                              setEditingVoucherDrafts((prev) => ({
                                ...prev,
                                [v.id]: { ...draft, description: e.target.value },
                              }))
                            }
                            className="w-full px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#E6DDD5] text-xs"
                          />
                        </div>
                      </div>

                      {hasChanged && (
                        <button
                          type="button"
                          onClick={() => handleUpdateVoucher(v)}
                          className="w-full py-1.5 rounded-xl bg-[#166534] text-white text-xs font-bold cursor-pointer"
                        >
                          💾 Lưu thay đổi Voucher
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 4: OVERVIEW & TAB 5: REVENUE / ORDERS MANAGEMENT
             =================================================================== */}
          {(activeTab === "overview" || activeTab === "revenue") && (
            <div className="space-y-6">
              {/* Biểu Đồ Thống Kê Doanh Thu 7 Ngày & Phân Bổ Nhóm Món Trực Quan */}
              <RevenueChartSection allOrders={allOrders} products={products} />
              {/* Top Best-Sellers & Low Stock Alert Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Products */}
                <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-headline text-base font-extrabold text-[#2C1E18]">
                        🏆 Bảng Xếp Hạng Món Bán Chạy Nhất (Best-Sellers)
                      </h2>
                      <p className="text-xs text-[#7A6A5E]">
                        Thống kê theo tổng số lượng ly đã bán từ các đơn hàng
                        thành công
                      </p>
                    </div>
                  </div>

                  {topSellingProducts.length === 0 ? (
                    <p className="text-xs text-[#7A6A5E] py-6 text-center">
                      Chưa có dữ liệu thống kê món bán chạy.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topSellingProducts.map((item, idx) => {
                        const maxQty =
                          topSellingProducts[0]?.totalQuantity || 1;
                        const pct = Math.max(
                          8,
                          Math.round((item.totalQuantity / maxQty) * 100)
                        );
                        return (
                          <div
                            key={item.productId}
                            className="p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5]"
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] ${
                                    idx === 0
                                      ? "bg-[#D97706]"
                                      : idx === 1
                                      ? "bg-[#9E5A2B]"
                                      : "bg-[#2C1810]"
                                  }`}
                                >
                                  #{idx + 1}
                                </span>
                                <span className="text-[#2C1E18]">
                                  {item.productName}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[#9E5A2B] font-extrabold">
                                  {item.totalQuantity} ly
                                </span>
                                <span className="text-[#7A6A5E] ml-2">
                                  ({item.totalRevenue.toLocaleString("vi-VN")}đ)
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-[#E6DDD5] rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full bg-[#9E5A2B] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Low Stock Quick Action Panel */}
                <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-headline text-base font-extrabold text-[#2C1E18]">
                        ⚠️ Cảnh Báo Nguyên Vật Liệu Cần Nhập Kho
                      </h2>
                      <p className="text-xs text-[#7A6A5E]">
                        Các mặt hàng chạm ngưỡng cảnh báo tối thiểu hoặc đã cạn
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("inventory")}
                      className="text-xs font-bold text-[#9E5A2B] hover:underline cursor-pointer"
                    >
                      Mở kho hàng →
                    </button>
                  </div>

                  {lowStockCount === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#DCFCE7]/50 border border-emerald-200 text-center space-y-1">
                      <span className="material-symbols-outlined text-3xl text-[#166534]">
                        verified
                      </span>
                      <p className="text-sm font-bold text-[#166534]">
                        Toàn bộ {totalIngredients} nguyên vật liệu đều ở mức an
                        toàn!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ingredients
                        .filter(
                          (i) =>
                            i.status === "LOW_STOCK" ||
                            i.status === "OUT_OF_STOCK"
                        )
                        .map((ing) => (
                          <div
                            key={ing.id}
                            className="p-3.5 rounded-xl bg-[#FEF2F2] border border-red-200 flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="text-sm font-bold text-[#991B1B]">
                                {ing.name}
                              </p>
                              <p className="text-xs text-[#7A6A5E]">
                                Hiện còn:{" "}
                                <strong>
                                  {ing.stock.toLocaleString("vi-VN")} {ing.unit}
                                </strong>{" "}
                                (Ngưỡng tối thiểu: {ing.minThreshold} {ing.unit}
                                )
                              </p>
                            </div>
                            <button
                              onClick={() => openRestockModal(ing, "restock")}
                              className="px-3.5 py-2 rounded-xl bg-[#991B1B] hover:bg-red-800 text-white text-xs font-bold shrink-0 cursor-pointer"
                            >
                              + Nhập kho ngay
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Orders Management Table */}
              <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#E6DDD5] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-headline text-base font-extrabold text-[#2C1E18]">
                      Quản Trị Đơn Hàng & Điều Phối Trạng Thái Thực Tế
                    </h2>
                    <p className="text-xs text-[#7A6A5E]">
                      Xem chi tiết từng món, chuyển trạng thái pha chế hoặc Hủy
                      đơn (tự động hoàn trả nguyên vật liệu vào kho)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Tìm mã #đơn hoặc tên khách..."
                      className="px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs focus:outline-none focus:border-[#9E5A2B]"
                    />
                    {[
                      { id: "ALL", label: "Tất cả" },
                      { id: "PAID", label: "Chờ pha (PAID)" },
                      { id: "PREPARING", label: "Đang pha" },
                      { id: "READY", label: "Chờ lấy" },
                      { id: "COMPLETED", label: "Hoàn tất" },
                      { id: "CANCELLED", label: "Đã hủy" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setOrderStatusFilter(st.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          orderStatusFilter === st.id
                            ? "bg-[#2C1810] text-white"
                            : "bg-[#F3ECE4] text-[#7A6A5E] hover:text-[#2C1E18]"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FAF6F0] text-[11px] font-bold uppercase tracking-wider text-[#7A6A5E] border-b border-[#E6DDD5]">
                        <th className="py-3.5 px-5">Mã Đơn</th>
                        <th className="py-3.5 px-5">Khách Hàng</th>
                        <th className="py-3.5 px-5">Các Món Đặt</th>
                        <th className="py-3.5 px-5">Trạng Thái</th>
                        <th className="py-3.5 px-5">Tổng Tiền</th>
                        <th className="py-3.5 px-5">Thời Gian</th>
                        <th className="py-3.5 px-5 text-right">
                          Thao Tác Quản Trị
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6DDD5] text-sm">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-[#7A6A5E]"
                          >
                            Không có đơn hàng nào khớp bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => (
                          <tr
                            key={ord.id}
                            className="hover:bg-[#FAF6F0]/60 transition-colors"
                          >
                            <td className="py-3.5 px-5 font-mono font-bold text-[#2C1E18]">
                              #{ord.id}
                            </td>
                            <td className="py-3.5 px-5">
                              <p className="font-semibold text-[#2C1E18] text-xs">
                                {ord.user?.fullName || "Khách vãng lai"}
                              </p>
                              <p className="text-[11px] text-[#7A6A5E]">
                                {ord.user?.email || "—"}
                              </p>
                            </td>
                            <td className="py-3.5 px-5 max-w-xs">
                              {ord.items && ord.items.length > 0 ? (
                                <p className="text-xs text-[#2C1E18] truncate">
                                  {ord.items
                                    .map(
                                      (it) =>
                                        `${it.quantity}x ${it.productName} (${it.size})`
                                    )
                                    .join(", ")}
                                </p>
                              ) : (
                                <span className="text-xs text-[#7A6A5E]">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  ord.status === "COMPLETED"
                                    ? "bg-[#DCFCE7] text-[#166534]"
                                    : ord.status === "CANCELLED" ||
                                      ord.status === "PAYMENT_FAILED"
                                    ? "bg-[#FEE2E2] text-[#991B1B]"
                                    : "bg-[#FEF3C7] text-[#B45309]"
                                }`}
                              >
                                {ord.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-bold text-[#9E5A2B]">
                              {ord.totalAmount.toLocaleString("vi-VN")}đ
                            </td>
                            <td className="py-3.5 px-5 text-xs text-[#7A6A5E]">
                              {new Date(ord.createdAt).toLocaleString("vi-VN")}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedOrderDetail(ord)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#F3ECE4] hover:bg-[#E6DDD5] text-[#2C1E18] text-xs font-bold cursor-pointer"
                                >
                                  Chi tiết
                                </button>

                                {ord.status === "PAID" && (
                                  <>
                                    <button
                                      disabled={updatingOrderId === ord.id}
                                      onClick={() =>
                                        handleAdminOrderStatusChange(
                                          ord.id,
                                          "PREPARING"
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-[#9E5A2B] hover:bg-[#7D4620] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                    >
                                      Nhận pha
                                    </button>
                                    <button
                                      disabled={updatingOrderId === ord.id}
                                      onClick={() =>
                                        handleAdminOrderStatusChange(
                                          ord.id,
                                          "CANCELLED"
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#991B1B] text-xs font-bold cursor-pointer disabled:opacity-50"
                                    >
                                      Hủy & Hoàn kho
                                    </button>
                                  </>
                                )}

                                {ord.status === "PREPARING" && (
                                  <button
                                    disabled={updatingOrderId === ord.id}
                                    onClick={() =>
                                      handleAdminOrderStatusChange(
                                        ord.id,
                                        "READY"
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    Báo có nước
                                  </button>
                                )}

                                {ord.status === "READY" && (
                                  <button
                                    disabled={updatingOrderId === ord.id}
                                    onClick={() =>
                                      handleAdminOrderStatusChange(
                                        ord.id,
                                        "COMPLETED"
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-[#166534] hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    Hoàn tất
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 7: QUẢN LÝ NHÂN VIÊN & CA LÀM (STAFF CRUD)
             =================================================================== */}
          {activeTab === "staff" && (
            <StaffManagementSection
              staffList={staffList}
              currentUserId={user?.id}
              onRefresh={fetchAdminData}
              showToast={showToast}
              apiFetch={apiFetch}
            />
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL 1: CREATE / EDIT PRODUCT (THÊM / SỬA MÓN ĂN & CHỌN ẢNH 3 CHẾ ĐỘ)
         ===================================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E6DDD5] my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E6DDD5]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E5A2B]">
                  {editingProduct
                    ? `Chỉnh sửa món #${editingProduct.id}`
                    : "Thêm món mới vào Thực đơn"}
                </span>
                <h3 className="font-headline text-xl font-extrabold text-[#2C1E18] mt-0.5">
                  {editingProduct ? editingProduct.name : "Tạo Sản Phẩm Mới"}
                </h3>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F3ECE4] flex items-center justify-center text-[#7A6A5E] hover:text-[#2C1E18]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                    Tên món đồ uống / bánh ngọt *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="VD: Cold Brew Cam Sả"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-semibold focus:outline-none focus:border-[#9E5A2B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                    Giá bán chuẩn Size S (VNĐ) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-extrabold text-[#9E5A2B] focus:outline-none focus:border-[#9E5A2B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                    Phụ thu Size M riêng (+VNĐ, để trống = dùng mặc định +{sizePricing.sizeM}đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={prodSizeUpchargeM}
                    onChange={(e) => setProdSizeUpchargeM(e.target.value)}
                    placeholder={`Mặc định toàn quán: +${sizePricing.sizeM}đ`}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                    Phụ thu Size L riêng (+VNĐ, để trống = dùng mặc định +{sizePricing.sizeL}đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={prodSizeUpchargeL}
                    onChange={(e) => setProdSizeUpchargeL(e.target.value)}
                    placeholder={`Mặc định toàn quán: +${sizePricing.sizeL}đ`}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                    Danh mục hiển thị trên Menu
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-semibold focus:outline-none focus:border-[#9E5A2B]"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                    Nhãn nổi bật góc ảnh (Tag)
                  </label>
                  <input
                    type="text"
                    value={prodTag}
                    onChange={(e) => setProdTag(e.target.value)}
                    placeholder="VD: Đặc sản, Signature, Mới, Best Seller..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm focus:outline-none focus:border-[#9E5A2B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                  Mô tả hương vị & thành phần chi tiết
                </label>
                <textarea
                  rows={3}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Nhập mô tả hấp dẫn về hương vị, nguồn gốc hạt cà phê hoặc nguyên liệu..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm focus:outline-none focus:border-[#9E5A2B]"
                />
              </div>

              {/* 3-Mode Image Selector + Live Preview */}
              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DDD5] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#2C1E18]">
                    Hình ảnh sản phẩm (Hỗ trợ 3 chế độ)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: "preset", label: "1. Thư viện quán" },
                      { id: "upload", label: "2. Tải từ máy tính" },
                      { id: "url", label: "3. Dán link URL" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setImageInputMode(m.id as "preset" | "upload" | "url")
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          imageInputMode === m.id
                            ? "bg-[#2C1810] text-white"
                            : "bg-white text-[#7A6A5E] border border-[#E6DDD5]"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Live Image Preview */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border border-[#E6DDD5] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prodImageUrl || "/images/products/ca-phe-sua.png"}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 w-full">
                    {imageInputMode === "preset" && (
                      <div>
                        <p className="text-[11px] text-[#7A6A5E] mb-1.5">
                          Chọn nhanh ảnh студио có sẵn trong hệ thống:
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {BUILTIN_PRODUCT_IMAGES.map((item) => (
                            <button
                              key={item.url}
                              type="button"
                              onClick={() => setProdImageUrl(item.url)}
                              className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 cursor-pointer ${
                                prodImageUrl === item.url
                                  ? "border-[#9E5A2B] bg-[#FEF3C7]/50 font-bold"
                                  : "border-[#E6DDD5] bg-white"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.url}
                                alt={item.label}
                                className="w-6 h-6 rounded object-cover shrink-0"
                              />
                              <span className="text-[10px] truncate">
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {imageInputMode === "upload" && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-[#7A6A5E]">
                          Chọn file ảnh (.png, .jpg, .webp) từ máy tính của bạn:
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="block w-full text-xs text-[#7A6A5E] file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#2C1810] file:text-white hover:file:bg-[#3F2E26] cursor-pointer"
                        />
                      </div>
                    )}

                    {imageInputMode === "url" && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-[#7A6A5E]">
                          Dán đường dẫn URL hình ảnh trực tuyến (https://...
                          hoặc /images/...):
                        </p>
                        <input
                          type="text"
                          value={prodImageUrl}
                          onChange={(e) => setProdImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6DDD5] text-xs focus:outline-none focus:border-[#9E5A2B]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visibility & Manual Sold-out Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodIsActive}
                    onChange={(e) => setProdIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#166534]"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#2C1E18]">
                      Hiển thị trên Menu khách hàng
                    </p>
                    <p className="text-[10px] text-[#7A6A5E]">
                      Bỏ tích nếu muốn ẩn hoàn toàn món này
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodIsSoldOutManual}
                    onChange={(e) => setProdIsSoldOutManual(e.target.checked)}
                    className="w-4 h-4 accent-[#DC2626]"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#2C1E18]">
                      Báo hết hàng thủ công (Sold Out)
                    </p>
                    <p className="text-[10px] text-[#7A6A5E]">
                      Khóa đặt món tạm thời dù kho vẫn còn nguyên liệu
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6DDD5]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#F3ECE4] text-xs font-bold text-[#7A6A5E] hover:text-[#2C1E18]"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-2.5 rounded-xl bg-[#9E5A2B] hover:bg-[#7D4620] text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSavingProduct
                    ? "Đang lưu..."
                    : editingProduct
                    ? "Lưu thay đổi"
                    : "Tạo món mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: RESTOCK / SET STOCK INGREDIENT
         ===================================================================== */}
      {selectedIngredient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6DDD5]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#F3ECE4] text-[#9E5A2B]">
                  {modalMode === "restock"
                    ? "Phiếu Nhập Kho (+)"
                    : "Kiểm Kê Tồn Kho (=)"}
                </span>
                <h3 className="font-headline text-lg font-extrabold text-[#2C1E18] mt-1">
                  {selectedIngredient.name}
                </h3>
                <p className="text-xs text-[#7A6A5E]">
                  Tồn kho hiện tại:{" "}
                  <strong>
                    {selectedIngredient.stock.toLocaleString("vi-VN")}{" "}
                    {selectedIngredient.unit}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedIngredient(null)}
                className="w-8 h-8 rounded-full bg-[#F3ECE4] flex items-center justify-center text-[#7A6A5E] hover:text-[#2C1E18]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                  {modalMode === "restock"
                    ? `Số lượng nhập thêm (${selectedIngredient.unit})`
                    : `Đặt lại mức tồn kho thực tế (${selectedIngredient.unit})`}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-base font-extrabold text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#2C1E18]">
                    Đơn giá nhập ({restockCostMode === "bulk" && (selectedIngredient.unit === "g" || selectedIngredient.unit === "ml")
                      ? selectedIngredient.unit === "g" ? "VNĐ / 1 Kg" : "VNĐ / 1 Lít"
                      : `VNĐ / 1 ${selectedIngredient.unit}`})
                  </label>
                  {(selectedIngredient.unit === "g" || selectedIngredient.unit === "ml") && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextMode = restockCostMode === "bulk" ? "unit" : "bulk";
                        setRestockCostMode(nextMode);
                        const cur = Number(restockCostInput) || 0;
                        setRestockCostInput(
                          String(nextMode === "bulk" ? Math.round(cur * 1000) : cur / 1000)
                        );
                      }}
                      className="text-[11px] font-bold text-[#9E5A2B] underline cursor-pointer"
                    >
                      Đổi sang nhập theo {restockCostMode === "bulk" ? `1 ${selectedIngredient.unit}` : selectedIngredient.unit === "g" ? "1 Kg" : "1 Lít"}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={restockCostInput}
                  onChange={(e) => setRestockCostInput(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-extrabold text-[#9E5A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1.5">
                  Ghi chú vận hành
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIngredient(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#F3ECE4] text-xs font-bold text-[#7A6A5E] hover:text-[#2C1E18]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="px-5 py-2.5 rounded-xl bg-[#9E5A2B] hover:bg-[#7D4620] text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmittingModal ? "Đang lưu..." : "Xác nhận cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: CREATE / EDIT INGREDIENT METADATA
         ===================================================================== */}
      {isIngFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6DDD5]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E6DDD5]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#9E5A2B]">
                  {editingIng
                    ? "Chỉnh sửa nguyên vật liệu"
                    : "Thêm nguyên vật liệu mới"}
                </span>
                <h3 className="font-headline text-lg font-extrabold text-[#2C1E18]">
                  {editingIng ? editingIng.name : "Tạo Nguyên Vật Liệu Kho"}
                </h3>
              </div>
              <button
                onClick={() => setIsIngFormOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F3ECE4] flex items-center justify-center text-[#7A6A5E]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Mã Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={ingCode}
                    onChange={(e) => setIngCode(e.target.value)}
                    placeholder="ING_OAT_MILK"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Đơn vị tính *
                  </label>
                  <select
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                  >
                    <option value="g">g (Gram)</option>
                    <option value="ml">ml (Mililit)</option>
                    <option value="chiếc">chiếc</option>
                    <option value="lát">lát</option>
                    <option value="phần">phần</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                  Tên nguyên vật liệu *
                </label>
                <input
                  type="text"
                  required
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  placeholder="VD: Sữa Yến Mạch Oatside Barista"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Tồn kho ({ingUnit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={ingStock}
                    onChange={(e) => setIngStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Ngưỡng cảnh báo ({ingUnit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={ingMinThreshold}
                    onChange={(e) => setIngMinThreshold(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-bold text-[#B45309]"
                  />
                </div>
              </div>

              {/* 2-Way Cost Per Unit Input (Theo 1g/ml VÀ theo 1 Kg/Lít) */}
              <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#E6DDD5] space-y-2">
                <p className="text-xs font-bold text-[#2C1E18]">
                  💰 Giá nhập nguyên vật liệu (Tự động quy đổi 2 chiều để tính Giá vốn COGS)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6A5E] mb-1">
                      Giá trên 1 {ingUnit} (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={ingCostPerUnit}
                      onChange={(e) => {
                        const v = e.target.value;
                        setIngCostPerUnit(v);
                        const num = Number(v);
                        if (!isNaN(num)) {
                          setIngCostBulk(
                            String(
                              ingUnit === "g" || ingUnit === "ml"
                                ? Math.round(num * 1000)
                                : num
                            )
                          );
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E6DDD5] text-xs font-extrabold text-[#9E5A2B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6A5E] mb-1">
                      {ingUnit === "g"
                        ? "Giá trên 1 Kg = 1000g (VNĐ)"
                        : ingUnit === "ml"
                        ? "Giá trên 1 Lít = 1000ml (VNĐ)"
                        : `Giá trên 1 ${ingUnit} (VNĐ)`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={ingCostBulk}
                      onChange={(e) => {
                        const v = e.target.value;
                        setIngCostBulk(v);
                        const num = Number(v);
                        if (!isNaN(num)) {
                          setIngCostPerUnit(
                            String(
                              ingUnit === "g" || ingUnit === "ml"
                                ? num / 1000
                                : num
                            )
                          );
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E6DDD5] text-xs font-extrabold text-[#166534]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6DDD5]">
                <button
                  type="button"
                  onClick={() => setIsIngFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F3ECE4] text-xs font-bold text-[#7A6A5E]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingIng}
                  className="px-5 py-2 rounded-xl bg-[#9E5A2B] text-white text-xs font-bold cursor-pointer"
                >
                  {isSavingIng ? "Đang lưu..." : "Lưu nguyên vật liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: ADD INGREDIENT TO PRODUCT BOM RECIPE
         ===================================================================== */}
      {bomModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6DDD5]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E6DDD5]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#9E5A2B]">
                  Thiết lập công thức BOM
                </span>
                <h3 className="font-headline text-lg font-extrabold text-[#2C1E18]">
                  {bomModalProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setBomModalProduct(null)}
                className="w-8 h-8 rounded-full bg-[#F3ECE4] flex items-center justify-center text-[#7A6A5E]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveBomEntry} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                  Chọn nguyên vật liệu trong kho
                </label>
                <select
                  value={bomSelectedIngId}
                  onChange={(e) => setBomSelectedIngId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.code} — Đơn vị: {ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Áp dụng cho Size
                  </label>
                  <select
                    value={bomSelectedSize}
                    onChange={(e) => setBomSelectedSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                  >
                    <option value="S">Size S (Nhỏ)</option>
                    <option value="M">Size M (Vừa)</option>
                    <option value="L">Size L (Lớn)</option>
                    <option value="ALL">ALL (Mọi size / Bánh ngọt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Định lượng tiêu hao
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={bomAmountInput}
                    onChange={(e) => setBomAmountInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-extrabold text-[#9E5A2B]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6DDD5]">
                <button
                  type="button"
                  onClick={() => setBomModalProduct(null)}
                  className="px-4 py-2 rounded-xl bg-[#F3ECE4] text-xs font-bold text-[#7A6A5E]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingBom}
                  className="px-5 py-2 rounded-xl bg-[#9E5A2B] text-white text-xs font-bold cursor-pointer"
                >
                  {isSavingBom ? "Đang lưu..." : "Thêm vào công thức"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: DELETE CONFIRMATION DIALOG (CẢNH BÁO LIÊN KẾT TRƯỚC KHI XÓA)
         ===================================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#991B1B] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[26px]">
                warning
              </span>
            </div>
            <h3 className="font-headline text-lg font-extrabold text-[#2C1E18]">
              Xác nhận xóa{" "}
              {deleteTarget.type === "product"
                ? "sản phẩm"
                : "nguyên vật liệu"}{" "}
              ?
            </h3>
            <p className="text-xs text-[#7A6A5E] mt-1.5 leading-relaxed">
              Bạn đang yêu cầu xóa vĩnh viễn{" "}
              <strong className="text-[#2C1E18]">
                &ldquo;{deleteTarget.name}&rdquo;
              </strong>{" "}
              khỏi cơ sở dữ liệu:
            </p>

            <div className="my-4 p-3.5 rounded-2xl bg-[#FEF2F2] border border-red-200 space-y-1 text-xs text-[#991B1B]">
              <p>
                • Số dòng công thức BOM sẽ bị xóa tự động (Cascade):{" "}
                <strong>{deleteTarget.recipesCount} dòng</strong>
              </p>
              {deleteTarget.type === "product" && (
                <p>
                  • Lịch sử đơn hàng đã mua món này (
                  <strong>{deleteTarget.ordersCount ?? 0} ly</strong>) vẫn được
                  giữ nguyên tên & giá trong hóa đơn cũ để bảo toàn báo cáo
                  doanh thu.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-[#F3ECE4] text-xs font-bold text-[#7A6A5E] cursor-pointer"
              >
                Giữ lại
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 7: CREATE NEW TOPPING MODAL
         ===================================================================== */}
      {isToppingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6DDD5]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E6DDD5]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#9E5A2B]">
                  Thêm Topping Mới
                </span>
                <h3 className="font-headline text-lg font-extrabold text-[#2C1E18]">
                  Tạo Topping & Thiết Lập Giá Bán
                </h3>
              </div>
              <button
                onClick={() => setIsToppingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F3ECE4] flex items-center justify-center text-[#7A6A5E]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleCreateTopping} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Mã Topping *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTopCode}
                    onChange={(e) => setNewTopCode(e.target.value)}
                    placeholder="VD: pudding"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Giá bán (+VNĐ) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={newTopPrice}
                    onChange={(e) => setNewTopPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-extrabold text-[#9E5A2B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                  Tên hiển thị trên Menu khách *
                </label>
                <input
                  type="text"
                  required
                  value={newTopName}
                  onChange={(e) => setNewTopName(e.target.value)}
                  placeholder="VD: Bánh Flan Trứng Tươi"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                  Mô tả ngắn (Subtext)
                </label>
                <input
                  type="text"
                  value={newTopSubtext}
                  onChange={(e) => setNewTopSubtext(e.target.value)}
                  placeholder="VD: Mềm mịn béo thơm hương caramel"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Nguyên liệu trừ kho *
                  </label>
                  <select
                    value={newTopIngId}
                    onChange={(e) => setNewTopIngId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Định lượng tiêu hao *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={newTopAmount}
                    onChange={(e) => setNewTopAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6DDD5]">
                <button
                  type="button"
                  onClick={() => setIsToppingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F3ECE4] text-xs font-bold text-[#7A6A5E]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingTopping}
                  className="px-5 py-2 rounded-xl bg-[#9E5A2B] text-white text-xs font-bold cursor-pointer"
                >
                  {isSavingTopping ? "Đang lưu..." : "Tạo Topping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: ORDER DETAIL RECEIPT MODAL
         ===================================================================== */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E6DDD5]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E6DDD5]">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#9E5A2B]">
                  CHI TIẾT ĐƠN HÀNG #{selectedOrderDetail.id}
                </span>
                <h3 className="font-headline text-lg font-extrabold text-[#2C1E18]">
                  {selectedOrderDetail.user?.fullName || "Khách hàng BrewLite"}
                </h3>
                <p className="text-xs text-[#7A6A5E]">
                  {selectedOrderDetail.user?.email || "—"} •{" "}
                  {new Date(selectedOrderDetail.createdAt).toLocaleString(
                    "vi-VN"
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="w-8 h-8 rounded-full bg-[#F3ECE4] flex items-center justify-center text-[#7A6A5E]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="my-4 space-y-2.5 max-h-72 overflow-y-auto">
              {selectedOrderDetail.items &&
              selectedOrderDetail.items.length > 0 ? (
                selectedOrderDetail.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#2C1E18]">
                        {item.quantity}x {item.productName}{" "}
                        <span className="text-xs font-semibold text-[#9E5A2B]">
                          (Size {item.size})
                        </span>
                      </p>
                      {item.toppings && item.toppings.length > 0 && (
                        <p className="text-[11px] text-[#7A6A5E]">
                          Topping: {item.toppings.join(", ")}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-extrabold text-[#2C1E18]">
                      {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}
                      đ
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#7A6A5E]">
                  Không có dữ liệu chi tiết món.
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F3ECE4]/60 space-y-1 text-xs">
              {selectedOrderDetail.discountAmount ? (
                <div className="flex justify-between text-[#166534] font-semibold">
                  <span>
                    Mã giảm giá ({selectedOrderDetail.discountCode || "Voucher"}
                    ):
                  </span>
                  <span>
                    -{selectedOrderDetail.discountAmount.toLocaleString("vi-VN")}
                    đ
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-extrabold text-[#2C1E18]">
                <span>Tổng thanh toán:</span>
                <span className="text-[#9E5A2B]">
                  {selectedOrderDetail.totalAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E6DDD5]">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF6F0] border border-[#E6DDD5]">
                Trạng thái: {selectedOrderDetail.status}
              </span>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 rounded-xl bg-[#2C1810] text-white text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
