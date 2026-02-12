import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminPanel.css";
import { api, API_BASE } from "../../api";
import { Editor } from "@tinymce/tinymce-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit, faPlus, faSearch, faBox, faList, faReceipt, faCheck, faTimes, faExclamationTriangle, faDownload } from '@fortawesome/free-solid-svg-icons';

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
    additionalDescription: "",
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
  const [selectedVariantIds, setSelectedVariantIds] = useState([]);
  const [deletingVariants, setDeletingVariants] = useState(false);
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
  const [existingProductImage, setExistingProductImage] = useState(null);
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
    
    // Get the old attribute name before updating
    const oldColumn = variantMatrix.columns.find(col => col.id === columnId);
    const oldAttributeName = oldColumn ? oldColumn.attributeName : "";
    
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

    // If this is an edit session, update variant attributes to preserve values when column name changes
    if (editProduct && oldAttributeName !== trimmedName) {
      setVariants(prev => prev.map(v => {
        const attrs = (v.attributes || []).map(attr => {
          // If this attribute matches the old column name, update it to the new name while preserving value
          if (attr.name === oldAttributeName) {
            return { ...attr, name: trimmedName };
          }
          return attr;
        });
        
        // If the old attribute name existed but we didn't find it (edge case), or if it's a new attribute
        const hadOldAttr = (v.attributes || []).some(a => a.name === oldAttributeName);
        const hasNewAttr = attrs.some(a => a.name === trimmedName);
        
        if (!hadOldAttr && trimmedName && !hasNewAttr) {
          // Add new attribute if it didn't exist before
          attrs.push({ name: trimmedName, value: "" });
        }
        
        return { ...v, attributes: attrs };
      }));
    } else if (trimmedName && editProduct) {
      // If no old name (new column), add this attribute to variants that don't have it
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

  // Parse CSV and populate variant matrix
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.csv'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      setMessage("Invalid file type. Please upload a CSV file (.csv extension required).");
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setMessage(`File size too large. Maximum file size is 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      e.target.value = '';
      return;
    }

    // Validate MIME type if available
    if (file.type && !file.type.includes('csv') && !file.type.includes('text') && file.type !== 'application/vnd.ms-excel') {
      setMessage("Invalid file type. Please upload a valid CSV file.");
      e.target.value = '';
      return;
    }

    // Reset file input
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length < 2) {
          setMessage("CSV file must have at least a header row and one data row.");
          return;
        }

        // Parse CSV (handle quoted values and commas)
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headerRow = parseCSVLine(lines[0]);
        
        // Validate header row
        if (headerRow.length === 0 || headerRow.every(h => !h || h.trim() === '')) {
          setMessage("CSV file has an invalid or empty header row. Please check your file format.");
          return;
        }

        const dataRows = lines.slice(1).map(parseCSVLine);

        // Validate that all rows have the same number of columns as header
        const expectedColumnCount = headerRow.length;
        const invalidRows = dataRows.filter((row, idx) => row.length !== expectedColumnCount);
        if (invalidRows.length > 0) {
          setMessage(`CSV file has inconsistent column counts. Row ${dataRows.indexOf(invalidRows[0]) + 2} has ${invalidRows[0].length} columns but header has ${expectedColumnCount} columns.`);
          return;
        }

        // Identify columns: attributes vs metadata (Price, SKU, Stock)
        const metadataColumns = ['price', 'sku', 'stock'];
        const attributeColumns = [];
        const metadataIndices = {};

        headerRow.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().trim();
          if (metadataColumns.includes(normalizedHeader)) {
            metadataIndices[normalizedHeader] = index;
          } else {
            attributeColumns.push({ index, name: header.trim() });
          }
        });

        if (attributeColumns.length === 0) {
          setMessage("CSV must have at least one attribute column (e.g., Size, Color, Material). Price, SKU, and Stock columns are optional.");
          return;
        }

        // Build matrix columns from attribute columns
        const newColumns = attributeColumns.map((col, idx) => ({
          id: idx + 1,
          attributeName: col.name,
          values: []
        }));

        // Build matrix rows from data rows
        const newRows = dataRows.map((row, rowIdx) => {
          const values = {};
          let price = '';
          let sku = '';
          let stock = '';

          // Map attribute values
          attributeColumns.forEach((attrCol, colIdx) => {
            const value = row[attrCol.index] || '';
            values[colIdx + 1] = value;
          });

          // Extract metadata
          if (metadataIndices.price !== undefined) {
            price = row[metadataIndices.price] || '';
          }
          if (metadataIndices.sku !== undefined) {
            sku = row[metadataIndices.sku] || '';
          }
          if (metadataIndices.stock !== undefined) {
            stock = row[metadataIndices.stock] || '';
          }

          return {
            id: rowIdx + 1,
            values: values,
            price: price,
            sku: sku,
            stock: stock
          };
        });

        // Update matrix
        setVariantMatrix({
          columns: newColumns.length > 0 ? newColumns : [{ id: 1, attributeName: "", values: [] }],
          rows: newRows.length > 0 ? newRows : [{ id: 1, values: { 1: "" }, price: "", sku: "", stock: "" }]
        });

        // Add new attribute names to available list
        attributeColumns.forEach(col => {
          if (col.name && !availableAttributeNames.includes(col.name)) {
            setAvailableAttributeNames(prev => [...prev, col.name].sort());
          }
        });

        setMessage(`Successfully imported ${newRows.length} variant(s) from CSV with ${newColumns.length} attribute(s).`);
      } catch (err) {
        console.error("CSV parsing error:", err);
        setMessage(`Failed to parse CSV: ${err.message || "Invalid CSV format"}`);
      }
    };

    reader.onerror = () => {
      setMessage("Failed to read CSV file.");
    };

    reader.readAsText(file);
  };

  // Download variant matrix as CSV
  const handleCSVDownload = () => {
    try {
      // Build header row: attribute columns + Price, SKU, Stock
      const headers = [
        ...variantMatrix.columns.map(col => col.attributeName || ''),
        'Price',
        'SKU',
        'Stock'
      ].filter(h => h !== ''); // Remove empty headers

      // Build data rows
      const rows = variantMatrix.rows.map(row => {
        const rowData = [];
        
        // Add attribute values
        variantMatrix.columns.forEach(col => {
          const value = row.values[col.id] || '';
          // Escape commas and quotes in CSV
          const escapedValue = value.includes(',') || value.includes('"') || value.includes('\n')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
          rowData.push(escapedValue);
        });
        
        // Add metadata
        rowData.push(row.price || '');
        rowData.push(row.sku || '');
        rowData.push(row.stock || '');
        
        return rowData;
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `variants_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage(`CSV file downloaded successfully with ${rows.length} variant(s).`);
    } catch (err) {
      console.error("CSV download error:", err);
      setMessage(`Failed to download CSV: ${err.message || "Unknown error"}`);
    }
  };

  // Download existing variants as CSV (for edit mode)
  const handleExistingVariantsCSVDownload = () => {
    try {
      if (variants.length === 0) {
        setMessage("No variants to download.");
        return;
      }

      // Get all unique attribute names from variants
      const attributeNames = Array.from(
        new Set(
          variants.flatMap(v => (v.attributes || []).map(a => a.name).filter(Boolean))
        )
      );

      // Build header row: attribute columns + Price, SKU, Stock
      const headers = [
        ...attributeNames,
        'Price',
        'SKU',
        'Stock'
      ];

      // Build data rows
      const rows = variants.map(variant => {
        const rowData = [];
        
        // Add attribute values in the same order as headers
        attributeNames.forEach(attrName => {
          const attr = (variant.attributes || []).find(a => a.name === attrName);
          const value = attr ? attr.value : '';
          // Escape commas and quotes in CSV
          const escapedValue = value.includes(',') || value.includes('"') || value.includes('\n')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
          rowData.push(escapedValue);
        });
        
        // Add metadata
        rowData.push(variant.price || '');
        rowData.push(variant.sku || '');
        rowData.push(variant.stock || '');
        
        return rowData;
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `existing_variants_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage(`CSV file downloaded successfully with ${rows.length} variant(s).`);
    } catch (err) {
      console.error("CSV download error:", err);
      setMessage(`Failed to download CSV: ${err.message || "Unknown error"}`);
    }
  };

  // Upload CSV for existing variants (for edit mode)
  const handleExistingVariantsCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.csv'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      setMessage("Invalid file type. Please upload a CSV file (.csv extension required).");
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setMessage(`File size too large. Maximum file size is 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      e.target.value = '';
      return;
    }

    // Validate MIME type if available
    if (file.type && !file.type.includes('csv') && !file.type.includes('text') && file.type !== 'application/vnd.ms-excel') {
      setMessage("Invalid file type. Please upload a valid CSV file.");
      e.target.value = '';
      return;
    }

    // Reset file input
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length < 2) {
          setMessage("CSV file must have at least a header row and one data row.");
          return;
        }

        // Parse CSV (handle quoted values and commas)
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headerRow = parseCSVLine(lines[0]);
        
        // Validate header row
        if (headerRow.length === 0 || headerRow.every(h => !h || h.trim() === '')) {
          setMessage("CSV file has an invalid or empty header row. Please check your file format.");
          return;
        }

        const dataRows = lines.slice(1).map(parseCSVLine);

        // Validate that all rows have the same number of columns as header
        const expectedColumnCount = headerRow.length;
        const invalidRows = dataRows.filter((row, idx) => row.length !== expectedColumnCount);
        if (invalidRows.length > 0) {
          setMessage(`CSV file has inconsistent column counts. Row ${dataRows.indexOf(invalidRows[0]) + 2} has ${invalidRows[0].length} columns but header has ${expectedColumnCount} columns.`);
          return;
        }

        // Identify columns: attributes vs metadata (Price, SKU, Stock)
        const metadataColumns = ['price', 'sku', 'stock'];
        const attributeColumns = [];
        const metadataIndices = {};

        headerRow.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().trim();
          if (metadataColumns.includes(normalizedHeader)) {
            metadataIndices[normalizedHeader] = index;
          } else {
            attributeColumns.push({ index, name: header.trim() });
          }
        });

        if (attributeColumns.length === 0) {
          setMessage("CSV must have at least one attribute column (e.g., Size, Color, Material). Price, SKU, and Stock columns are optional.");
          return;
        }

        // Convert CSV rows to variant format
        const newVariants = dataRows.map((row, rowIdx) => {
          const attributes = attributeColumns
            .filter(attrCol => row[attrCol.index] && row[attrCol.index].trim() !== '')
            .map(attrCol => ({
              name: attrCol.name,
              value: row[attrCol.index] || ''
            }));

          const variant = {
            sku: metadataIndices.sku !== undefined ? (row[metadataIndices.sku] || '') : '',
            price: metadataIndices.price !== undefined ? (row[metadataIndices.price] || 0) : 0,
            stock: metadataIndices.stock !== undefined ? (row[metadataIndices.stock] || 0) : 0,
            attributes: attributes
          };

          // Preserve existing variant ID if we're updating (match by index or SKU)
          if (variants[rowIdx] && variants[rowIdx].id) {
            variant.id = variants[rowIdx].id;
          }

          return variant;
        });

        // Update variants state
        setVariants(newVariants.length > 0 ? newVariants : [buildEmptyVariant()]);

        // Update matrix columns to match attribute names
        const attributeNames = attributeColumns.map(col => col.name);
        if (attributeNames.length > 0) {
          setVariantMatrix(prev => ({
            ...prev,
            columns: attributeNames.map((name, idx) => ({
              id: idx + 1,
              attributeName: name,
              values: []
            }))
          }));
        }

        // Add new attribute names to available list
        attributeColumns.forEach(col => {
          if (col.name && !availableAttributeNames.includes(col.name)) {
            setAvailableAttributeNames(prev => [...prev, col.name].sort());
          }
        });

        setMessage(`Successfully imported ${newVariants.length} variant(s) from CSV with ${attributeColumns.length} attribute(s).`);
      } catch (err) {
        console.error("CSV parsing error:", err);
        setMessage(`Failed to parse CSV: ${err.message || "Invalid CSV format"}`);
      }
    };

    reader.onerror = () => {
      setMessage("Failed to read CSV file.");
    };

    reader.readAsText(file);
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
      formData.append("additionalDescription", productForm.additionalDescription || "");
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
        additionalDescription: "",
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

  // Handle bulk deletion of variants
  const handleBulkDeleteVariants = async () => {
    if (selectedVariantIds.length === 0) {
      setMessage("Please select at least one variant to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedVariantIds.length} variant(s)? This action cannot be undone.`)) {
      return;
    }

    setDeletingVariants(true);
    try {
      await api.bulkDeleteVariants(selectedVariantIds);
      setMessage(`Successfully deleted ${selectedVariantIds.length} variant(s).`);
      
      // Remove deleted variants from the current variants list
      setVariants(prev => prev.filter(v => !selectedVariantIds.includes(v.id)));
      
      // Clear selection
      setSelectedVariantIds([]);
      
      // Reload products to update the list
      loadProducts();
    } catch (err) {
      console.error("Error bulk deleting variants:", err);
      setMessage(err.message || "Failed to delete variants.");
    } finally {
      setDeletingVariants(false);
    }
  };

  // Handle checkbox toggle for variant selection
  const handleVariantCheckboxChange = (variantId, checked) => {
    if (checked) {
      setSelectedVariantIds(prev => [...prev, variantId]);
    } else {
      setSelectedVariantIds(prev => prev.filter(id => id !== variantId));
    }
  };

  // Handle select all / deselect all
  const handleSelectAllVariants = (checked) => {
    if (checked) {
      // Select all variants that have an ID (existing variants)
      const allVariantIds = variants.filter(v => v.id).map(v => v.id);
      setSelectedVariantIds(allVariantIds);
    } else {
      setSelectedVariantIds([]);
    }
  };

  const copyVariantsFromProduct = async (productId) => {
    if (!productId) return;
    
    const source = products.find(p => p.id === Number(productId));
    if (!source) {
      setMessage("Product not found.");
      return;
    }
    
    try {
      // Fetch the product with full variant data to ensure we have all variants
      const res = await api.getProductForEdit(Number(productId));
      const serverProduct = res.product || {};
      const serverVariants = res.variants || [];
      
      if (serverVariants.length === 0) {
        setMessage(`No variants found in ${source.name}.`);
        return;
      }
      
      // Normalize variants: remove id (since we're creating new variants) and ensure attributes are in array format
      const normalized = serverVariants.map(v => {
        // Convert attributes object to array format if needed
        let attributes = [];
        if (v.attributes) {
          if (Array.isArray(v.attributes)) {
            attributes = v.attributes.map(a => ({ 
              name: a.name || "", 
              value: a.value || "" 
            }));
          } else if (typeof v.attributes === 'object') {
            // Convert object format { Size: "8 inches", Color: "Red" } to array format
            attributes = Object.keys(v.attributes).map(name => ({
              name: name || "",
              value: v.attributes[name] || ""
            }));
          }
        }
        
        return {
          // Don't include id - we're creating new variants
          sku: v.sku || "",
          price: v.price || 0,
          stock: v.stock || 0,
          attributes: attributes
        };
      });
      
      // Deduplicate variants based on attribute combination
      const uniqueVariantsMap = new Map();
      normalized.forEach(v => {
        // Create a unique key based on attributes
        const attrKey = JSON.stringify(
          (v.attributes || [])
            .map(a => `${a.name}:${a.value}`)
            .sort()
            .join('|')
        );
        if (!uniqueVariantsMap.has(attrKey)) {
          uniqueVariantsMap.set(attrKey, v);
        }
      });
      
      const copied = Array.from(uniqueVariantsMap.values());
      
      // If using matrix mode and creating a new product, populate matrix rows
      if (useMatrixMode && !editProduct && copied.length > 0) {
        // Extract unique attribute names from copied variants
        const attributeNames = Array.from(
          new Set(
            copied.flatMap(v => (v.attributes || []).map(a => a.name).filter(Boolean))
          )
        );
        
        // Update matrix columns
        const newColumns = attributeNames.length > 0
          ? attributeNames.map((name, idx) => ({ 
              id: idx + 1, 
              attributeName: name, 
              values: [] 
            }))
          : [{ id: 1, attributeName: "", values: [] }];
        
        // Convert copied variants to matrix rows
        const newRows = copied.map((variant, idx) => {
          const rowId = idx + 1;
          const values = {};
          
          // Map variant attributes to column values
          newColumns.forEach(col => {
            const attr = (variant.attributes || []).find(a => a.name === col.attributeName);
            values[col.id] = attr ? attr.value : "";
          });
          
          return {
            id: rowId,
            values: values,
            price: variant.price || "",
            sku: variant.sku || "",
            stock: variant.stock || ""
          };
        });
        
        setVariantMatrix({
          columns: newColumns,
          rows: newRows.length > 0 ? newRows : [{ id: 1, values: { 1: "" }, price: "", sku: "", stock: "" }]
        });
        
        // Clear variants state since we're using matrix mode
        setVariants([buildEmptyVariant()]);
        
        setMessage(`Copied ${copied.length} variant(s) from ${source.name} into matrix. You can now edit them.`);
      } else {
        // For non-matrix mode or editing, set variants directly
        setVariants(copied.length > 0 ? copied : [buildEmptyVariant()]);
        setMessage(`Copied ${copied.length} variant(s) from ${source.name}. You can now edit them.`);
        
        // If using matrix mode while editing, update columns but don't populate rows
        if (useMatrixMode && editProduct && copied.length > 0) {
          const attributeNames = Array.from(
            new Set(
              copied.flatMap(v => (v.attributes || []).map(a => a.name).filter(Boolean))
            )
          );
          if (attributeNames.length > 0) {
            setVariantMatrix(prev => ({
              ...prev,
              columns: attributeNames.map((name, idx) => ({ 
                id: idx + 1, 
                attributeName: name, 
                values: [] 
              }))
            }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to copy variants:", err);
      setMessage(`Failed to copy variants: ${err.message || "Unknown error"}`);
    }
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
      
      // Set existing product image URL
      const productImageUrl = product.image?.startsWith("http")
        ? product.image
        : product.image
          ? `${API_BASE}${product.image}`
          : null;
      setExistingProductImage(productImageUrl);
      
      setProductForm({
        categoryName: product.categoryName || "",
        name: product.name || "",
        description: product.description || "",
        additionalDescription: product.additionalDescription || "",
        image: null
      });

      // Fetch latest product + variants from server to ensure all variants are loaded
      try {
        const res = await api.getProductForEdit(product.id);
        const serverProduct = res.product || {};
        const serverVariants = res.variants || [];
        
        // Update existing product image URL from server data (overwrite with server data)
        if (serverProduct.image) {
          const serverImageUrl = serverProduct.image?.startsWith("http")
            ? serverProduct.image
            : `${API_BASE}${serverProduct.image}`;
          setExistingProductImage(serverImageUrl);
        }

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
      formData.append("additionalDescription", productForm.additionalDescription || "");
      
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
      setExistingProductImage(null);
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

  // Filter products with low stock (any variant has stock < 10)
  const filteredLowStockProducts = (products || []).filter(p => {
    if (!p || !p.variants || p.variants.length === 0) return false;
    // Check if any variant has stock less than 10
    return p.variants.some(v => {
      const stock = Number(v.stock);
      return !isNaN(stock) && stock < 10;
    });
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
          <button
            className={activeTab === "lowstock" ? "active" : ""}
            onClick={() => setActiveTab("lowstock")}
          >
            <FontAwesomeIcon icon={faExclamationTriangle} /> Low Stock
            {filteredLowStockProducts.length > 0 && (
              <span style={{ 
                marginLeft: '8px', 
                backgroundColor: 'red', 
                color: 'white', 
                borderRadius: '50%', 
                padding: '2px 6px', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {filteredLowStockProducts.length}
              </span>
            )}
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
                          "bullist numlist outdent indent | image link | removeformat | help",
                        branding: false,
                        promotion: false,
                        images_upload_handler: async (blobInfo, progress) => {
                          return new Promise((resolve, reject) => {
                            const formData = new FormData();
                            formData.append('file', blobInfo.blob(), blobInfo.filename());

                            const token = localStorage.getItem("authToken");

                            const xhr = new XMLHttpRequest();
                            xhr.withCredentials = false;
                            xhr.open('POST', `${API_BASE}/api/admin/upload-image`);
                            
                            if (token) {
                              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                            }

                            xhr.upload.onprogress = (e) => {
                              progress(e.loaded / e.total * 100);
                            };

                            xhr.onload = () => {
                              if (xhr.status === 403) {
                                reject({ message: 'HTTP Error: ' + xhr.status, remove: true });
                                return;
                              }

                              if (xhr.status < 200 || xhr.status >= 300) {
                                reject('HTTP Error: ' + xhr.status);
                                return;
                              }

                              const json = JSON.parse(xhr.responseText);

                              if (!json || typeof json.location != 'string') {
                                reject('Invalid JSON: ' + xhr.responseText);
                                return;
                              }

                              resolve(json.location);
                            };

                            xhr.onerror = () => {
                              reject('Image upload failed due to a XHR Transport error. Code: ' + xhr.status);
                            };

                            xhr.send(formData);
                          });
                        },
                        automatic_uploads: true,
                        file_picker_types: 'image',
                        images_file_types: 'jpg,jpeg,png,gif,webp'
                      }}
                      onEditorChange={content =>
                        setProductForm(f => ({ ...f, description: content }))
                      }
                    />
                  </div>

                  <div className="product-form-field">
                    <label className="product-field-label">Additional Description (for Additional Information tab)</label>
                    <Editor
                      value={productForm.additionalDescription || ""}
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
                          "bullist numlist outdent indent | image link | removeformat | help",
                        branding: false,
                        promotion: false,
                        images_upload_handler: async (blobInfo, progress) => {
                          return new Promise((resolve, reject) => {
                            const formData = new FormData();
                            formData.append('file', blobInfo.blob(), blobInfo.filename());

                            const token = localStorage.getItem("authToken");

                            const xhr = new XMLHttpRequest();
                            xhr.withCredentials = false;
                            xhr.open('POST', `${API_BASE}/api/admin/upload-image`);
                            
                            if (token) {
                              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                            }

                            xhr.upload.onprogress = (e) => {
                              progress(e.loaded / e.total * 100);
                            };

                            xhr.onload = () => {
                              if (xhr.status === 403) {
                                reject({ message: 'HTTP Error: ' + xhr.status, remove: true });
                                return;
                              }

                              if (xhr.status < 200 || xhr.status >= 300) {
                                reject('HTTP Error: ' + xhr.status);
                                return;
                              }

                              const json = JSON.parse(xhr.responseText);

                              if (!json || typeof json.location != 'string') {
                                reject('Invalid JSON: ' + xhr.responseText);
                                return;
                              }

                              resolve(json.location);
                            };

                            xhr.onerror = () => {
                              reject('Image upload failed due to a XHR Transport error. Code: ' + xhr.status);
                            };

                            xhr.send(formData);
                          });
                        },
                        automatic_uploads: true,
                        file_picker_types: 'image',
                        images_file_types: 'jpg,jpeg,png,gif,webp'
                      }}
                      onEditorChange={content =>
                        setProductForm(f => ({ ...f, additionalDescription: content }))
                      }
                    />
                    <small style={{ color: '#6b7280', marginTop: '8px', display: 'block' }}>
                      This content will appear in the "Additional Information" tab on the product details page.
                    </small>
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
                      ) : existingProductImage && editProduct ? (
                        <div className="product-image-preview">
                          <img
                            src={existingProductImage}
                            alt="Current product image"
                            className="preview-product-image"
                          />
                          <button
                            type="button"
                            className="remove-product-image-btn"
                            onClick={() => {
                              setExistingProductImage(null);
                              document.getElementById('product-image-input').value = '';
                            }}
                            title="Remove current image (will be removed on save)"
                            style={{ background: 'rgba(255, 193, 7, 0.95)' }}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                          <div style={{ 
                            position: 'absolute', 
                            bottom: '10px', 
                            left: '10px', 
                            right: '10px', 
                            background: 'rgba(0, 0, 0, 0.7)', 
                            color: 'white', 
                            padding: '8px', 
                            borderRadius: '4px',
                            fontSize: '12px',
                            textAlign: 'center'
                          }}>
                            Current image - Upload new to replace
                          </div>
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
                      onChange={async (e) => {
                        const value = e.target.value;
                        if (value) {
                          await copyVariantsFromProduct(value);
                          // Reset select after copying
                          e.target.value = "";
                        }
                      }}
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
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          <button type="button" className="btn-add-column" onClick={addMatrixColumn}>
                            <FontAwesomeIcon icon={faPlus} /> Add Column
                          </button>
                          <button type="button" className="btn-add-variant" onClick={addMatrixRow}>
                            <FontAwesomeIcon icon={faPlus} /> Add Row
                          </button>
                          <label className="btn-upload-csv" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", transition: "background 0.2s" }}>
                            <FontAwesomeIcon icon={faPlus} /> Upload CSV
                            <input
                              type="file"
                              accept=".csv"
                              style={{ display: "none" }}
                              onChange={handleCSVUpload}
                            />
                          </label>
                          <button 
                            type="button" 
                            className="btn-download-csv" 
                            onClick={handleCSVDownload}
                            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", transition: "background 0.2s", cursor: "pointer" }}
                          >
                            <FontAwesomeIcon icon={faDownload} /> Download CSV
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
                              <th className="matrix-price-header">Price ($) *</th>
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
                        <h3>Existing Variants {selectedVariantIds.length > 0 && `(${selectedVariantIds.length} selected)`}</h3>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          {selectedVariantIds.length > 0 && (
                            <button 
                              type="button" 
                              className="btn-delete-selected" 
                              onClick={handleBulkDeleteVariants}
                              disabled={deletingVariants}
                              style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: "8px", 
                                padding: "10px 16px", 
                                background: deletingVariants ? "#9ca3af" : "#dc2626", 
                                color: "#fff", 
                                border: "none", 
                                borderRadius: "6px", 
                                fontSize: "14px", 
                                fontWeight: "500", 
                                transition: "background 0.2s", 
                                cursor: deletingVariants ? "not-allowed" : "pointer" 
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} /> {deletingVariants ? "Deleting..." : `Delete Selected (${selectedVariantIds.length})`}
                            </button>
                          )}
                          <button type="button" className="btn-add-column" onClick={addMatrixColumn}>
                            <FontAwesomeIcon icon={faPlus} /> Add Column
                          </button>
                          <button type="button" className="btn-add-variant" onClick={addMatrixRow}>
                            <FontAwesomeIcon icon={faPlus} /> Add Row
                          </button>
                          <label className="btn-upload-csv" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", transition: "background 0.2s" }}>
                            <FontAwesomeIcon icon={faPlus} /> Upload CSV
                            <input
                              type="file"
                              accept=".csv"
                              style={{ display: "none" }}
                              onChange={handleExistingVariantsCSVUpload}
                            />
                          </label>
                          <button 
                            type="button" 
                            className="btn-download-csv" 
                            onClick={handleExistingVariantsCSVDownload}
                            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", transition: "background 0.2s", cursor: "pointer" }}
                          >
                            <FontAwesomeIcon icon={faDownload} /> Download CSV
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
                              <th style={{ width: "40px", textAlign: "center" }}>
                                {variants.filter(v => v.id).length > 0 && (
                                  <input
                                    type="checkbox"
                                    checked={variants.filter(v => v.id).length > 0 && variants.filter(v => v.id).every(v => selectedVariantIds.includes(v.id))}
                                    onChange={(e) => handleSelectAllVariants(e.target.checked)}
                                    title="Select All"
                                  />
                                )}
                              </th>
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
                              <th className="matrix-price-header">Price ($)</th>
                              <th className="matrix-sku-header">SKU</th>
                              <th className="matrix-stock-header">Stock</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map((variant, idx) => (
                              <tr key={`existing-variant-${variant.id || idx}`} className={emptyVariantIndices.includes(idx) ? 'variant-row-empty' : ''}>
                                <td style={{ textAlign: "center" }}>
                                  {variant.id ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedVariantIds.includes(variant.id)}
                                      onChange={(e) => handleVariantCheckboxChange(variant.id, e.target.checked)}
                                    />
                                  ) : (
                                    <span style={{ color: "#9ca3af" }}>-</span>
                                  )}
                                </td>
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
                        <label className="variant-field-label">Price ($) *</label>
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
                        setExistingProductImage(null);
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
                          {(() => {
                            const isOutOfStock = !p.variants || p.variants.length === 0 || 
                              p.variants.every(v => Number(v.stock) === 0);
                            return isOutOfStock && (
                              <p className="out-of-stock" style={{ color: 'red', fontWeight: 600, marginTop: '8px', fontSize: '14px' }}>
                                Out of Stock
                              </p>
                            );
                          })()}
                          {p.variants && p.variants.length > 0 && (
                            <div className="product-variants-info">
                              <span className="variants-count">{p.variants.length} Variant{p.variants.length !== 1 ? 's' : ''}</span>
                              <div className="variant-list-mini">
                                {p.variants.slice(0, 3).map(v => (
                                  <span key={v.id} className="variant-tag">
                                    {v.sku} - ${v.price}
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
                            <td className="order-total-cell">${Math.ceil(parseFloat(order.total_amount || order.total || 0))}</td>
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
                                        <span>Price: ${Math.ceil(parseFloat(item.price))}</span>
                                        <span className="order-item-total">Subtotal: ${Math.ceil(itemTotal)}</span>
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
                              <span className="summary-value">${Math.ceil(parseFloat(selectedOrder.total_amount || selectedOrder.total || 0))}</span>
                            </div>
                            <div className="summary-row total-row">
                              <span className="summary-label">Total Amount:</span>
                              <span className="summary-value">${Math.ceil(parseFloat(selectedOrder.total_amount || selectedOrder.total || 0))}</span>
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

          {activeTab === "lowstock" && (
            <section className="admin-card">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: 'red' }} />
                  Low Stock Products
                  <span style={{ 
                    marginLeft: '10px', 
                    backgroundColor: 'red', 
                    color: 'white', 
                    borderRadius: '12px', 
                    padding: '4px 12px', 
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {filteredLowStockProducts.length}
                  </span>
                </h2>
                <p style={{ color: '#666', marginTop: '-10px', marginBottom: '20px' }}>
                  Products with any variant having stock less than 10 units
                </p>
              </div>

              {filteredLowStockProducts.length === 0 ? (
                <div className="empty-state">
                  <p>No products with low stock. All products have sufficient inventory.</p>
                </div>
              ) : (
                <div className="products-grid">
                  {filteredLowStockProducts.map(p => {
                    const image = p.image?.startsWith("http")
                      ? p.image
                      : `${API_BASE}${p.image}`;
                    
                    // Get low stock variants
                    const lowStockVariants = (p.variants || []).filter(v => {
                      const stock = Number(v.stock);
                      return !isNaN(stock) && stock < 10;
                    });

                    return (
                      <div key={p.id} className="product-card" style={{ border: '2px solid red', position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: 'red',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          zIndex: 10
                        }}>
                          <FontAwesomeIcon icon={faExclamationTriangle} /> LOW STOCK
                        </div>
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
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '10px', 
                            backgroundColor: '#fff3cd', 
                            border: '1px solid #ffc107',
                            borderRadius: '4px'
                          }}>
                            <p style={{ fontWeight: 600, marginBottom: '8px', color: '#856404' }}>
                              Low Stock Variants ({lowStockVariants.length}):
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {lowStockVariants.map(v => {
                                const stock = Number(v.stock);
                                const attrs = v.attributes || [];
                                const attrsObj = Array.isArray(attrs)
                                  ? attrs.reduce((acc, a) => { if (a && a.name) acc[a.name] = a.value; return acc; }, {})
                                  : (typeof attrs === 'object' ? attrs : {});
                                const attrStr = Object.keys(attrsObj).length > 0
                                  ? Object.entries(attrsObj).map(([k, v]) => `${k}: ${v}`).join(', ')
                                  : 'Default';
                                
                                return (
                                  <div key={v.id} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    padding: '6px',
                                    backgroundColor: stock === 0 ? '#f8d7da' : '#fff3cd',
                                    borderRadius: '3px',
                                    border: stock === 0 ? '1px solid #dc3545' : '1px solid #ffc107'
                                  }}>
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
                                      {v.sku || `Variant ${v.id}`} {attrStr && `(${attrStr})`}
                                    </span>
                                    <span style={{ 
                                      color: stock === 0 ? 'red' : '#856404', 
                                      fontWeight: 'bold',
                                      fontSize: '13px'
                                    }}>
                                      Stock: {stock}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {p.variants && p.variants.length > 0 && (
                            <div className="product-variants-info" style={{ marginTop: '12px' }}>
                              <span className="variants-count">Total: {p.variants.length} Variant{p.variants.length !== 1 ? 's' : ''}</span>
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

