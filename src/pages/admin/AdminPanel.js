import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminPanel.css";
import { api, API_BASE } from "../../api";
import { Editor } from "@tinymce/tinymce-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit, faPlus, faSearch, faBox, faList, faReceipt, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

const TINYMCE_KEY =
  process.env.REACT_APP_TINYMCE_API_KEY ||
  "aum1fhvek0kzlq6qt5j8je4qoc355t3pas1yjl4n20smdsfj";

const buildEmptyVariant = () => ({
  sku: "",
  price: "",
  stock: "",
  attributes: [{ name: "Size", value: "" }]
});

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null); // null = checking, true = admin, false = not admin
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    image: null
  });
  const [productForm, setProductForm] = useState({
    categoryName: "",
    name: "",
    description: "",
    image: null
  });
  const [variants, setVariants] = useState([buildEmptyVariant()]);
  // Variant matrix structure: columns for attributes, rows for combinations
  const [variantMatrix, setVariantMatrix] = useState({
    columns: [{ id: 1, attributeName: "", values: [] }], // Each column has attribute name and values per row
    rows: [{ id: 1, values: { 1: "" }, price: "", sku: "", stock: "" }] // Each row has values for each column + price/sku/stock
  });
  const [availableAttributeNames, setAvailableAttributeNames] = useState(["Size", "Color", "Material", "Type", "Capacity"]); // Available attribute names
  const [matrixErrors, setMatrixErrors] = useState({}); // Track errors for duplicate columns/combinations
  const [newAttributeInputs, setNewAttributeInputs] = useState({}); // Track new attribute input values per column
  const [useMatrixMode, setUseMatrixMode] = useState(true); // Use matrix mode by default
  const [products, setProducts] = useState([]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingVariantIndex, setDeletingVariantIndex] = useState(null);
  const [emptyVariantIndices, setEmptyVariantIndices] = useState([]);
  const [confirmIgnoreEmpty, setConfirmIgnoreEmpty] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("category");

  // Utility to determine whether a variant has meaningful data to submit
  const isVariantMeaningful = (v) => {
    if (!v) return false;
    if (v.id) return true; // existing variant (even if empty fields)
    if (v.sku && v.sku.toString().trim() !== "") return true;
    if ((v.attributes || []).some(a => (a.name && a.name.toString().trim() !== "") || (a.value && a.value.toString().trim() !== ""))) return true;
    if ((v.price !== undefined && v.price !== null && v.price !== "") || (v.stock !== undefined && v.stock !== null && v.stock !== "")) return true;
    return false;
  };
  const [editProduct, setEditProduct] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [manageCategoryFilter, setManageCategoryFilter] = useState("");
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelOrder, setPendingCancelOrder] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);

  const loadCategories = () => {
    api.getCategories()
      .then(res => setCategories(res.categories || []))
      .catch(err => console.error("Load categories failed", err));
  };

  // Check admin access on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem("authToken");
      const userData = localStorage.getItem("user");

      // Check if user is logged in
      if (!token || !userData) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        navigate("/login", { replace: true });
        return;
      }

      try {
        // Check admin status from backend
        const response = await api.checkAdmin();
        if (response.isAdmin) {
          setIsAdmin(true);
          // Load admin data
          loadCategories();
          loadProducts();
          loadOrders();
        } else {
          setIsAdmin(false);
          setMessage("Access denied. You do not have admin privileges.");
          // Redirect after showing message
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 2000);
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        setIsAdmin(false);
        setMessage("Access denied. Unable to verify admin status.");
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const loadOrders = () => {
    setLoadingOrders(true);
    api.getAllOrders()
      .then(res => {
        setOrders(res.orders || []);
      })
      .catch(err => {
        console.error("Load orders failed", err);
        setMessage(err.message || "Failed to load orders.");
      })
      .finally(() => {
        setLoadingOrders(false);
      });
  };

  const loadProducts = () => {
    api.getAdminProducts()
      .then(res => setProducts(res.products || []))
      .catch(err => console.error("Load products failed", err));
  };

  // Generate SKU based on product name + 3-digit number
  const generateSKU = (productName, index, existingSKUs = []) => {
    if (!productName || productName.trim() === "") {
      return "";
    }

    // Normalize product name: lowercase, remove special chars, keep alphanumeric and spaces
    const normalizedName = productName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .trim();

    if (normalizedName === "") {
      return "";
    }

    // Try to find a unique SKU starting from index (001, 002, etc.)
    let skuNumber = index + 1;
    let maxAttempts = 999; // Safety limit
    let attempts = 0;

    while (attempts < maxAttempts) {
      const skuSuffix = String(skuNumber).padStart(3, '0');
      const generatedSKU = `${normalizedName}${skuSuffix}`;

      // Check if this SKU already exists in the database
      if (!existingSKUs.includes(generatedSKU)) {
        return generatedSKU;
      }

      skuNumber++;
      attempts++;
    }

    // Fallback if all 999 SKUs are taken (unlikely but safe)
    return `${normalizedName}${String(skuNumber).padStart(3, '0')}`;
  };

  // Get all existing SKUs from products
  const getAllExistingSKUs = () => {
    const existingSKUs = new Set();
    products.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.sku && variant.sku.trim() !== "") {
            existingSKUs.add(variant.sku);
          }
        });
      }
    });
    // Also check current form variants (in case user has multiple variants)
    variants.forEach(variant => {
      if (variant.sku && variant.sku.trim() !== "") {
        existingSKUs.add(variant.sku);
      }
    });
    return Array.from(existingSKUs);
  };

  // Auto-generate SKUs for all variants when product name changes
  useEffect(() => {
    if (productForm.name && productForm.name.trim() !== "" && !editProduct) {
      const existingSKUs = getAllExistingSKUs();
      setVariants(prev => prev.map((variant, index) => {
        // Only auto-generate if SKU is empty
        if (!variant.sku || variant.sku.trim() === "") {
          return {
            ...variant,
            sku: generateSKU(productForm.name, index, existingSKUs)
          };
        }
        return variant;
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productForm.name, editProduct]);

  // Auto-generate SKU when a new variant is added
  const addVariant = () => {
    const existingSKUs = getAllExistingSKUs();
    const normalizedName = productForm.name
      ? productForm.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '').trim()
      : "";
    
    const newVariant = buildEmptyVariant();
    if (normalizedName && productForm.name.trim() !== "") {
      newVariant.sku = generateSKU(productForm.name, variants.length, existingSKUs);
    }
    
    setVariants(prev => [...prev, newVariant]);
  };

  const handleCategorySubmit = async e => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.image) {
      setMessage("Category name and image are required.");
      return;
    }
    setSavingCategory(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("name", categoryForm.name);
      formData.append("image", categoryForm.image);
      await api.createCategory(formData);
      setMessage("Category created.");
      setCategoryForm({ name: "", image: null });
      loadCategories();
    } catch (err) {
      setMessage(err.message || "Failed to create category.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteCategory(categoryId);
      setMessage(`Category "${categoryName}" deleted successfully.`);
      loadCategories();
    } catch (err) {
      setMessage(err.message || "Failed to delete category.");
    }
  };

  const updateVariant = (index, field, value) => {
    setVariants(prev => prev.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  // Remove a variant from local state
  const removeVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  // Add an attribute to a variant in local state
  const addAttribute = variantIndex => {
    setVariants(prev => prev.map((variant, i) =>
      i === variantIndex
        ? { ...variant, attributes: [...(variant.attributes || []), { name: "", value: "" }] }
        : variant
    ));
  };

  // Variant Matrix Functions
  const addMatrixColumn = () => {
    const newColumnId = Math.max(...variantMatrix.columns.map(c => c.id), 0) + 1;
    setVariantMatrix(prev => ({
      ...prev,
      columns: [...prev.columns, { id: newColumnId, attributeName: "", values: new Array(prev.rows.length).fill("") }]
    }));
  };

  const removeMatrixColumn = (columnId) => {
    setVariantMatrix(prev => ({
      ...prev,
      columns: prev.columns.filter(c => c.id !== columnId),
      rows: prev.rows.map(row => {
        const newValues = { ...row.values };
        delete newValues[columnId];
        return { ...row, values: newValues };
      })
    }));
    // Clear errors related to this column
    setMatrixErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`column-${columnId}`];
      return newErrors;
    });
  };

  const updateMatrixColumnName = (columnId, attributeName) => {
    const trimmedName = attributeName.trim();
    
    // Check for duplicate attribute names (excluding current column)
    const otherColumns = variantMatrix.columns.filter(col => col.id !== columnId);
    const duplicateColumn = otherColumns.find(col => col.attributeName.trim().toLowerCase() === trimmedName.toLowerCase());
    
    if (duplicateColumn && trimmedName !== "") {
      setMatrixErrors(prev => ({
        ...prev,
        [`column-${columnId}`]: `Attribute name "${trimmedName}" is already used in another column`
      }));
      return; // Don't update if duplicate
    }
    
    // Clear error for this column
    setMatrixErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`column-${columnId}`];
      return newErrors;
    });
    
    // Add to available attribute names if new
    if (trimmedName && !availableAttributeNames.includes(trimmedName)) {
      setAvailableAttributeNames(prev => [...prev, trimmedName].sort());
    }
    
    setVariantMatrix(prev => ({
      ...prev,
      columns: prev.columns.map(col => col.id === columnId ? { ...col, attributeName: trimmedName } : col)
    }));

    // If this is an edit session, add this attribute (empty value) to any variant that doesn't have it
    if (trimmedName && editProduct) {
      setVariants(prev => prev.map(v => {
        const has = (v.attributes || []).some(a => a.name === trimmedName);
        if (!has) {
          const attrs = (v.attributes || []).concat({ name: trimmedName, value: "" });
          return { ...v, attributes: attrs };
        }
        return v;
      }));
    }
  };

  const updateMatrixRowValue = (rowId, columnId, value) => {
    setVariantMatrix(prev => {
      const updatedRows = prev.rows.map(row => 
        row.id === rowId 
          ? { ...row, values: { ...row.values, [columnId]: value } }
          : row
      );
      
      // Check for duplicate combinations
      const currentRow = updatedRows.find(r => r.id === rowId);
      if (currentRow) {
        // Get all column IDs that have values
        const filledColumns = prev.columns
          .filter(col => col.attributeName)
          .map(col => col.id);
        
        // Create combination key from filled columns
        const combinationKey = filledColumns
          .map(colId => `${colId}:${currentRow.values[colId] || ""}`)
          .sort()
          .join("|");
        
        // Check for duplicates (excluding current row)
        const duplicateRow = updatedRows.find(row => {
          if (row.id === rowId) return false; // Skip current row
          
          const rowCombinationKey = filledColumns
            .map(colId => `${colId}:${row.values[colId] || ""}`)
            .sort()
            .join("|");
          
          return rowCombinationKey === combinationKey && combinationKey !== filledColumns.map(c => `${c}:`).join("|");
        });
        
        if (duplicateRow && combinationKey && combinationKey !== filledColumns.map(c => `${c}:`).join("|")) {
          setMatrixErrors(prev => ({
            ...prev,
            [`row-${rowId}`]: "This combination already exists in another row"
          }));
        } else {
          setMatrixErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`row-${rowId}`];
            return newErrors;
          });
        }
      }
      
      return {
        ...prev,
        rows: updatedRows
      };
    });
  };

  const updateMatrixRowPrice = (rowId, price) => {
    setVariantMatrix(prev => ({
      ...prev,
      rows: prev.rows.map(row => row.id === rowId ? { ...row, price } : row)
    }));
  };

  const updateMatrixRowSku = (rowId, sku) => {
    setVariantMatrix(prev => ({
      ...prev,
      rows: prev.rows.map(row => row.id === rowId ? { ...row, sku } : row)
    }));
  };

  const updateMatrixRowStock = (rowId, stock) => {
    setVariantMatrix(prev => ({
      ...prev,
      rows: prev.rows.map(row => row.id === rowId ? { ...row, stock } : row)
    }));
  };

  const addMatrixRow = () => {
    const newRowId = Math.max(...variantMatrix.rows.map(r => r.id), 0) + 1;
    const newValues = {};
    variantMatrix.columns.forEach(col => {
      newValues[col.id] = "";
    });

    // Add new row to matrix
    setVariantMatrix(prev => ({
      ...prev,
      rows: [...prev.rows, { id: newRowId, values: newValues, price: "", sku: "", stock: "" }],
      columns: prev.columns.map(col => ({
        ...col,
        values: [...col.values, ""]
      }))
    }));

    // If we're editing an existing product, also create a corresponding blank variant
    if (editProduct) {
      const newVariant = {
        // no id => will be created on submit
        sku: "",
        price: "",
        stock: "",
        attributes: variantMatrix.columns
          .map(col => ({ name: col.attributeName || "", value: "" }))
          .filter(a => a.name && a.name.trim() !== "")
      };
      setVariants(prev => [...prev, newVariant]);
    }
  };

  const removeMatrixRow = (rowId) => {
    const rowIndex = variantMatrix.rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) return;
    
    setVariantMatrix(prev => {
      const updated = {
        ...prev,
        rows: prev.rows.filter(r => r.id !== rowId),
        columns: prev.columns.map(col => ({
          ...col,
          values: col.values.filter((_, idx) => idx !== rowIndex)
        }))
      };
      
      // Re-validate remaining rows for duplicates after removal
      const filledColumns = updated.columns.filter(col => col.attributeName).map(col => col.id);
      const remainingRows = updated.rows;
      
      remainingRows.forEach(row => {
        const combinationKey = filledColumns
          .map(colId => `${colId}:${row.values[colId] || ""}`)
          .sort()
          .join("|");
        
        const duplicateRow = remainingRows.find(otherRow => {
          if (otherRow.id === row.id) return false;
          const otherKey = filledColumns
            .map(colId => `${colId}:${otherRow.values[colId] || ""}`)
            .sort()
            .join("|");
          return otherKey === combinationKey && combinationKey !== filledColumns.map(c => `${c}:`).join("|");
        });
        
        setMatrixErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`row-${rowId}`]; // Remove error for deleted row
          
          if (duplicateRow && combinationKey && combinationKey !== filledColumns.map(c => `${c}:`).join("|")) {
            newErrors[`row-${row.id}`] = "This combination already exists in another row";
          } else {
            delete newErrors[`row-${row.id}`];
          }
          return newErrors;
        });
      });
      
      return updated;
    });
  };

  // Convert matrix to variants format for submission
  const convertMatrixToVariants = () => {
    const existingSKUs = getAllExistingSKUs();
    return variantMatrix.rows.map((row, index) => {
      const attributes = variantMatrix.columns
        .filter(col => col.attributeName && row.values[col.id])
        .map(col => ({
          name: col.attributeName,
          value: row.values[col.id]
        }));
      
      // Generate SKU if not provided
      let sku = row.sku;
      if (!sku || sku.trim() === "") {
        sku = productForm.name && productForm.name.trim() !== "" 
          ? generateSKU(productForm.name, index, existingSKUs)
          : "";
      }
      
      return {
        sku: sku,
        price: Number(row.price) || 0,
        stock: Number(row.stock) || 0,
        attributes: attributes
      };
    }).filter(v => (v.sku && v.sku.trim() !== "") || v.price > 0); // Only include valid variants
  };

  const handleProductSubmit = async e => {
    e.preventDefault();
    if (!productForm.categoryName || !productForm.name || !productForm.image) {
      setMessage("Category, product name, and product image are required.");
      return;
    }

    setSavingProduct(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("categoryName", productForm.categoryName);
      formData.append("productName", productForm.name);
      formData.append("description", productForm.description);
      formData.append("image", productForm.image);
      (galleryFiles || []).forEach(file => {
        formData.append("gallery", file);
      });

      // Use matrix mode if enabled, otherwise use regular variants
      let cleanedVariants;
      if (useMatrixMode) {
        cleanedVariants = convertMatrixToVariants();
      } else {
      // Filter out empty variants (only include variants with SKU) and deduplicate attributes
        cleanedVariants = variants
        .filter(v => v.sku && v.sku.trim() !== "")
        .map(v => {
          // Deduplicate attributes by name:value combination
          const uniqueAttrs = [];
          const seenAttrs = new Set();
          (v.attributes || []).forEach(attr => {
            if (attr.name && attr.value) {
              const attrKey = `${attr.name}:${attr.value}`;
              if (!seenAttrs.has(attrKey)) {
                seenAttrs.add(attrKey);
                uniqueAttrs.push(attr);
              }
            }
          });
          
          return {
            sku: v.sku,
            price: Number(v.price) || 0,
            stock: Number(v.stock) || 0,
            attributes: uniqueAttrs
          };
        });
      }

      formData.append("variants", JSON.stringify(cleanedVariants));

      await api.createProduct(formData);
      setMessage("Product created.");
      setProductForm({
        categoryName: "",
        name: "",
        description: "",
        image: null
      });
      setVariants([buildEmptyVariant()]);
      setGalleryFiles([]);
      setExistingImages([]);
      loadProducts();
    } catch (err) {
      setMessage(err.message || "Failed to create product.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Delete this product and all its variants?")) return;
    try {
      await api.deleteProduct(id);
      setMessage("Product deleted.");
      loadProducts();
    } catch (err) {
      setMessage(err.message || "Failed to delete product.");
    }
  };

  const handleDeleteVariant = async (variantId, productId, index = null) => {
    if (!variantId) {
      console.error("Invalid variant ID:", variantId);
      setMessage("Invalid variant ID. Cannot delete.");
      return;
    }
    if (!window.confirm("Delete this variant?")) return;

    // mark deleting index for UI disable
    if (index !== null) setDeletingVariantIndex(index);

    try {
      await api.deleteVariant(variantId);
      setMessage("Variant deleted.");
      loadProducts();

      // update products list
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, variants: (p.variants || []).filter(v => v.id !== variantId) }
          : p
      ));

      // if we're currently editing this product, remove the variant from the edit form list
      if (editProduct && editProduct.id === productId) {
        setVariants(prev => prev.filter(v => v.id !== variantId));
      }
    } catch (err) {
      console.error("Error deleting variant:", err);
      setMessage(err.message || "Failed to delete variant.");
    } finally {
      if (index !== null) setDeletingVariantIndex(null);
    }
  };

  const copyVariantsFromProduct = (productId) => {
    const source = products.find(p => p.id === Number(productId));
    if (!source) return;
    
    // Deduplicate variants when copying
    const uniqueVariantsMap = new Map();
    (source.variants || []).forEach(v => {
      const key = v.id || v.sku;
      if (key && !uniqueVariantsMap.has(key)) {
        uniqueVariantsMap.set(key, {
          id: v.id,
          sku: v.sku || "",
          price: v.price || "",
          stock: v.stock || "",
          attributes: (v.attributes || []).map(a => ({ name: a.name || "", value: a.value || "" }))
        });
      }
    });
    
    const copied = Array.from(uniqueVariantsMap.values());
    setVariants(copied.length ? copied : [buildEmptyVariant()]);
    setMessage(`Copied ${copied.length} variant(s) from ${source.name}.`);
  };

  // Update a field in the variants state locally
  const updateVariantField = (index, field, value) => {
    setVariants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Update an attribute field for a variant by index
  const updateVariantAttribute = (variantIndex, attrIndex, field, value) => {
    setVariants(prev => {
      const copy = [...prev];
      const v = { ...copy[variantIndex] };
      const attrs = (v.attributes || []).map(a => ({ ...a }));
      attrs[attrIndex] = { ...attrs[attrIndex], [field]: value };
      v.attributes = attrs;
      copy[variantIndex] = v;
      return copy;
    });
  };

  // Update or set attribute value by attribute name (used for matrix-aligned columns)
  const updateVariantAttributeByName = (variantIndex, attrName, value) => {
    setVariants(prev => {
      const copy = [...prev];
      const v = { ...copy[variantIndex] };
      const attrs = (v.attributes || []).map(a => ({ ...a }));
      const idx = attrs.findIndex(a => a.name === attrName);
      if (idx >= 0) {
        attrs[idx] = { ...attrs[idx], value };
      } else {
        // add attribute if name is present
        if (attrName && attrName.trim() !== "") {
          attrs.push({ name: attrName, value });
        }
      }
      v.attributes = attrs;
      copy[variantIndex] = v;
      return copy;
    });
  };

  const addVariantAttribute = (variantIndex) => {
    setVariants(prev => {
      const copy = [...prev];
      const v = { ...copy[variantIndex] };
      v.attributes = (v.attributes || []).concat({ name: "", value: "" });
      copy[variantIndex] = v;
      return copy;
    });
  };

  const removeVariantAttribute = (variantIndex, attrIndex) => {
    setVariants(prev => {
      const copy = [...prev];
      const v = { ...copy[variantIndex] };
      v.attributes = (v.attributes || []).filter((_, i) => i !== attrIndex);
      copy[variantIndex] = v;
      return copy;
    });
  };

  // Save a single variant (PATCH/PUT to server)
  const saveVariant = async (index) => {
    try {
      const v = variants[index];
      if (!v || !v.id) {
        setMessage("Cannot save: variant has no id. Create it via Add Variant.");
        return;
      }

      const payload = {
        sku: v.sku,
        price: Number(v.price) || 0,
        stock: Number(v.stock) || 0
      };

      // Only include attributes if there are meaningful name/value pairs to set
      const attrsPayload = (v.attributes || []).map(a => ({ name: a.name || "", value: a.value || "" })).filter(a => a.name && a.value);
      if (attrsPayload.length > 0) payload.attributes = attrsPayload;

      setSavingProduct(true);
      const res = await api.updateVariant(v.id, payload);

      // Update the variant locally with server response
      const updated = res.variant;
      setVariants(prev => prev.map((pv, i) => i === index ? ({
        id: updated.variant_id,
        sku: updated.sku,
        price: updated.price,
        stock: updated.stock,
        attributes: Object.keys(updated.attributes || {}).map(name => ({ name, value: updated.attributes[name] }))
      }) : pv));

      setMessage("Variant saved successfully.");
    } catch (err) {
      console.error("Error saving variant:", err);
      setMessage(err.message || "Failed to save variant.");
    } finally {
      setSavingProduct(false);
    }
  };

  const startEditProduct = async (product) => {
    try {
      if (!product || !product.id) {
        console.error("Invalid product data:", product);
        setMessage("Invalid product data. Cannot edit.");
        return;
      }

      setEditProduct(product);
      setProductForm({
        categoryName: product.categoryName || "",
        name: product.name || "",
        description: product.description || "",
        image: null
      });

      // Fetch latest product + variants from server to ensure all variants are loaded
      try {
        const res = await api.getProductForEdit(product.id);
        const serverProduct = res.product || {};
        const serverVariants = res.variants || [];

        // Normalize variants for the UI: map attributes object to array of {name,value}
        const normalized = serverVariants.map(v => ({
          id: v.variant_id,
          sku: v.sku || "",
          price: v.price || 0,
          stock: v.stock || 0,
          attributes: Object.keys(v.attributes || {}).map(name => ({ name, value: v.attributes[name] }))
        }));

        setVariants(normalized.length ? normalized : [buildEmptyVariant()]);
        setExistingImages(Array.isArray(serverProduct.images) ? serverProduct.images : []);

        // Build variant matrix columns from fetched variants' attribute names to reflect existing attributes
        const attributeNames = Array.from(new Set((normalized || []).flatMap(v => (v.attributes || []).map(a => a.name).filter(Boolean))));
        if (attributeNames.length > 0) {
          setVariantMatrix(prev => ({
            ...prev,
            columns: attributeNames.map((name, idx) => ({ id: idx + 1, attributeName: name, values: [] }))
          }));
        }

        console.log(`Fetched ${normalized.length} variants from server for product ${product.id}`);
      } catch (fetchErr) {
        console.error("Failed to fetch product edit data:", fetchErr);
        // Fall back to the product object we already had
        const uniqueVariantsMap = new Map();
        (product.variants || []).forEach(v => {
          const key = v.id || v.sku;
          if (key && !uniqueVariantsMap.has(key)) {
            uniqueVariantsMap.set(key, {
              id: v.id,
              sku: v.sku || "",
              price: v.price || "",
              stock: v.stock || "",
              attributes: (v.attributes || []).map(a => ({ name: a.name || a.attribute_name || "", value: a.value || a.attribute_value || "" }))
            });
          }
        });
        const fallback = Array.from(uniqueVariantsMap.values());
        setVariants(fallback.length ? fallback : [buildEmptyVariant()]);

        // If we have attribute names in fallback variants, populate matrix columns
        const fallbackAttrNames = Array.from(new Set((fallback || []).flatMap(v => (v.attributes || []).map(a => a.name).filter(Boolean))));
        if (fallbackAttrNames.length > 0) {
          setVariantMatrix(prev => ({
            ...prev,
            columns: fallbackAttrNames.map((name, idx) => ({ id: idx + 1, attributeName: name, values: [] }))
          }));
        }
      }

      setGalleryFiles([]);
      setActiveTab("product");
    } catch (error) {
      console.error("Error starting edit product:", error);
      setMessage("Error loading product for editing: " + error.message);
    }
  };

  const findEmptyVariantIndices = () => {
    return variants
      .map((v, i) => (!v.id && !isVariantMeaningful(v) ? i : -1))
      .filter(i => i !== -1);
  };

  const performSubmit = async (cleanEmptyIgnored = false) => {
    setSavingProduct(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("categoryName", productForm.categoryName);
      formData.append("productName", productForm.name);
      formData.append("description", productForm.description || "");
      
      if (productForm.image) {
        formData.append("image", productForm.image);
      }
      
      (galleryFiles || []).forEach(file => {
        formData.append("gallery", file);
      });
      
      // Send existing image IDs to keep
      const keepIds = existingImages.map(img => img.id).filter(id => id);
      formData.append("keepImageIds", JSON.stringify(keepIds));

      // Prepare cleaned variants; if cleanEmptyIgnored is true, ignore empty rows
      const cleanedVariants = variants
        .filter(v => cleanEmptyIgnored ? isVariantMeaningful(v) : isVariantMeaningful(v))
        .map(v => {
          const uniqueAttrs = [];
          const seenAttrs = new Set();
          (v.attributes || []).forEach(attr => {
            if (attr.name && attr.value) {
              const attrKey = `${attr.name}:${attr.value}`;
              if (!seenAttrs.has(attrKey)) {
                seenAttrs.add(attrKey);
                uniqueAttrs.push(attr);
              }
            }
          });

          const mapped = {
            sku: v.sku && v.sku.toString().trim() !== "" ? v.sku.toString().trim() : undefined,
            price: Number(v.price) || 0,
            stock: Number(v.stock) || 0
          };

          // Only include attributes if we have meaningful attributes to set.
          if (uniqueAttrs.length > 0) {
            mapped.attributes = uniqueAttrs;
          }

          if (v.id) mapped.id = v.id;
          return mapped;
        });

      const createdCount = cleanedVariants.filter(v => !v.id).length;
      const updatedCount = cleanedVariants.filter(v => v.id).length;

      formData.append("variants", JSON.stringify(cleanedVariants));

      console.log("Submitting variants payload:", JSON.stringify(cleanedVariants, null, 2));
      await api.updateProduct(editProduct.id, formData);

      setMessage(`Product updated! ${createdCount} variant(s) created, ${updatedCount} updated.`);
      setEditProduct(null);
      setProductForm({
        categoryName: "",
        name: "",
        description: "",
        image: null
      });
      setVariants([buildEmptyVariant()]);
      setGalleryFiles([]);
      setExistingImages([]);
      loadProducts();

      // reset empty/confirm flags
      setEmptyVariantIndices([]);
      setConfirmIgnoreEmpty(false);

    } catch (err) {
      console.error("Update product error:", err);
      const errorMsg = err.message || "Failed to update product. Please check console for details.";
      setMessage(errorMsg);
    } finally {
      setSavingProduct(false);
    }
  };

  const submitEditProduct = async (e) => {
    e.preventDefault();
    if (!editProduct) {
      setMessage("No product selected for editing.");
      return;
    }

    // Validation
    if (!productForm.name || productForm.name.trim() === "") {
      setMessage("Product name is required.");
      return;
    }

    if (!productForm.categoryName) {
      setMessage("Category is required.");
      return;
    }

    // Check for empty rows
    const emptyIndices = findEmptyVariantIndices();
    if (emptyIndices.length > 0 && !confirmIgnoreEmpty) {
      setEmptyVariantIndices(emptyIndices);
      setMessage(`There are ${emptyIndices.length} empty variant row(s). Fill or remove them, or click 'Ignore empty variants and submit'.`);
      return;
    }

    // Proceed to perform submit (if confirmIgnoreEmpty true, performSubmit will ignore empty rows)
    await performSubmit(confirmIgnoreEmpty);
  };

  const toggleStatus = async (product) => {
    try {
      if (!product || !product.id) {
        console.error("Invalid product data for status toggle:", product);
        setMessage("Invalid product data. Cannot update status.");
        return;
      }
      await api.updateProductStatus(product.id, product.isActive ? 0 : 1);
      setMessage(`Product ${product.isActive ? "deactivated" : "activated"}.`);
      loadProducts();
    } catch (err) {
      console.error("Error toggling product status:", err);
      setMessage(err.message || "Failed to update status.");
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredProductsForCopy = products;

  const filteredManageProducts = (products || []).filter(p => {
    if (!p) return false;
    try {
      const matchesName =
        !productSearch ||
        (p.name && p.name.toLowerCase().includes(productSearch.toLowerCase()));
      const matchesCategory =
        !manageCategoryFilter ||
        p.categoryName === manageCategoryFilter;
      return matchesName && matchesCategory;
    } catch (error) {
      console.error("Error filtering product:", p, error);
      return false;
    }
  });

  // Show loading screen while checking admin access
  if (checkingAdmin) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Checking admin access...</div>
      </div>
    );
  }

  // Show access denied if not admin
  if (isAdmin === false) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ 
          fontSize: '24px', 
          color: '#d32f2f', 
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Access Denied
        </div>
        <div style={{ fontSize: '16px', color: '#666', textAlign: 'center' }}>
          {message || "You do not have permission to access the admin panel."}
        </div>
        <div style={{ fontSize: '14px', color: '#999', textAlign: 'center' }}>
          Redirecting to homepage...
        </div>
      </div>
    );
  }

  // Only render admin panel if user is admin
  if (isAdmin !== true) {
    return null;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        {message && <div className="admin-message">{message}</div>}
      </div>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <button
            className={activeTab === "category" ? "active" : ""}
            onClick={() => setActiveTab("category")}
          >
            <FontAwesomeIcon icon={faList} /> Categories
          </button>
          <button
            className={activeTab === "product" ? "active" : ""}
            onClick={() => setActiveTab("product")}
          >
            <FontAwesomeIcon icon={faPlus} /> Products
          </button>
          <button
            className={activeTab === "manage" ? "active" : ""}
            onClick={() => setActiveTab("manage")}
          >
            <FontAwesomeIcon icon={faBox} /> Manage Products
          </button>
          <button
            className={activeTab === "orders" ? "active" : ""}
            onClick={() => {
              setActiveTab("orders");
              loadOrders();
            }}
          >
            <FontAwesomeIcon icon={faReceipt} /> Orders
          </button>
        </aside>

        <div className="admin-content">
          {activeTab === "category" && (
            <section className="admin-card">
              <div className="category-section-header">
                <h2>Categories</h2>
                <div className="category-search-wrapper">
                  <FontAwesomeIcon icon={faSearch} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    className="category-search-input"
                  />
                </div>
              </div>

              <div className="category-content-wrapper">
                <div className="create-category-card">
                  <h3>Create New Category</h3>
                  <form onSubmit={handleCategorySubmit} className="category-form">
                    <div className="category-form-field">
                      <label className="category-field-label">Category Name *</label>
                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={e =>
                          setCategoryForm(f => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g. Laboratory Glassware"
                        className="category-input"
                      />
                    </div>

                    <div className="category-form-field">
                      <label className="category-field-label">Category Image *</label>
                      <div className="category-image-upload">
                        <input
                          type="file"
                          accept="image/*"
                          id="category-image-input"
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) {
                              setCategoryForm(f => ({ ...f, image: file }));
                            }
                          }}
                          className="category-file-input"
                        />
                        {categoryForm.image ? (
                          <div className="category-image-preview">
                            <img
                              src={URL.createObjectURL(categoryForm.image)}
                              alt="Preview"
                              className="preview-image"
                            />
                            <button
                              type="button"
                              className="remove-image-btn"
                              onClick={() => {
                                setCategoryForm(f => ({ ...f, image: null }));
                                document.getElementById('category-image-input').value = '';
                              }}
                              title="Remove image"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </div>
                        ) : (
                          <label htmlFor="category-image-input" className="category-image-upload-label">
                            <FontAwesomeIcon icon={faPlus} />
                            <span>Click to upload image</span>
                          </label>
                        )}
                      </div>
                    </div>

                    <button type="submit" disabled={savingCategory} className="btn-create-category">
                      <FontAwesomeIcon icon={faPlus} /> {savingCategory ? "Creating..." : "Create Category"}
                    </button>
                  </form>
                </div>

                <div className="categories-list-card">
                  <h3>All Categories ({filteredCategories.length})</h3>
                  {filteredCategories.length === 0 ? (
                    <div className="empty-categories">
                      <p>No categories found. Create your first category above.</p>
                    </div>
                  ) : (
                    <div className="categories-grid">
                      {filteredCategories.map(cat => {
                        const image = cat.image?.startsWith("http")
                          ? cat.image
                            : `${API_BASE}${cat.image}`;
                        return (
                          <div key={cat.id} className="category-item-card">
                            <img src={image} alt={cat.name} className="category-item-image" />
                            <div className="category-item-info">
                              <p className="category-item-name">{cat.name}</p>
                              <small className="category-item-slug">{cat.slug}</small>
                            </div>
                            <button
                              className="btn-delete-category"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              title="Delete category"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "product" && (
            <section className="admin-card">
              <div className="product-form-header">
                <h2>{editProduct ? "Update Product" : "Create Product"}</h2>
              </div>

              <form onSubmit={editProduct ? submitEditProduct : handleProductSubmit} className="product-form-improved">
                <div className="product-form-section">
                  <h3 className="form-section-title">Basic Information</h3>
                  
                  <div className="product-form-grid">
                    <div className="product-form-field">
                      <label className="product-field-label">Category *</label>
                      <select
                        value={productForm.categoryName}
                        onChange={e =>
                          setProductForm(f => ({ ...f, categoryName: e.target.value }))
                        }
                        className="product-select"
                      >
                        <option value="">Select category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="product-form-field">
                      <label className="product-field-label">Product Name *</label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={e =>
                          setProductForm(f => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g. Conical Flask"
                        className="product-input"
                      />
                    </div>
                  </div>

                  <div className="product-form-field">
                    <label className="product-field-label">Description</label>
                    <Editor
                      value={productForm.description || ""}
                      init={{
                        height: 220,
                        menubar: false,
                        plugins: [
                          "advlist", "autolink", "lists", "link", "image", "charmap",
                          "preview", "anchor", "searchreplace", "visualblocks",
                          "code", "insertdatetime", "media", "table", "help", "wordcount"
                        ],
                        toolbar:
                          "undo redo | blocks | bold italic underline | " +
                          "alignleft aligncenter alignright alignjustify | " +
                          "bullist numlist outdent indent | removeformat | help",
                        branding: false,
                        promotion: false
                      }}
                      onEditorChange={content =>
                        setProductForm(f => ({ ...f, description: content }))
                      }
                    />
                  </div>
                </div>

                <div className="product-form-section">
                  <h3 className="form-section-title">Product Images</h3>
                  
                  <div className="product-form-field">
                    <label className="product-field-label">Main Product Image *</label>
                    <div className="product-image-upload">
                      <input
                        type="file"
                        accept="image/*"
                        id="product-image-input"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setProductForm(f => ({ ...f, image: file }));
                          }
                        }}
                        className="product-file-input"
                      />
                      {productForm.image ? (
                        <div className="product-image-preview">
                          <img
                            src={URL.createObjectURL(productForm.image)}
                            alt="Preview"
                            className="preview-product-image"
                          />
                          <button
                            type="button"
                            className="remove-product-image-btn"
                            onClick={() => {
                              setProductForm(f => ({ ...f, image: null }));
                              document.getElementById('product-image-input').value = '';
                            }}
                            title="Remove image"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="product-image-input" className="product-image-upload-label">
                          <FontAwesomeIcon icon={faPlus} />
                          <span>Click to upload main product image</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="product-form-field">
                    <label className="product-field-label">Gallery Images (Optional)</label>
                    <div className="gallery-upload-section-improved">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        id="gallery-input"
                        onChange={e => {
                          const newFiles = Array.from(e.target.files || []);
                          if (newFiles.length > 0) {
                            setGalleryFiles(prev => [...prev, ...newFiles]);
                          }
                          // Reset input to allow selecting same files again
                          e.target.value = '';
                        }}
                        className="gallery-file-input"
                      />
                      {(existingImages.length > 0 || galleryFiles.length > 0) ? (
                        <div className="gallery-preview-improved">
                          <div className="gallery-preview-header-improved">
                            <p className="gallery-count-improved">
                              {existingImages.length} existing + {galleryFiles.length} new = {existingImages.length + galleryFiles.length} total
                            </p>
                            <button
                              type="button"
                              className="btn-add-more-gallery"
                              onClick={() => document.getElementById('gallery-input')?.click()}
                            >
                              <FontAwesomeIcon icon={faPlus} /> Add More
                            </button>
                          </div>
                          <div className="gallery-thumbnails-improved">
                            {/* Existing images */}
                            {existingImages.map((img, idx) => {
                              const imageUrl = img.image?.startsWith("http")
                                ? img.image
                                  : `${API_BASE}${img.image}`;
                              return (
                                <div key={`existing-${img.id}`} className="gallery-thumb-improved existing-image-improved">
                                  <img
                                    src={imageUrl}
                                    alt={`Existing ${idx + 1}`}
                                  />
                                  <span className="existing-badge-improved">Existing</span>
                                  <button
                                    type="button"
                                    className="remove-gallery-img-improved"
                                    onClick={() => {
                                      setExistingImages(prev => prev.filter(i => i.id !== img.id));
                                    }}
                                    title="Remove image"
                                  >
                                    <FontAwesomeIcon icon={faTimes} />
                                  </button>
                                </div>
                              );
                            })}
                            {/* New files */}
                            {galleryFiles.map((file, idx) => (
                              <div key={`new-${idx}`} className="gallery-thumb-improved new-image-improved">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`New ${idx + 1}`}
                                />
                                <span className="new-badge-improved">New</span>
                                <button
                                  type="button"
                                  className="remove-gallery-img-improved"
                                  onClick={() => {
                                    setGalleryFiles(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  title="Remove image"
                                >
                                  <FontAwesomeIcon icon={faTimes} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <label htmlFor="gallery-input" className="gallery-upload-label-improved">
                          <FontAwesomeIcon icon={faPlus} />
                          <span>Click to upload gallery images</span>
                          <small>Hold Ctrl/Cmd to select multiple images</small>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="product-form-section">
                  <h3 className="form-section-title">Product Variants</h3>
                  
                  <div className="product-form-field">
                    <label className="product-field-label">Quick Copy Variants (Optional)</label>
                    <select
                      onChange={e => copyVariantsFromProduct(e.target.value)}
                      defaultValue=""
                      className="product-select"
                    >
                      <option value="">Select product to copy variants from</option>
                      {filteredProductsForCopy.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.categoryName || "Uncategorised"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!editProduct && (
                    <div className="variants-section">
                      <div className="variants-section-header">
                        <h3>Add Variants (Matrix Mode)</h3>
                        <div style={{ display: "flex", gap: "12px" }}>
                          <button type="button" className="btn-add-column" onClick={addMatrixColumn}>
                            <FontAwesomeIcon icon={faPlus} /> Add Column
                          </button>
                          <button type="button" className="btn-add-variant" onClick={addMatrixRow}>
                            <FontAwesomeIcon icon={faPlus} /> Add Row
                          </button>
                        </div>
                      </div>

                      <div className="variant-matrix-table-wrapper">
                        <table className="variant-matrix-table">
                          <thead>
                            <tr>
                              {variantMatrix.columns.map((col) => (
                                <th key={col.id} className="matrix-column-header">
                                  <div className="matrix-column-header-content">
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                        <select
                                          value={col.attributeName || ""}
                                          onChange={(e) => {
                                            if (e.target.value !== "__new__") {
                                              updateMatrixColumnName(col.id, e.target.value);
                                              // Clear new attribute input when selecting from dropdown
                                              setNewAttributeInputs(prev => {
                                                const newInputs = { ...prev };
                                                delete newInputs[col.id];
                                                return newInputs;
                                              });
                                            } else {
                                              // When "Create New" is selected, show input
                                              setNewAttributeInputs(prev => ({ ...prev, [col.id]: "" }));
                                            }
                                          }}
                                          className={`matrix-attribute-select ${matrixErrors[`column-${col.id}`] ? "error" : ""}`}
                                        >
                                          <option value="">Select Attribute</option>
                                          {availableAttributeNames.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                          ))}
                                          <option value="__new__">+ Create New Attribute</option>
                                        </select>
                                        {newAttributeInputs[col.id] !== undefined && (
                                          <div style={{ display: "flex", gap: "4px", flex: 1, alignItems: "center" }}>
                                            <input
                                              type="text"
                                              value={newAttributeInputs[col.id] || ""}
                                              onChange={(e) => setNewAttributeInputs(prev => ({ ...prev, [col.id]: e.target.value }))}
                                              onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const newName = newAttributeInputs[col.id]?.trim();
                                                  if (newName) {
                                                    updateMatrixColumnName(col.id, newName);
                                                    setNewAttributeInputs(prev => {
                                                      const newInputs = { ...prev };
                                                      delete newInputs[col.id];
                                                      return newInputs;
                                                    });
                                                  }
                                                }
                                              }}
                                              onBlur={() => {
                                                const newName = newAttributeInputs[col.id]?.trim();
                                                if (newName) {
                                                  updateMatrixColumnName(col.id, newName);
                                                }
                                                setNewAttributeInputs(prev => {
                                                  const newInputs = { ...prev };
                                                  delete newInputs[col.id];
                                                  return newInputs;
                                                });
                                              }}
                                              placeholder="Enter new attribute name"
                                              className={`matrix-attribute-input-new ${matrixErrors[`column-${col.id}`] ? "error" : ""}`}
                                              autoFocus
                                            />
                                            <button
                                              type="button"
                                              className="btn-confirm-new-attribute"
                                              onClick={() => {
                                                const newName = newAttributeInputs[col.id]?.trim();
                                                if (newName) {
                                                  updateMatrixColumnName(col.id, newName);
                                                }
                                                setNewAttributeInputs(prev => {
                                                  const newInputs = { ...prev };
                                                  delete newInputs[col.id];
                                                  return newInputs;
                                                });
                                              }}
                                              title="Confirm"
                                            >
                                              <FontAwesomeIcon icon={faCheck} />
                                            </button>
                                            <button
                                              type="button"
                                              className="btn-cancel-new-attribute"
                                              onClick={() => {
                                                setNewAttributeInputs(prev => {
                                                  const newInputs = { ...prev };
                                                  delete newInputs[col.id];
                                                  return newInputs;
                                                });
                                              }}
                                              title="Cancel"
                                            >
                                              <FontAwesomeIcon icon={faTimes} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {matrixErrors[`column-${col.id}`] && (
                                        <span className="matrix-error-message">{matrixErrors[`column-${col.id}`]}</span>
                                      )}
                                    </div>
                                    {variantMatrix.columns.length > 1 && (
                                      <button
                                        type="button"
                                        className="btn-remove-column"
                                        onClick={() => removeMatrixColumn(col.id)}
                                        title="Remove column"
                                      >
                                        <FontAwesomeIcon icon={faTimes} />
                                      </button>
                                    )}
                                  </div>
                                </th>
                              ))}
                              <th className="matrix-price-header">Price (₹) *</th>
                              <th className="matrix-sku-header">SKU</th>
                              <th className="matrix-stock-header">Stock</th>
                              <th className="matrix-actions-header">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variantMatrix.rows.map((row) => (
                              <tr key={row.id} className={matrixErrors[`row-${row.id}`] ? "matrix-row-error" : ""}>
                                {variantMatrix.columns.map((col) => (
                                  <td key={col.id} className="matrix-cell">
                                    <input
                                      type="text"
                                      placeholder={`Enter ${col.attributeName || "value"}`}
                                      value={row.values[col.id] || ""}
                                      onChange={(e) => updateMatrixRowValue(row.id, col.id, e.target.value)}
                                      className="matrix-cell-input"
                                    />
                                  </td>
                                ))}
                                <td className="matrix-cell">
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={row.price}
                                    onChange={(e) => updateMatrixRowPrice(row.id, e.target.value)}
                                    className="matrix-cell-input"
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td className="matrix-cell">
                                  <input
                                    type="text"
                                    placeholder="Auto-generated"
                                    value={row.sku}
                                    onChange={(e) => updateMatrixRowSku(row.id, e.target.value)}
                                    className="matrix-cell-input"
                                  />
                                </td>
                                <td className="matrix-cell">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={row.stock}
                                    onChange={(e) => updateMatrixRowStock(row.id, e.target.value)}
                                    className="matrix-cell-input"
                                    min="0"
                                  />
                                </td>
                                <td className="matrix-cell">
                                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                                    {variantMatrix.rows.length > 1 && (
                                      <button
                                        type="button"
                                        className="btn-remove-row"
                                        onClick={() => removeMatrixRow(row.id)}
                                        title="Remove row"
                                      >
                                        <FontAwesomeIcon icon={faTrash} />
                                      </button>
                                    )}
                                    {matrixErrors[`row-${row.id}`] && (
                                      <span className="matrix-error-message" style={{ fontSize: "11px", color: "#dc2626" }}>
                                        {matrixErrors[`row-${row.id}`]}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {editProduct && (
                  <>
                    {/* Existing Variants - Inline editable section (shows server variants, editable individually) */}
                    <div className="existing-variants-section">
                      <div className="variants-section-header">
                        <h3>Existing Variants</h3>
                        <div style={{ display: "flex", gap: "12px" }}>
                          <button type="button" className="btn-add-column" onClick={addMatrixColumn}>
                            <FontAwesomeIcon icon={faPlus} /> Add Column
                          </button>
                          <button type="button" className="btn-add-variant" onClick={addMatrixRow}>
                            <FontAwesomeIcon icon={faPlus} /> Add Row
                          </button>
                        </div>
                      </div>

                      {variants.length === 0 && (
                        <div className="empty-variants">
                          <p>No variants found for this product.</p>
                        </div>
                      )}

                      <div className="variants-table-wrapper">
                        <table className="variants-table">
                          <thead>
                            <tr>
                              {/* Render attribute columns first (Matrix Mode style) */}
                              {variantMatrix.columns.map((col, ci) => (
                                <th key={`attr-col-${col.id || ci}`} className="matrix-column-header">
                                  <div className="matrix-column-header-content">
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                        <select
                                          value={col.attributeName || ""}
                                          onChange={(e) => {
                                            if (e.target.value !== "__new__") {
                                              updateMatrixColumnName(col.id, e.target.value);
                                              setNewAttributeInputs(prev => {
                                                const newInputs = { ...prev };
                                                delete newInputs[col.id];
                                                return newInputs;
                                              });
                                            } else {
                                              setNewAttributeInputs(prev => ({ ...prev, [col.id]: "" }));
                                            }
                                          }}
                                          className={`matrix-attribute-select ${matrixErrors[`column-${col.id}`] ? "error" : ""}`}
                                        >
                                          <option value="">Select Attribute</option>
                                          {availableAttributeNames.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                          ))}
                                          <option value="__new__">+ Create New Attribute</option>
                                        </select>
                                        {newAttributeInputs[col.id] !== undefined && (
                                          <div style={{ display: "flex", gap: "4px", flex: 1, alignItems: "center" }}>
                                            <input
                                              type="text"
                                              value={newAttributeInputs[col.id] || ""}
                                              onChange={(e) => setNewAttributeInputs(prev => ({ ...prev, [col.id]: e.target.value }))}
                                              onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const newName = newAttributeInputs[col.id]?.trim();
                                                  if (newName) {
                                                    updateMatrixColumnName(col.id, newName);
                                                    setNewAttributeInputs(prev => {
                                                      const newInputs = { ...prev };
                                                      delete newInputs[col.id];
                                                      return newInputs;
                                                    });
                                                  }
                                                }
                                              }}
                                              onBlur={() => {
                                                const newName = newAttributeInputs[col.id]?.trim();
                                                if (newName) {
                                                  updateMatrixColumnName(col.id, newName);
                                                }
                                                setNewAttributeInputs(prev => {
                                                  const newInputs = { ...prev };
                                                  delete newInputs[col.id];
                                                  return newInputs;
                                                });
                                              }}
                                              placeholder="Enter new attribute name"
                                              className={`matrix-attribute-input-new ${matrixErrors[`column-${col.id}`] ? "error" : ""}`}
                                              autoFocus
                                            />
                                            <button
                                              type="button"
                                              className="btn-confirm-new-attribute"
                                              onClick={() => {
                                                const newName = newAttributeInputs[col.id]?.trim();
                                                if (newName) {
                                                  updateMatrixColumnName(col.id, newName);
                                                }
                                                setNewAttributeInputs(prev => {
                                                  const newInputs = { ...prev };
                                                  delete newInputs[col.id];
                                                  return newInputs;
                                                });
                                              }}
                                              title="Confirm"
                                            >
                                              <FontAwesomeIcon icon={faCheck} />
                                            </button>
                                            <button
                                              type="button"
                                              className="btn-cancel-new-attribute"
                                              onClick={() => {
                                                setNewAttributeInputs(prev => {
                                                  const newInputs = { ...prev };
                                                  delete newInputs[col.id];
                                                  return newInputs;
                                                });
                                              }}
                                              title="Cancel"
                                            >
                                              <FontAwesomeIcon icon={faTimes} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {matrixErrors[`column-${col.id}`] && (
                                        <span className="matrix-error-message">{matrixErrors[`column-${col.id}`]}</span>
                                      )}
                                    </div>
                                    {variantMatrix.columns.length > 1 && (
                                      <button
                                        type="button"
                                        className="btn-remove-column"
                                        onClick={() => removeMatrixColumn(col.id)}
                                        title="Remove column"
                                      >
                                        <FontAwesomeIcon icon={faTimes} />
                                      </button>
                                    )}
                                  </div>
                                </th>
                              ))}
                              <th className="matrix-price-header">Price (₹)</th>
                              <th className="matrix-sku-header">SKU</th>
                              <th className="matrix-stock-header">Stock</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map((variant, idx) => (
                              <tr key={`existing-variant-${variant.id || idx}`} className={emptyVariantIndices.includes(idx) ? 'variant-row-empty' : ''}>
                                {/* Render one cell per attribute column so values align with matrix columns */}
                                {variantMatrix.columns.map((col, ci) => (
                                  <td key={`existing-attr-${idx}-${col.id || ci}`}>
                                    <input
                                      type="text"
                                      placeholder={col.attributeName ? 'Enter value' : `Attr ${ci + 1}`}
                                      value={(() => {
                                        const a = (variant.attributes || []).find(x => x.name === (col.attributeName || ""));
                                        return a ? (a.value || "") : "";
                                      })()}
                                      onChange={e => {
                                        const name = col.attributeName || "";
                                        updateVariantAttributeByName(idx, name, e.target.value);
                                      }}
                                      className="matrix-cell-input"
                                    />
                                  </td>
                                ))}

                                <td className="matrix-cell">
                                  <input
                                    type="number"
                                    value={variant.price}
                                    onChange={e => updateVariantField(idx, 'price', e.target.value)}
                                    className="matrix-cell-input"
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td className="matrix-cell">
                                  <input
                                    type="text"
                                    value={variant.sku || ""}
                                    onChange={e => updateVariantField(idx, 'sku', e.target.value)}
                                    className="matrix-cell-input"
                                  />
                                </td>
                                <td className="matrix-cell">
                                  <input
                                    type="number"
                                    value={variant.stock}
                                    onChange={e => updateVariantField(idx, 'stock', e.target.value)}
                                    className="matrix-cell-input"
                                    min="0"
                                  />
                                </td>

                                <td className="actions-cell">
                                  <button
                                    type="button"
                                    className="btn-save-variant"
                                    onClick={() => saveVariant(idx)}
                                    disabled={savingProduct || deletingVariantIndex === idx}
                                  >
                                    {deletingVariantIndex === idx ? "Deleting..." : savingProduct ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-delete-variant"
                                    onClick={() => {
                                      const variantId = variant.id;
                                      // If variant exists on server, call delete handler with index, otherwise remove locally
                                      if (variantId) {
                                        handleDeleteVariant(variantId, editProduct && editProduct.id, idx);
                                      } else {
                                        setVariants(prev => prev.filter((_, i) => i !== idx));
                                        setMessage("Variant removed.");
                                      }
                                    }}
                                    disabled={deletingVariantIndex === idx}
                                  >
                                    {deletingVariantIndex === idx ? "Deleting..." : "Delete"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                  {/* OLD VARIANT MODE (Hidden for now, kept for reference) */}
                  <div className="variants-section" style={{ display: "none" }}>
                    <div className="variants-section-header">
                      <h3>Add Variants</h3>
                      <button type="button" className="btn-add-variant" onClick={addVariant}>
                        <FontAwesomeIcon icon={faPlus} /> Add Variant
                      </button>
                    </div>

                    {variants.length === 0 && (
                      <div className="empty-variants">
                        <p>No variants added yet. Click "Add Variant" to create your first variant.</p>
                      </div>
                    )}

                    <div className="variants-list">
                      {variants.map((variant, index) => (
                        <div key={`variant-${index}`} className="variant-card-improved">
                    <div className="variant-card-header-improved">
                      <div className="variant-number">
                        <span className="variant-number-badge">{index + 1}</span>
                        <span className="variant-card-title">Variant {index + 1}</span>
                      </div>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-variant"
                          onClick={() => removeVariant(index)}
                          title="Remove this variant"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>

                    <div className="variant-basic-fields">
                      <div className="variant-field-group">
                        <label className="variant-field-label">SKU *</label>
                        <input
                          type="text"
                          placeholder="e.g. PROD-001"
                          value={variant.sku}
                          onChange={e => updateVariant(index, "sku", e.target.value)}
                          className="variant-input"
                        />
                      </div>
                      <div className="variant-field-group">
                        <label className="variant-field-label">Price (₹) *</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={variant.price}
                          onChange={e => updateVariant(index, "price", e.target.value)}
                          className="variant-input"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="variant-field-group">
                        <label className="variant-field-label">Stock *</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={variant.stock}
                          onChange={e => updateVariant(index, "stock", e.target.value)}
                          className="variant-input"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="variant-attributes-section">
                      <div className="variant-attributes-header">
                        <label className="variant-section-label">Attributes (Optional)</label>
                        <button 
                          type="button" 
                          className="btn-add-attribute"
                          onClick={() => addAttribute(index)}
                        >
                          <FontAwesomeIcon icon={faPlus} /> Add Attribute
                        </button>
                      </div>
                      
                      {variant.attributes && variant.attributes.length > 0 ? (
                        <div className="attributes-list">
                          {variant.attributes.map((attr, j) => (
                            <div key={j} className="attribute-row">
                              <input
                                type="text"
                                placeholder="Attribute Name (e.g. Size, Color)"
                                value={attr.name}
                                onChange={e => updateVariantAttribute(index, j, "name", e.target.value)}
                                className="attribute-input attribute-name-input"
                              />
                              <input
                                type="text"
                                placeholder="Value (e.g. 250ml, Red)"
                                value={attr.value}
                                onChange={e => updateVariantAttribute(index, j, "value", e.target.value)}
                                className="attribute-input attribute-value-input"
                              />
                              <button
                                type="button"
                                className="btn-remove-attribute"
                                onClick={() => {
                                  const newAttrs = variant.attributes.filter((_, i) => i !== j);
                                  updateVariant(index, "attributes", newAttrs);
                                }}
                                title="Remove attribute"
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-attributes-hint">No attributes added. Attributes like Size, Color, Material, etc. are optional.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
                </div>

                <div className="product-form-actions">
                  <button type="submit" disabled={savingProduct} className="btn-submit-product">
                    <FontAwesomeIcon icon={editProduct ? faEdit : faPlus} /> {savingProduct ? "Saving..." : editProduct ? "Update Product" : "Create Product"}
                  </button>

                  {emptyVariantIndices.length > 0 && (
                    <button
                      type="button"
                      className="btn-ignore-empty"
                      onClick={async () => {
                        setConfirmIgnoreEmpty(true);
                        setMessage("Proceeding while ignoring empty variant rows...");
                        await performSubmit(true);
                      }}
                    >
                      Ignore empty variants and submit
                    </button>
                  )}

                  {editProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditProduct(null);
                        setProductForm({
                          categoryName: "",
                          name: "",
                          description: "",
                          image: null
                        });
                        setVariants([buildEmptyVariant()]);
                        setGalleryFiles([]);
                        setExistingImages([]);
                      }}
                      className="btn-cancel-edit"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {activeTab === "manage" && (
            <section className="admin-card">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ marginBottom: '20px' }}>Manage Products</h2>
                <div className="manage-filters-improved">
                  <div className="search-input-wrapper">
                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search products by name..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <select
                    value={manageCategoryFilter}
                    onChange={e => setManageCategoryFilter(e.target.value)}
                    className="category-filter-select"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredManageProducts.length === 0 ? (
                <div className="empty-state">
                  <p>No products found. {productSearch || manageCategoryFilter ? 'Try adjusting your filters.' : 'Create a product to get started.'}</p>
                </div>
              ) : (
                <div className="products-grid">
                  {filteredManageProducts.map(p => {
                    const image = p.image?.startsWith("http")
                      ? p.image
                        : `${API_BASE}${p.image}`;
                    return (
                      <div key={p.id} className="product-card">
                        <div className="product-card-header">
                          <div className="product-image-wrapper">
                            <img src={image} alt={p.name} className="product-card-image" />
                            <span className={`status-badge ${p.isActive ? "status-active" : "status-inactive"}`}>
                              {p.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                        <div className="product-card-body">
                          <h3 className="product-card-title">{p.name}</h3>
                          <p className="product-card-category">{p.categoryName || "Uncategorised"}</p>
                          {p.variants && p.variants.length > 0 && (
                            <div className="product-variants-info">
                              <span className="variants-count">{p.variants.length} Variant{p.variants.length !== 1 ? 's' : ''}</span>
                              <div className="variant-list-mini">
                                {p.variants.slice(0, 3).map(v => (
                                  <span key={v.id} className="variant-tag">
                                    {v.sku} - ₹{v.price}
                                  </span>
                                ))}
                                {p.variants.length > 3 && (
                                  <span className="variant-tag">+{p.variants.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="product-card-actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                startEditProduct(p);
                              } catch (error) {
                                console.error("Error in edit button click:", error);
                                setMessage("Error loading product for editing: " + (error.message || "Unknown error"));
                              }
                            }}
                          >
                            <FontAwesomeIcon icon={faEdit} /> Edit
                          </button>
                          <button
                            type="button"
                            className={`btn-status ${p.isActive ? "btn-deactivate" : "btn-activate"}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                toggleStatus(p);
                              } catch (error) {
                                console.error("Error in toggle status:", error);
                                setMessage("Error updating product status: " + (error.message || "Unknown error"));
                              }
                            }}
                          >
                            {p.isActive ? (
                              <>
                                <FontAwesomeIcon icon={faTimes} /> Deactivate
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faCheck} /> Activate
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                handleDeleteProduct(p.id);
                              } catch (error) {
                                console.error("Error in delete button click:", error);
                                setMessage("Error deleting product: " + (error.message || "Unknown error"));
                              }
                            }}
                          >
                            <FontAwesomeIcon icon={faTrash} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "orders" && (
            <section className="admin-card">
              <h2>All Orders</h2>
              <div className="manage-filters" style={{ marginBottom: "20px" }}>
                <input
                  type="text"
                  placeholder="Search by Order ID..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                />
              </div>
              {loadingOrders ? (
                <div style={{ padding: "20px", textAlign: "center" }}>Loading orders...</div>
              ) : (
                (() => {
                  const filteredOrders = orderSearch 
                    ? orders.filter(order => order.id.toString().includes(orderSearch))
                    : orders;
                  
                  return filteredOrders.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                      No orders found.
                    </div>
                  ) : (
                    <div className="orders-table-container">
                      <table className="orders-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(order => {
                        const billingData = order.billing_data ? 
                          (typeof order.billing_data === 'string' ? JSON.parse(order.billing_data) : order.billing_data) 
                          : {};
                        const customerName = billingData.firstName && billingData.lastName 
                          ? `${billingData.firstName} ${billingData.lastName}`
                          : order.user_name || billingData.email || "N/A";
                        
                        return (
                          <tr key={order.id}>
                            <td>
                              <span 
                                className="order-id-link"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderModal(true);
                                }}
                                style={{ cursor: "pointer", color: "#00ACEE", textDecoration: "underline" }}
                              >
                                #{order.id}
                              </span>
                            </td>
                            <td>
                              <div className="customer-info">
                                <div className="customer-name">{customerName}</div>
                                {(billingData.email || order.user_email) && (
                                  <div className="customer-email">{billingData.email || order.user_email}</div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="order-items-preview">
                                {order.items && order.items.length > 0 ? (
                                  <>
                                    <span>{order.items.length} item(s)</span>
                                    <div className="items-list">
                                      {order.items.slice(0, 2).map((item, idx) => (
                                        <div key={idx} className="item-preview">
                                          {item.productName} × {item.qty}
                                        </div>
                                      ))}
                                      {order.items.length > 2 && (
                                        <div className="item-preview">+{order.items.length - 2} more</div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  "No items"
                                )}
                              </div>
                            </td>
                            <td className="order-total-cell">₹{parseFloat(order.total_amount || order.total || 0).toFixed(2)}</td>
                            <td>
                              <select 
                                className={`status-select status-${order.status?.toLowerCase() || 'pending'}`}
                                value={order.status || 'pending'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  if (newStatus === "cancelled") {
                                    setPendingCancelOrder({ id: order.id, currentStatus: order.status });
                                    setCancellationReason("");
                                    setShowCancelModal(true);
                                  } else {
                                    try {
                                      await api.updateOrderStatus(order.id, newStatus);
                                      loadOrders();
                                      setMessage("Order status updated successfully.");
                                    } catch (err) {
                                      setMessage(err.message || "Failed to update order status.");
                                    }
                                  }
                                }}
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td>
                              <div className="payment-info">
                                <span className="payment-method">{order.payment_method || "N/A"}</span>
                                {order.payment_proof && (
                                  <span 
                                    className="payment-proof-badge"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      let proofUrl;
                                      if (order.payment_proof.startsWith("http")) {
                                        proofUrl = order.payment_proof;
                                      } else if (order.payment_proof.startsWith("/")) {
                                        proofUrl = process.env.NODE_ENV === "production"
                                          ? `${API_BASE}/backend${order.payment_proof}`
                                          : `${API_BASE}${order.payment_proof}`;
                                      } else {
                                        proofUrl = process.env.NODE_ENV === "production"
                                          ? `${API_BASE}/backend/${order.payment_proof}`
                                          : `${API_BASE}/${order.payment_proof}`;
                                      }
                                      window.open(proofUrl, '_blank');
                                    }}
                                    style={{ cursor: "pointer" }}
                                    title="Click to view payment proof"
                                  >
                                    Proof
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                  );
                })()
              )}
            </section>
          )}

          {/* Order Details Modal */}
          {showOrderModal && selectedOrder && (
            <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
              <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Order Details - #{selectedOrder.id}</h2>
                  <button className="modal-close" onClick={() => setShowOrderModal(false)}>×</button>
                </div>
                
                <div className="modal-body">
                  {(() => {
                    const billingData = selectedOrder.billing_data ? 
                      (typeof selectedOrder.billing_data === 'string' ? JSON.parse(selectedOrder.billing_data) : selectedOrder.billing_data) 
                      : {};
                    
                    return (
                      <>
                        {/* Order Information */}
                        <div className="order-detail-section">
                          <h3>Order Information</h3>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Order ID:</span>
                              <span className="detail-value">#{selectedOrder.id}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Order Date:</span>
                              <span className="detail-value">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Status:</span>
                              <select 
                                className={`status-select status-${selectedOrder.status?.toLowerCase() || 'pending'}`}
                                value={selectedOrder.status || 'pending'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  if (newStatus === "cancelled") {
                                    setPendingCancelOrder({ id: selectedOrder.id, currentStatus: selectedOrder.status });
                                    setCancellationReason("");
                                    setShowCancelModal(true);
                                  } else {
                                    try {
                                      await api.updateOrderStatus(selectedOrder.id, newStatus);
                                      loadOrders();
                                      setSelectedOrder({...selectedOrder, status: newStatus});
                                      setMessage("Order status updated successfully.");
                                    } catch (err) {
                                      setMessage(err.message || "Failed to update order status.");
                                    }
                                  }
                                }}
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Payment Method:</span>
                              <span className="detail-value">{selectedOrder.payment_method || "N/A"}</span>
                            </div>
                            {selectedOrder.payment_proof && (
                              <div className="detail-item full-width">
                                <span className="detail-label">Payment Proof:</span>
                                <span className="detail-value">
                                  <button 
                                    className="view-proof-btn"
                                    onClick={() => {
                                      let proofUrl;
                                      if (selectedOrder.payment_proof.startsWith("http")) {
                                        proofUrl = selectedOrder.payment_proof;
                                      } else if (selectedOrder.payment_proof.startsWith("/")) {
                                        proofUrl = process.env.NODE_ENV === "production"
                                          ? `${API_BASE}/backend${selectedOrder.payment_proof}`
                                          : `${API_BASE}${selectedOrder.payment_proof}`;
                                      } else {
                                        proofUrl = process.env.NODE_ENV === "production"
                                          ? `${API_BASE}/backend/${selectedOrder.payment_proof}`
                                          : `${API_BASE}/${selectedOrder.payment_proof}`;
                                      }
                                      window.open(proofUrl, '_blank');
                                    }}
                                  >
                                    View Payment Proof
                                  </button>
                                  <span className="proof-filename">{selectedOrder.payment_proof.split('/').pop()}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Customer Information */}
                        <div className="order-detail-section">
                          <h3>Customer Information</h3>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Name:</span>
                              <span className="detail-value">
                                {billingData.firstName && billingData.lastName 
                                  ? `${billingData.firstName} ${billingData.lastName}`
                                  : selectedOrder.user_name || billingData.email || "N/A"}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Email:</span>
                              <span className="detail-value">{billingData.email || selectedOrder.user_email || "N/A"}</span>
                            </div>
                            {billingData.phone && (
                              <div className="detail-item">
                                <span className="detail-label">Phone:</span>
                                <span className="detail-value">{billingData.phone}</span>
                              </div>
                            )}
                            {billingData.gst && (
                              <div className="detail-item">
                                <span className="detail-label">GST Number:</span>
                                <span className="detail-value">{billingData.gst}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Billing Address */}
                        {(billingData.address1 || billingData.address2 || billingData.city || billingData.state || billingData.zip || billingData.postcode || billingData.country) && (
                          <div className="order-detail-section">
                            <h3>Billing Address</h3>
                            <div className="detail-grid">
                              {(billingData.address1 || billingData.address2) && (
                                <div className="detail-item full-width">
                                  <span className="detail-label">Address:</span>
                                  <span className="detail-value">
                                    {[billingData.address1, billingData.address2].filter(Boolean).join(", ")}
                                  </span>
                                </div>
                              )}
                              {(billingData.city || billingData.state || billingData.zip || billingData.postcode) && (
                                <div className="detail-item full-width">
                                  <span className="detail-label">City, State, ZIP:</span>
                                  <span className="detail-value">
                                    {[billingData.city, billingData.state, billingData.zip || billingData.postcode].filter(Boolean).join(", ")}
                                  </span>
                                </div>
                              )}
                              {billingData.country && (
                                <div className="detail-item">
                                  <span className="detail-label">Country:</span>
                                  <span className="detail-value">{billingData.country}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Order Items */}
                        <div className="order-detail-section">
                          <h3>Order Items</h3>
                          <div className="order-items-detail">
                            {selectedOrder.items && selectedOrder.items.length > 0 ? (
                              selectedOrder.items.map((item, idx) => {
                                const imageUrl = item.image?.startsWith("http")
                                  ? item.image
                                    : `${API_BASE}${item.image}`;
                                const itemTotal = parseFloat(item.price) * item.qty;
                                
                                return (
                                  <div key={idx} className="order-item-detail">
                                    {item.image && (
                                      <img src={imageUrl || "/placeholder.png"} alt={item.productName} className="order-item-image" />
                                    )}
                                    <div className="order-item-info">
                                      <div className="order-item-name">{item.productName}</div>
                                      {item.variantSku && (
                                        <div className="order-item-sku">SKU: {item.variantSku}</div>
                                      )}
                                      {item.attributes && item.attributes.length > 0 && (
                                        <div className="order-item-attributes">
                                          {item.attributes.map((attr, attrIdx) => (
                                            <span key={attrIdx} className="attribute-tag">
                                              {attr.name}: {attr.value}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <div className="order-item-qty-price">
                                        <span>Quantity: {item.qty}</span>
                                        <span>Price: ₹{parseFloat(item.price).toFixed(2)}</span>
                                        <span className="order-item-total">Subtotal: ₹{itemTotal.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div>No items found</div>
                            )}
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div className="order-detail-section">
                          <h3>Order Summary</h3>
                          <div className="order-summary">
                            <div className="summary-row">
                              <span className="summary-label">Subtotal:</span>
                              <span className="summary-value">₹{parseFloat(selectedOrder.total_amount || selectedOrder.total || 0).toFixed(2)}</span>
                            </div>
                            <div className="summary-row total-row">
                              <span className="summary-label">Total Amount:</span>
                              <span className="summary-value">₹{parseFloat(selectedOrder.total_amount || selectedOrder.total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Order Notes */}
                        {(selectedOrder.notes || (billingData && billingData.notes)) && (
                          <div className="order-detail-section">
                            <h3>Notes</h3>
                            <div className="order-notes">
                              <p className="notes-text">{selectedOrder.notes || (billingData && billingData.notes) || 'No notes available'}</p>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

        {/* Cancellation Reason Modal */}
        {showCancelModal && (
          <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
            <div className="modal-content cancel-reason-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Cancel Order</h2>
                <button className="modal-close" onClick={() => setShowCancelModal(false)}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="modal-body">
                <p>Please provide a reason for cancelling this order:</p>
                <textarea
                  className="cancel-reason-input"
                  placeholder="Enter cancellation reason..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows="5"
                />
              </div>
              <div className="modal-footer">
                <button 
                  className="btn-cancel-modal"
                  onClick={() => {
                    setShowCancelModal(false);
                    setPendingCancelOrder(null);
                    setCancellationReason("");
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-confirm-cancel"
                  onClick={async () => {
                    if (!cancellationReason.trim()) {
                      setMessage("Please provide a cancellation reason.");
                      return;
                    }
                    try {
                      await api.updateOrderStatus(pendingCancelOrder.id, "cancelled", cancellationReason.trim());
                      loadOrders();
                      if (selectedOrder && selectedOrder.id === pendingCancelOrder.id) {
                        setSelectedOrder({...selectedOrder, status: "cancelled", cancellation_reason: cancellationReason.trim()});
                      }
                      setMessage("Order cancelled successfully.");
                      setShowCancelModal(false);
                      setPendingCancelOrder(null);
                      setCancellationReason("");
                    } catch (err) {
                      setMessage(err.message || "Failed to cancel order.");
                    }
                  }}
                  disabled={!cancellationReason.trim()}
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

