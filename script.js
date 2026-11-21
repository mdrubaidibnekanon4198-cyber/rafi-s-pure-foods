
/* =====================================
   RAFI'S PURE FOODS
   CUSTOMER + ADMIN JAVASCRIPT
===================================== */

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBPxXJbVAQ5TxPO49gRoTQ8s2yGbX1paKc",
  authDomain: "rafi-s-pure.firebaseapp.com",
  projectId: "rafi-s-pure",
  storageBucket: "rafi-s-pure.firebasestorage.app",
  messagingSenderId: "823455739664",
  appId: "1:823455739664:web:f57c048e9d55087c957f95",
  measurementId: "G-R67LVKLZJM"
};

// ADMIN EMAIL
const ADMIN_EMAIL = "mdrubaidibnekanon4198@gmail.com";

// FIREBASE INITIALIZE
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

const $ = id => document.getElementById(id);

const isAdminPage = window.location.pathname
  .toLowerCase()
  .endsWith("/admin.html");

let user = null;
let isAdmin = false;
let items = [];
let cart = [];

let deliverySettings = {
  dhakaCharge: 70,
  outsideCharge: 130
};

const cash = amount =>
  "৳" + Number(amount || 0).toLocaleString("en-BD");

// =====================================
// PRODUCT WEIGHTS
// =====================================

function getWeights(product) {
  if (
    Array.isArray(product.weights) &&
    product.weights.length &&
    typeof product.weights[0] === "object"
  ) {
    return product.weights;
  }

  const weights = [];

  if (product.price_500gm != null) {
    weights.push({
      weight: "৫০০ গ্রাম",
      price: Number(product.price_500gm)
    });
  }

  if (product.price_1kg != null) {
    weights.push({
      weight: "১ কেজি",
      price: Number(product.price_1kg)
    });
  }

  return weights;
}

// =====================================
// LOAD PRODUCTS
// =====================================

async function loadProducts() {
  try {
    const snapshot = await db.collection("products").get();

    items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    render();
    adminProducts();

  } catch (error) {
    console.error("PRODUCT ERROR:", error);

    if ($("products")) {
      $("products").textContent =
        "পণ্য লোড করা যায়নি: " + error.message;
    }

    if ($("adminProducts")) {
      $("adminProducts").textContent =
        "পণ্য লোড করা যায়নি: " + error.message;
    }
  }
}

// =====================================
// DISPLAY CUSTOMER PRODUCTS
// =====================================

function render() {
  const container = $("products");
  if (!container) return;

  container.innerHTML = "";

  if (!items.length) {
    container.textContent = "এখনো কোনো পণ্য যোগ করা হয়নি।";
    return;
  }

  items.forEach(product => {
    const weights = getWeights(product);

    const card = document.createElement("div");
    card.className = "product-card";

    if (product.imageUrl) {
      const image = document.createElement("img");
      image.src = product.imageUrl;
      image.alt = product.name || "পণ্য";
      image.onerror = () => image.style.display = "none";
      card.appendChild(image);
    }

    const title = document.createElement("h3");
    title.textContent = product.name || "";

    const description = document.createElement("p");
    description.textContent = product.description || "";

    const select = document.createElement("select");
    select.id = "w-" + product.id;

    weights.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent =
        item.weight + " - " + cash(item.price);
      select.appendChild(option);
    });

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "কার্টে যোগ করুন";
    button.disabled = !weights.length;
    button.onclick = () => add(product.id);

    card.append(title, description, select, button);
    container.appendChild(card);
  });
}

// =====================================
// ADD TO CART
// =====================================

function add(id) {
  const product = items.find(item => item.id === id);
  if (!product) return;

  const weights = getWeights(product);
  const select = $("w-" + id);

  if (!weights.length || !select) {
    alert("এই পণ্যের ওজন ও দাম যোগ করা হয়নি।");
    return;
  }

  const selected = weights[Number(select.value)];
  if (!selected) return;

  const existing = cart.find(item =>
    item.id === id && item.w === selected.weight
  );

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id,
      name: product.name,
      w: selected.weight,
      price: Number(selected.price),
      qty: 1
    });
  }

  renderCart();
}

// =====================================
// RENDER CART
// =====================================

function renderCart() {
  const container = $("cartItems");
  if (!container) return;

  container.innerHTML = "";

  if (!cart.length) {
    container.textContent = "আপনার কার্ট খালি।";
  }

  cart.forEach((item, index) => {
    const row = document.createElement("div");

    const info = document.createElement("p");
    info.textContent =
      `${item.name} (${item.w}) × ${item.qty} = ${cash(item.price * item.qty)}`;

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.onclick = () => changeQty(index, -1);

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.onclick = () => changeQty(index, 1);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "বাদ";
    remove.onclick = () => removeCart(index);

    row.append(info, minus, plus, remove);
    container.appendChild(row);
  });

  updateTotal();
}

// =====================================
// QUANTITY
// =====================================

function changeQty(index, amount) {
  if (!cart[index]) return;

  cart[index].qty += amount;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  renderCart();
}

function removeCart(index) {
  cart.splice(index, 1);
  renderCart();
}

// =====================================
// TOTAL CALCULATION
// =====================================

function updateTotal() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const zone = $("cartDeliveryZone")?.value || "outside";

  const delivery = zone === "dhaka"
    ? Number(deliverySettings.dhakaCharge)
    : Number(deliverySettings.outsideCharge);

  const actualDelivery = cart.length ? delivery : 0;
  const total = subtotal + actualDelivery;

  if ($("orderDeliveryZone")) {
    $("orderDeliveryZone").value = zone;
  }

  if ($("subtotal")) {
    $("subtotal").textContent = cash(subtotal);
  }

  if ($("deliveryFee")) {
    $("deliveryFee").textContent = cash(actualDelivery);
  }

  if ($("total")) {
    $("total").textContent = cash(total);
  }

  if ($("orderSubtotal")) {
    $("orderSubtotal").textContent = cash(subtotal);
  }

  if ($("orderDeliveryFee")) {
    $("orderDeliveryFee").textContent = cash(actualDelivery);
  }

  if ($("grandTotal")) {
    $("grandTotal").textContent = cash(total);
  }
}

document.addEventListener("change", event => {
  if (event.target.id === "cartDeliveryZone") {
    updateTotal();
  }
});

// =====================================
// LOAD DELIVERY SETTINGS
// =====================================

async function loadDeliverySettings() {
  try {
    const doc = await db.collection("settings")
      .doc("delivery")
      .get();

    if (doc.exists) {
      deliverySettings = {
        ...deliverySettings,
        ...doc.data()
      };
    }

    if ($("dhakaCharge")) {
      $("dhakaCharge").value = deliverySettings.dhakaCharge;
    }

    if ($("outsideCharge")) {
      $("outsideCharge").value = deliverySettings.outsideCharge;
    }

    updateTotal();

  } catch (error) {
    console.error("DELIVERY ERROR:", error);
  }
}

// =====================================
// ADMIN AUTH CHECK
// =====================================

function requireAdmin() {
  if (!user || !isAdmin) {
    alert("এই কাজের জন্য অ্যাডমিন অনুমতি প্রয়োজন।");
    return false;
  }

  return true;
}

// =====================================
// SAVE DELIVERY SETTINGS
// =====================================

if ($("deliveryForm")) {
  $("deliveryForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!requireAdmin()) return;

    const dhakaCharge = Number($("dhakaCharge").value);
    const outsideCharge = Number($("outsideCharge").value);

    if (
      !Number.isFinite(dhakaCharge) || dhakaCharge < 0 ||
      !Number.isFinite(outsideCharge) || outsideCharge < 0
    ) {
      alert("সঠিক ডেলিভারি চার্জ লিখুন।");
      return;
    }

    try {
      await db.collection("settings")
        .doc("delivery")
        .set({ dhakaCharge, outsideCharge });

      deliverySettings = { dhakaCharge, outsideCharge };
      updateTotal();

      alert("ডেলিভারি চার্জ সংরক্ষণ হয়েছে।");

    } catch (error) {
      alert("সমস্যা: " + error.message);
    }
  });
}

// =====================================
// ADD WEIGHT ROW
// =====================================

function addWeightRow(weight = "", price = "") {
  const container = $("weightRows");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "weight-row";

  const weightInput = document.createElement("input");
  weightInput.name = "weight[]";
  weightInput.placeholder = "ওজন, যেমন ৫০০ গ্রাম";
  weightInput.required = true;
  weightInput.value = weight;

  const priceInput = document.createElement("input");
  priceInput.name = "price[]";
  priceInput.type = "number";
  priceInput.min = "0";
  priceInput.placeholder = "দাম";
  priceInput.required = true;
  priceInput.value = price;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "বাদ";
  remove.onclick = () => row.remove();

  row.append(weightInput, priceInput, remove);
  container.appendChild(row);
}

if ($("addWeightBtn")) {
  $("addWeightBtn").addEventListener("click", () => {
    addWeightRow();
  });
}

// =====================================
// RESET PRODUCT FORM
// =====================================

function resetProductForm() {
  if (!$("productForm")) return;

  $("productForm").reset();
  $("productForm").elements.id.value = "";
  $("weightRows").innerHTML = "";
  addWeightRow();
}

if ($("cancelEditBtn")) {
  $("cancelEditBtn").addEventListener("click", resetProductForm);
}

// =====================================
// SAVE PRODUCT
// =====================================

if ($("productForm")) {
  $("productForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!requireAdmin()) return;

    const form = event.target;
    const data = new FormData(form);

    const name = (data.get("name") || "").trim();
    const description = data.get("description") || "";
    const imageUrl = data.get("imageUrl") || "";
    const id = data.get("id");

    const names = data.getAll("weight[]");
    const prices = data.getAll("price[]");

    const weights = names.map((weight, index) => ({
      weight: String(weight).trim(),
      price: Number(prices[index])
    })).filter(item =>
      item.weight &&
      Number.isFinite(item.price) &&
      item.price >= 0
    );

    if (!name || !weights.length) {
      alert("পণ্যের নাম এবং কমপক্ষে একটি ওজন ও দাম দিন।");
      return;
    }

    const productData = {
      name,
      description,
      imageUrl,
      weights,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      if (id) {
        await db.collection("products").doc(id).update(productData);
        alert("পণ্য আপডেট হয়েছে।");
      } else {
        productData.createdAt =
          firebase.firestore.FieldValue.serverTimestamp();

        await db.collection("products").add(productData);
        alert("নতুন পণ্য যোগ হয়েছে।");
      }

      resetProductForm();
      await loadProducts();

    } catch (error) {
      alert("পণ্য সংরক্ষণ করা যায়নি: " + error.message);
    }
  });
}

// =====================================
// EDIT PRODUCT
// =====================================

function editP(id) {
  if (!requireAdmin()) return;

  const product = items.find(item => item.id === id);
  if (!product) return;

  const form = $("productForm");

  form.elements.id.value = product.id;
  form.elements.name.value = product.name || "";
  form.elements.description.value = product.description || "";
  form.elements.imageUrl.value = product.imageUrl || "";

  $("weightRows").innerHTML = "";

  const weights = getWeights(product);

  if (weights.length) {
    weights.forEach(item => {
      addWeightRow(item.weight, item.price);
    });
  } else {
    addWeightRow();
  }

  form.scrollIntoView({ behavior: "smooth" });
}

// =====================================
// ADMIN PRODUCT LIST
// =====================================

function adminProducts() {
  const container = $("adminProducts");
  if (!container || !isAdmin) return;

  container.innerHTML = "";

  if (!items.length) {
    container.textContent = "এখনো কোনো পণ্য যোগ করা হয়নি।";
    return;
  }

  items.forEach(product => {
    const row = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = product.name || "";

    const price = document.createElement("p");
    price.textContent = getWeights(product)
      .map(item => `${item.weight}: ${cash(item.price)}`)
      .join(" / ");

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "এডিট";
    edit.onclick = () => editP(product.id);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "ডিলিট";
    remove.onclick = () => deleteP(product.id);

    row.append(title, price, edit, remove);
    container.appendChild(row);
  });
}

// =====================================
// DELETE PRODUCT
// =====================================

async function deleteP(id) {
  if (!requireAdmin()) return;

  if (!confirm("পণ্যটি ডিলিট করতে চান?")) return;

  try {
    await db.collection("products").doc(id).delete();
    await loadProducts();
    alert("পণ্য ডিলিট হয়েছে।");

  } catch (error) {
    alert("ডিলিট করা যায়নি: " + error.message);
  }
}

// =====================================
// CUSTOMER ORDER
// =====================================

if ($("orderForm")) {
  $("orderForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!cart.length) {
      alert("আপনার কার্ট খালি।");
      return;
    }

    const form = event.target;
    const button = $("orderButton");

    const data = new FormData(form);

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    const zone = $("cartDeliveryZone")?.value || "outside";

    const deliveryCharge = zone === "dhaka"
      ? Number(deliverySettings.dhakaCharge)
      : Number(deliverySettings.outsideCharge);

    const order = {
      customerName: String(data.get("customerName") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      address: String(data.get("address") || "").trim(),
      deliveryZone: zone,
      items: cart.map(item => ({ ...item })),
      subtotal,
      deliveryCharge,
      total: subtotal + deliveryCharge,
      paymentMethod: "Cash on Delivery",
      status: "নতুন অর্ডার",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!order.customerName || !order.phone || !order.address) {
      alert("সব তথ্য সঠিকভাবে পূরণ করুন।");
      return;
    }

    try {
      if (button) {
        button.disabled = true;
        button.textContent = "অর্ডার পাঠানো হচ্ছে...";
      }

      await db.collection("orders").add(order);

      alert("আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!");

      cart = [];
      renderCart();
      form.reset();

      if ($("cartDeliveryZone")) {
        $("cartDeliveryZone").value = "outside";
      }

      updateTotal();

    } catch (error) {
      alert("অর্ডার করা যায়নি: " + error.message);

    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "অর্ডার কনফার্ম করুন";
      }
    }
  });
}

// =====================================
// LOAD ORDERS
// =====================================

async function loadOrders() {
  const container = $("ordersList");

  if (!container || !requireAdmin()) return;

  try {
    const snapshot = await db.collection("orders")
      .orderBy("createdAt", "desc")
      .get();

    container.innerHTML = "";

    if (snapshot.empty) {
      container.textContent = "এখনো কোনো অর্ডার আসেনি।";
      return;
    }

    snapshot.forEach(doc => {
      const order = doc.data();

      const row = document.createElement("div");
      row.className = "admin-order";

      const title = document.createElement("h3");
      title.textContent = "অর্ডার: " + doc.id;

      const details = document.createElement("p");
      details.textContent =
        `নাম: ${order.customerName || ""} | মোবাইল: ${order.phone || ""} | ঠিকানা: ${order.address || ""}`;

      const products = document.createElement("p");
      products.textContent = "পণ্য: " +
        (order.items || []).map(item =>
          `${item.name} (${item.w}) × ${item.qty}`
        ).join(", ");

      const bill = document.createElement("p");
      bill.textContent =
        `পণ্যের দাম: ${cash(order.subtotal)} | ডেলিভারি: ${cash(order.deliveryCharge)} | মোট: ${cash(order.total)}`;

      const status = document.createElement("p");
      status.textContent = "অবস্থা: " + (order.status || "নতুন অর্ডার");

      row.append(title, details, products, bill, status);

      ["প্রসেসিং", "ডেলিভারি সম্পন্ন"].forEach(value => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = value;
        button.onclick = () => updateOrderStatus(doc.id, value);
        row.appendChild(button);
      });

      container.appendChild(row);
    });

  } catch (error) {
    console.error("ORDER ERROR:", error);
    container.textContent =
      "অর্ডার লোড করা যায়নি: " + error.message;
  }
}

// =====================================
// UPDATE ORDER STATUS
// =====================================

async function updateOrderStatus(id, status) {
  if (!requireAdmin()) return;

  try {
    await db.collection("orders").doc(id).update({ status });
    await loadOrders();
    alert("অর্ডারের অবস্থা আপডেট হয়েছে।");

  } catch (error) {
    alert("আপডেট করা যায়নি: " + error.message);
  }
}

// =====================================
// ADMIN LOGIN
// =====================================

if ($("loginForm")) {
  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const email = $("loginEmail").value.trim().toLowerCase();
    const password = $("loginPassword").value;
    const button = $("loginForm").querySelector('button[type="submit"]');

    if (email !== ADMIN_EMAIL) {
      alert("এই ইমেইলটি অ্যাডমিন হিসেবে অনুমোদিত নয়।");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "লগইন হচ্ছে...";
    }

    try {
      await auth.signInWithEmailAndPassword(email, password);

    } catch (error) {
      console.error("LOGIN ERROR:", error);
      alert("লগইন সমস্যা: " + error.message);

    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "লগইন করুন";
      }
    }
  });
}

// =====================================
// LOGOUT
// =====================================

if ($("logoutBtn")) {
  $("logoutBtn").addEventListener("click", async () => {
    try {
      await auth.signOut();
      alert("লগআউট সফল হয়েছে।");
      window.location.reload();

    } catch (error) {
      alert("লগআউট সমস্যা: " + error.message);
    }
  });
}

// =====================================
// AUTH STATE
// =====================================

auth.onAuthStateChanged(async currentUser => {
  user = currentUser;

  if (!isAdminPage) return;

  if (currentUser) {
    const email = (currentUser.email || "").toLowerCase();

    if (email !== ADMIN_EMAIL) {
      isAdmin = false;

      alert("এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই।");

      await auth.signOut();
      return;
    }

    isAdmin = true;

    if ($("loginArea")) {
      $("loginArea").style.display = "none";
    }

    if ($("adminPanel")) {
      $("adminPanel").style.display = "block";
    }

    await Promise.all([
      loadProducts(),
      loadDeliverySettings(),
      loadOrders()
    ]);

    if ($("weightRows") && !$("weightRows").children.length) {
      addWeightRow();
    }

  } else {
    isAdmin = false;

    if ($("adminPanel")) {
      $("adminPanel").style.display = "none";
    }

    if ($("loginArea")) {
      $("loginArea").style.display = "block";
    }
  }
});

// =====================================
// INITIAL LOAD
// =====================================

async function startWebsite() {
  await Promise.all([
    loadProducts(),
    loadDeliverySettings()
  ]);

  renderCart();
}

if (!isAdminPage) {
  startWebsite();
}
