// Category → per-channel attribute schemas
// Sourced from: Amazon SP-API Product Type Definitions (2024-2025), Flipkart Seller Portal
// vertical schemas, Shopify Admin API Product resource, WooCommerce REST API Product schema.
//
// Each field: { key, label, type, required?, options?, maxLength?, hint?, default? }
// Types: text | textarea | number | select | multiselect | checkbox | url

export const COMMON_ATTRIBUTES = [
  { key: "brand",             label: "Brand",              type: "text",   required: true },
  { key: "manufacturer",      label: "Manufacturer",       type: "text",   required: true },
  { key: "country_of_origin", label: "Country of Origin",  type: "select", required: true,
    options: ["India","China","Vietnam","Bangladesh","Indonesia","Thailand","USA","Germany","Italy","Other"] },
  { key: "hsn_code",          label: "HSN Code",           type: "text",   required: true, hint: "8-digit for India" },
  { key: "gst_rate",          label: "GST Rate (%)",       type: "select", required: true, options: ["0","5","12","18","28"] },
  { key: "weight_kg",         label: "Package Weight (kg)",type: "number" },
  { key: "length_cm",         label: "Length (cm)",        type: "number" },
  { key: "breadth_cm",        label: "Breadth (cm)",       type: "number" },
  { key: "height_cm",         label: "Height (cm)",        type: "number" },
];

// -------- FOOTWEAR --------
const FOOTWEAR_CATEGORY_SPECIFIC = [
  { key: "gender",         label: "Gender",         type: "select", required: true, options: ["Men","Women","Unisex","Boys","Girls"] },
  { key: "size_scale",     label: "Size Scale",     type: "select", required: true, options: ["UK","US","EU","IND"] },
  { key: "closure_type",   label: "Closure Type",   type: "select", options: ["Lace-up","Slip-on","Velcro","Buckle","Zipper","Elastic"] },
  { key: "outer_material", label: "Outer Material", type: "select", required: true, options: ["Mesh","Leather","Synthetic","Canvas","Suede","Knit"] },
  { key: "inner_material", label: "Inner Material", type: "text" },
  { key: "sole_material",  label: "Sole Material",  type: "select", required: true, options: ["Rubber","EVA","PU","TPR","Thermoplastic","Leather"] },
  { key: "insole_material",label: "Insole Material",type: "text" },
  { key: "toe_style",      label: "Toe Style",      type: "select", options: ["Round","Pointed","Square","Open"] },
  { key: "occasion",       label: "Occasion",       type: "multiselect", options: ["Sports","Casual","Formal","Party","Ethnic","Outdoor"] },
];

// -------- ELECTRONICS --------
const ELECTRONICS_COMMON = [
  { key: "model_number",    label: "Model Number",    type: "text", required: true },
  { key: "model_name",      label: "Model Name",      type: "text" },
  { key: "warranty_months", label: "Warranty (months)", type: "number", default: 12 },
  { key: "warranty_type",   label: "Warranty Type",   type: "select", options: ["Manufacturing Defects","No Warranty","Dead on Arrival"] },
  { key: "in_the_box",      label: "In the Box",      type: "textarea", hint: "One item per line" },
  { key: "power_source",    label: "Power Source",    type: "select", options: ["Battery","AC/DC Adapter","USB","Solar"] },
];

// -------- APPAREL --------
const APPAREL_COMMON = [
  { key: "gender",       label: "Gender",       type: "select", required: true, options: ["Men","Women","Unisex","Boys","Girls"] },
  { key: "fabric",       label: "Fabric",       type: "select", required: true, options: ["Cotton","Polyester","Linen","Silk","Wool","Denim","Rayon","Nylon","Lycra","Blend"] },
  { key: "fit",          label: "Fit",          type: "select", options: ["Slim","Regular","Relaxed","Oversized","Skinny"] },
  { key: "sleeve",       label: "Sleeve",       type: "select", options: ["Full","Half","Three Quarter","Sleeveless","Cap"] },
  { key: "neck",         label: "Neck",         type: "select", options: ["Round","V-Neck","Polo","Collar","Turtle","Crew"] },
  { key: "pattern",      label: "Pattern",      type: "select", options: ["Solid","Printed","Striped","Checked","Graphic","Embroidered"] },
  { key: "occasion",     label: "Occasion",     type: "multiselect", options: ["Casual","Formal","Party","Sports","Ethnic","Beach"] },
  { key: "wash_care",    label: "Wash Care",    type: "select", options: ["Machine Wash","Hand Wash Only","Dry Clean Only","Do Not Wash"] },
];

// ============================================================
// CATEGORY -> per-channel schemas
// ============================================================
export const CHANNEL_SCHEMAS = {
  "Running Shoes": {
    label: "Running Shoes",
    common: COMMON_ATTRIBUTES,
    category_specific: FOOTWEAR_CATEGORY_SPECIFIC.concat([
      { key: "cushioning",      label: "Cushioning",     type: "select", options: ["Neutral","Stability","Motion Control","Minimal"] },
      { key: "arch_type",       label: "Arch Type",      type: "select", options: ["Normal","High","Low/Flat"] },
      { key: "recommended_use", label: "Recommended Use",type: "multiselect", options: ["Road","Trail","Track","Gym","Marathon"] },
    ]),
    amazon: [
      { key: "product_type",       label: "Product Type",         type: "text",   required: true, default: "SHOES", hint: "SP-API productType" },
      { key: "gtin",               label: "GTIN (UPC/EAN)",       type: "text",   required: true, hint: "12-13 digit barcode" },
      { key: "item_type_keyword",  label: "Item Type Keyword",    type: "text",   default: "running-shoes" },
      { key: "browse_node_id",     label: "Browse Node ID",       type: "text",   hint: "Amazon category node" },
      { key: "bullet_1",           label: "Bullet Point 1",       type: "text",   required: true, maxLength: 500 },
      { key: "bullet_2",           label: "Bullet Point 2",       type: "text",   maxLength: 500 },
      { key: "bullet_3",           label: "Bullet Point 3",       type: "text",   maxLength: 500 },
      { key: "bullet_4",           label: "Bullet Point 4",       type: "text",   maxLength: 500 },
      { key: "bullet_5",           label: "Bullet Point 5",       type: "text",   maxLength: 500 },
      { key: "description",        label: "Product Description",  type: "textarea", required: true, maxLength: 2000 },
      { key: "search_terms",       label: "Search Terms",         type: "text",   hint: "Backend keywords, max 250 bytes" },
      { key: "tax_code",           label: "Product Tax Code",     type: "text",   default: "A_GEN_STANDARD" },
      { key: "fulfillment_channel",label: "Fulfilment",           type: "select", options: ["MFN (Merchant)","FBA (Amazon)"], default: "MFN (Merchant)" },
    ],
    flipkart: [
      { key: "fsn",             label: "Flipkart FSN",       type: "text",   hint: "Auto-generated if new SKU" },
      { key: "model_number",    label: "Model Number",       type: "text",   required: true },
      { key: "listing_status",  label: "Listing Status",     type: "select", options: ["Active","Inactive","Draft"], default: "Active" },
      { key: "sport_type",      label: "Sport Type",         type: "select", options: ["Running","Training","Athletics","Trail"] },
      { key: "type",            label: "Type",               type: "select", options: ["Running","Racing","Trail","Casual"] },
      { key: "sub_type",        label: "Sub Type",           type: "text" },
      { key: "shoe_width",      label: "Shoe Width",         type: "select", options: ["Regular","Wide","Extra Wide","Narrow"] },
      { key: "series",          label: "Series",             type: "text" },
      { key: "collection",      label: "Collection",         type: "text" },
      { key: "ideal_for",       label: "Ideal For",          type: "select", options: ["Men","Women","Boys","Girls"] },
      { key: "hazmat",          label: "Hazmat",             type: "select", options: ["No","Yes"], default: "No" },
    ],
    shopify: [
      { key: "vendor",            label: "Vendor",              type: "text",   required: true },
      { key: "product_type",      label: "Product Type",        type: "text",   default: "Athletic Shoes" },
      { key: "tags",              label: "Tags (comma-sep)",    type: "text",   hint: "running, mens, marathon" },
      { key: "handle",            label: "URL Handle",          type: "text",   hint: "yourstore.com/products/<handle>" },
      { key: "compare_at_price",  label: "Compare-at Price",    type: "number", hint: "Slashed 'was' price" },
      { key: "barcode",           label: "Barcode",             type: "text" },
      { key: "hs_code",           label: "Harmonized System Code",type: "text" },
      { key: "template_suffix",   label: "Template Suffix",     type: "text",   hint: "Custom liquid template" },
      { key: "requires_shipping", label: "Requires Shipping",   type: "checkbox", default: true },
      { key: "taxable",           label: "Taxable",             type: "checkbox", default: true },
      { key: "seo_title",         label: "SEO Title",           type: "text",   maxLength: 70 },
      { key: "seo_description",   label: "SEO Description",     type: "textarea", maxLength: 320 },
    ],
    woocommerce: [
      { key: "slug",           label: "URL Slug",         type: "text" },
      { key: "regular_price",  label: "Regular Price",    type: "number", required: true },
      { key: "sale_price",     label: "Sale Price",       type: "number" },
      { key: "tax_class",      label: "Tax Class",        type: "select", options: ["Standard","Reduced","Zero"] },
      { key: "shipping_class", label: "Shipping Class",   type: "text" },
      { key: "featured",       label: "Featured",         type: "checkbox" },
      { key: "purchase_note",  label: "Purchase Note",    type: "textarea" },
      { key: "menu_order",     label: "Menu Order",       type: "number" },
      { key: "manage_stock",   label: "Manage Stock",     type: "checkbox", default: true },
    ],
  },

  "Casual Sneakers": {
    label: "Casual Sneakers",
    common: COMMON_ATTRIBUTES,
    category_specific: FOOTWEAR_CATEGORY_SPECIFIC,
    amazon: [
      { key: "product_type",      label: "Product Type",        type: "text", default: "SHOES", required: true },
      { key: "gtin",              label: "GTIN (UPC/EAN)",      type: "text", required: true },
      { key: "item_type_keyword", label: "Item Type Keyword",   type: "text", default: "casual-shoes" },
      { key: "bullet_1",          label: "Bullet Point 1",      type: "text", required: true, maxLength: 500 },
      { key: "bullet_2",          label: "Bullet Point 2",      type: "text", maxLength: 500 },
      { key: "bullet_3",          label: "Bullet Point 3",      type: "text", maxLength: 500 },
      { key: "description",       label: "Description",         type: "textarea", required: true, maxLength: 2000 },
      { key: "search_terms",      label: "Search Terms",        type: "text" },
    ],
    flipkart: [
      { key: "model_number",   label: "Model Number", type: "text", required: true },
      { key: "type",           label: "Type",         type: "select", options: ["Sneakers","Loafers","Slip-on","Boat Shoes","Espadrilles"] },
      { key: "sole_type",      label: "Sole Type",    type: "text" },
      { key: "shoe_style",     label: "Shoe Style",   type: "select", options: ["Casual","Semi-Formal","Sporty"] },
    ],
    shopify: [
      { key: "vendor",       label: "Vendor",       type: "text", required: true },
      { key: "product_type", label: "Product Type", type: "text", default: "Sneakers" },
      { key: "tags",         label: "Tags",         type: "text" },
      { key: "barcode",      label: "Barcode",      type: "text" },
    ],
    woocommerce: [
      { key: "regular_price", label: "Regular Price", type: "number", required: true },
      { key: "sale_price",    label: "Sale Price",    type: "number" },
    ],
  },

  "Wearables": {
    label: "Wearables (Smart Watch / Band)",
    common: COMMON_ATTRIBUTES,
    category_specific: ELECTRONICS_COMMON.concat([
      { key: "display_size",    label: "Display Size (inches)",  type: "number" },
      { key: "display_type",    label: "Display Type",           type: "select", options: ["AMOLED","LCD","OLED","IPS","Retina"] },
      { key: "resolution",      label: "Resolution",             type: "text" },
      { key: "battery_life_days",label: "Battery Life (days)",   type: "number" },
      { key: "water_resistance",label: "Water Resistance",       type: "select", options: ["IP67","IP68","5 ATM","10 ATM","None"] },
      { key: "connectivity",    label: "Connectivity",           type: "multiselect", options: ["Bluetooth 5.0","Bluetooth 5.2","Wi-Fi","GPS","NFC","LTE"] },
      { key: "compatible_os",   label: "Compatible OS",          type: "multiselect", options: ["iOS","Android","HarmonyOS"] },
      { key: "sensors",         label: "Sensors",                type: "multiselect", options: ["Heart Rate","SpO2","Accelerometer","Gyroscope","GPS","Barometer","Compass","Temperature"] },
      { key: "band_material",   label: "Band Material",          type: "select", options: ["Silicone","Leather","Metal","Nylon","Milanese"] },
    ]),
    amazon: [
      { key: "product_type",  label: "Product Type",   type: "text", default: "WATCH", required: true },
      { key: "gtin",          label: "GTIN",           type: "text", required: true },
      { key: "battery_cell",  label: "Battery Cell",   type: "select", options: ["Lithium Polymer","Lithium Ion","NiMH"] },
      { key: "battery_wh",    label: "Battery (Wh)",   type: "number", hint: "For airline shipping compliance" },
      { key: "bullet_1",      label: "Bullet Point 1", type: "text", required: true, maxLength: 500 },
      { key: "bullet_2",      label: "Bullet Point 2", type: "text", maxLength: 500 },
      { key: "bullet_3",      label: "Bullet Point 3", type: "text", maxLength: 500 },
      { key: "bullet_4",      label: "Bullet Point 4", type: "text", maxLength: 500 },
      { key: "bullet_5",      label: "Bullet Point 5", type: "text", maxLength: 500 },
      { key: "description",   label: "Description",    type: "textarea", required: true, maxLength: 2000 },
      { key: "is_battery_included", label: "Battery Included", type: "checkbox", default: true },
    ],
    flipkart: [
      { key: "model_number",  label: "Model Number",   type: "text", required: true },
      { key: "form",          label: "Form",           type: "select", options: ["Smart Watch","Fitness Band","Smart Ring"] },
      { key: "strap_type",    label: "Strap Type",     type: "text" },
      { key: "dial_shape",    label: "Dial Shape",     type: "select", options: ["Round","Square","Rectangle","Oval"] },
      { key: "notifications", label: "Notifications",  type: "multiselect", options: ["Calls","SMS","App Alerts","Calendar"] },
      { key: "sim_supported", label: "SIM Supported",  type: "select", options: ["No","Yes eSIM","Yes Nano SIM"] },
    ],
    shopify: [
      { key: "vendor",       label: "Vendor",       type: "text", required: true },
      { key: "product_type", label: "Product Type", type: "text", default: "Smart Watch" },
      { key: "tags",         label: "Tags",         type: "text" },
      { key: "barcode",      label: "Barcode",      type: "text" },
      { key: "hs_code",      label: "HS Code",      type: "text", default: "9102" },
    ],
    woocommerce: [
      { key: "regular_price", label: "Regular Price", type: "number", required: true },
      { key: "sale_price",    label: "Sale Price",    type: "number" },
      { key: "downloadable",  label: "Downloadable Content", type: "checkbox" },
    ],
  },

  "Small Appliances": {
    label: "Small Appliances",
    common: COMMON_ATTRIBUTES,
    category_specific: ELECTRONICS_COMMON.concat([
      { key: "wattage",         label: "Wattage (W)",     type: "number", required: true },
      { key: "voltage",         label: "Voltage",         type: "select", options: ["110V","220V","110-220V"] },
      { key: "capacity_ltr",    label: "Capacity (litres)", type: "number" },
      { key: "control_type",    label: "Control Type",    type: "select", options: ["Manual","Digital","Touch","Knob"] },
      { key: "material_body",   label: "Body Material",   type: "select", options: ["Plastic","Stainless Steel","Aluminium","Glass","Ceramic"] },
      { key: "safety_features", label: "Safety Features", type: "multiselect", options: ["Auto Shut-off","Overheat Protection","Cool-touch Handle","BPA Free"] },
      { key: "certification",   label: "Certification",   type: "multiselect", options: ["BIS","ISI","CE","RoHS","FCC"] },
    ]),
    amazon: [
      { key: "product_type",   label: "Product Type",   type: "text", default: "SMALL_APPLIANCE", required: true },
      { key: "gtin",           label: "GTIN",           type: "text", required: true },
      { key: "energy_star",    label: "Energy Star Certified", type: "checkbox" },
      { key: "bullet_1",       label: "Bullet Point 1", type: "text", required: true, maxLength: 500 },
      { key: "bullet_2",       label: "Bullet Point 2", type: "text", maxLength: 500 },
      { key: "bullet_3",       label: "Bullet Point 3", type: "text", maxLength: 500 },
      { key: "description",    label: "Description",    type: "textarea", required: true, maxLength: 2000 },
    ],
    flipkart: [
      { key: "model_number",   label: "Model Number",  type: "text", required: true },
      { key: "type",           label: "Appliance Type",type: "text", required: true },
      { key: "star_rating",    label: "BEE Star Rating", type: "select", options: ["Not Applicable","1","2","3","4","5"] },
      { key: "detachable_cord",label: "Detachable Cord",type: "checkbox" },
    ],
    shopify: [
      { key: "vendor",       label: "Vendor",       type: "text", required: true },
      { key: "product_type", label: "Product Type", type: "text", default: "Kitchen Appliances" },
      { key: "tags",         label: "Tags",         type: "text" },
      { key: "hs_code",      label: "HS Code",      type: "text", default: "8516" },
    ],
    woocommerce: [
      { key: "regular_price", label: "Regular Price", type: "number", required: true },
      { key: "sale_price",    label: "Sale Price",    type: "number" },
    ],
  },

  "Apparel": {
    label: "Apparel (T-Shirt / Top / Bottom)",
    common: COMMON_ATTRIBUTES,
    category_specific: APPAREL_COMMON,
    amazon: [
      { key: "product_type",       label: "Product Type",         type: "text", default: "SHIRT", required: true },
      { key: "gtin",               label: "GTIN",                 type: "text", required: true },
      { key: "target_gender",      label: "Target Gender",        type: "select", options: ["Male","Female","Unisex","Boys","Girls"], required: true },
      { key: "age_range",          label: "Age Range",            type: "select", options: ["Adult","Teen","Kid","Toddler","Baby"] },
      { key: "department",         label: "Department",           type: "text" },
      { key: "material_composition",label: "Material Composition",type: "text", hint: "e.g., 95% Cotton, 5% Elastane" },
      { key: "bullet_1",           label: "Bullet Point 1",       type: "text", required: true, maxLength: 500 },
      { key: "bullet_2",           label: "Bullet Point 2",       type: "text", maxLength: 500 },
      { key: "bullet_3",           label: "Bullet Point 3",       type: "text", maxLength: 500 },
      { key: "description",        label: "Description",          type: "textarea", required: true, maxLength: 2000 },
    ],
    flipkart: [
      { key: "model_number",     label: "Model Number",       type: "text", required: true },
      { key: "type",             label: "Type",               type: "select", options: ["T-Shirt","Shirt","Kurta","Sweatshirt","Jacket","Trouser","Jeans","Shorts"] },
      { key: "ideal_for",        label: "Ideal For",          type: "select", options: ["Men","Women","Boys","Girls"], required: true },
      { key: "fabric_care",      label: "Fabric Care",        type: "textarea" },
      { key: "style_code",       label: "Style Code",         type: "text" },
      { key: "hem",              label: "Hem",                type: "select", options: ["Straight","Curved","Asymmetric"] },
      { key: "reversible",       label: "Reversible",         type: "checkbox" },
    ],
    shopify: [
      { key: "vendor",       label: "Vendor",       type: "text", required: true },
      { key: "product_type", label: "Product Type", type: "text", default: "Apparel" },
      { key: "tags",         label: "Tags",         type: "text" },
    ],
    woocommerce: [
      { key: "regular_price", label: "Regular Price", type: "number", required: true },
      { key: "sale_price",    label: "Sale Price",    type: "number" },
    ],
  },
};

// Fallback for categories not in the map
export const DEFAULT_SCHEMA = {
  label: "Generic Product",
  common: COMMON_ATTRIBUTES,
  category_specific: [],
  amazon: [
    { key: "product_type",  label: "Product Type",  type: "text", required: true },
    { key: "gtin",          label: "GTIN",          type: "text", required: true },
    { key: "bullet_1",      label: "Bullet Point 1",type: "text", required: true, maxLength: 500 },
    { key: "bullet_2",      label: "Bullet Point 2",type: "text", maxLength: 500 },
    { key: "bullet_3",      label: "Bullet Point 3",type: "text", maxLength: 500 },
    { key: "description",   label: "Description",   type: "textarea", required: true, maxLength: 2000 },
  ],
  flipkart: [
    { key: "model_number",  label: "Model Number",  type: "text", required: true },
  ],
  shopify: [
    { key: "vendor",        label: "Vendor",        type: "text", required: true },
    { key: "product_type",  label: "Product Type",  type: "text" },
    { key: "tags",          label: "Tags",          type: "text" },
  ],
  woocommerce: [
    { key: "regular_price", label: "Regular Price", type: "number", required: true },
  ],
};

export const getSchemaForCategory = (category) => CHANNEL_SCHEMAS[category] || DEFAULT_SCHEMA;

export const CHANNEL_TABS = [
  { key: "common",            label: "Master · Universal", channel: null },
  { key: "category_specific", label: "Category Specific",  channel: null },
  { key: "amazon",            label: "Amazon",             channel: "amazon" },
  { key: "flipkart",          label: "Flipkart",           channel: "flipkart" },
  { key: "shopify",           label: "Shopify",            channel: "shopify" },
  { key: "woocommerce",       label: "WooCommerce",        channel: "woocommerce" },
];
