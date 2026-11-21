
const firebaseConfig = {
  apiKey: "AIzaSyBPxXJbVAQ5TxPO49gRoTQ8s2yGbX1paKc",
  authDomain: "rafi-s-pure.firebaseapp.com",
  projectId: "rafi-s-pure",
  storageBucket: "rafi-s-pure.firebasestorage.app",
  messagingSenderId: "823455739664",
  appId: "1:823455739664:web:f57c048e9d55087c957f95",
  measurementId: "G-R67LVKLZJM"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

let user = null;
let items = [];
let cart = [];

let deliverySettings = {
  dhakaCharge: 70,
  outsideCharge: 130
};

const $ = id => document.getElementById(id);

const cash = amount =>
  "৳" + Number(amount || 0).toLocaleString("en-BD");

// পণ্যের ওজন ও দাম বের করা
function getWeights(product) {
  if (
    Array.isArray(product.weights) &&
    product.weights.length &&
    typeof product.weights[0] === "object"
  ) {
    return product.weights;
  }

  const oldWeights = [];

  if (product.price_500gm != null) {
    oldWeights.push({
      weight: "৫০০ গ্রাম",
      price: Number(product.price_500gm)
    });
  }

  if (product.price_1kg != null) {
    oldWeights.push({
      weight: "১ কেজি",
      price: Number(product.price_1kg)
    });
  }

  return oldWeights;
}

// পণ্য লোড
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
    console.error(error);
    alert("পণ্য লোড করা যায়নি।");
  }
}

// পণ্য দেখানো
function render() {
  const container =
    $("products") || $("productList") || $("productGrid");

  if (!container) return;

  container.innerHTML = "";

  items.forEach(product => {
    const weights = getWeights(product);

    const options = weights.map((item, index) => `
      <option value="${index}">
        ${item.weight} - ${cash(item.price)}
      </option>
    `).join("");

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img
        src="${product.imageUrl || ""}"
        alt="${product.name || "পণ্য"}"
        onerror="this.style.display='none'"
      >

      <h3>${product.name || ""}</h3>

      <p>${product.description || ""}</p>

      <select id="w-${product.id}">
        ${options}
      </select>

      <button onclick="add('${product.id}')">
        কার্টে যোগ করুন
      </button>
    `;

    container.appendChild(card);
  });
}

// কার্টে পণ্য যোগ
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
      id: id,
      name: product.name,
      w: selected.weight,
      price: Number(selected.price),
      qty: 1
    });
  }

  renderCart();
}

// কার্ট দেখানো
function renderCart() {
  const container = $("cartItems") || $("cart");

  if (!container) return;

  container.innerHTML = "";

  if (!cart.length) {
    container.textContent = "আপনার কার্ট খালি।";
  }

  cart.forEach((item, index) => {
    const row = document.createElement("div");

    row.innerHTML = `
      <p>
        ${item.name} (${item.w})
        × ${item.qty}
        = ${cash(item.price * item.qty)}

        <button onclick="changeQty(${index}, -1)">−</button>
        <button onclick="changeQty(${index}, 1)">+</button>
        <button onclick="removeCart(${index})">বাদ</button>
      </p>
    `;

    container.appendChild(row);
  });

  updateTotal();
}

// পরিমাণ পরিবর্তন
function changeQty(index, amount) {
  if (!cart[index]) return;

  cart[index].qty += amount;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  renderCart();
}

// কার্ট থেকে বাদ
function removeCart(index) {
  cart.splice(index, 1);
  renderCart();
}

// মোট বিল হিসাব
function updateTotal() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const zone =
    document.querySelector('[name="deliveryZone"]')?.value || "outside";

  const delivery =
    zone === "dhaka"
      ? Number(deliverySettings.dhakaCharge)
      : Number(deliverySettings.outsideCharge);

  const actualDelivery = cart.length ? delivery : 0;
  const total = subtotal + actualDelivery;

  // কার্টের হিসাব
  if ($("subtotal")) {
    $("subtotal").textContent = cash(subtotal);
  }

  if ($("deliveryFee")) {
    $("deliveryFee").textContent = cash(actualDelivery);
  }

  if ($("total")) {
    $("total").textContent = cash(total);
  }

  // অর্ডার ফর্মের হিসাব
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

// ডেলিভারি এলাকা পরিবর্তন
document.addEventListener("change", event => {
  if (event.target.name === "deliveryZone") {
    updateTotal();
  }
});

// ডেলিভারি চার্জ লোড
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
      $("dhakaCharge").value =
        deliverySettings.dhakaCharge;
    }

    if ($("outsideCharge")) {
      $("outsideCharge").value =
        deliverySettings.outsideCharge;
    }

    updateTotal();

  } catch (error) {
    console.error(error);
  }
}

// ডেলিভারি চার্জ সংরক্ষণ
if ($("deliveryForm")) {
  $("deliveryForm").addEventListener("submit", async event => {
    event.preventDefault();

    const dhakaCharge = Number($("dhakaCharge").value);
    const outsideCharge = Number($("outsideCharge").value);

    try {
      await db.collection("settings")
        .doc("delivery")
        .set({
          dhakaCharge,
          outsideCharge
        });

      deliverySettings = {
        dhakaCharge,
        outsideCharge
      };

      updateTotal();

      alert("ডেলিভারি চার্জ সংরক্ষণ হয়েছে।");

    } catch (error) {
      alert("সংরক্ষণ করা যায়নি: " + error.message);
    }
  });
}

// নতুন ওজনের ঘর যোগ
function addWeightRow(weight = "", price = "") {
  const container = $("weightRows");

  if (!container) return;

  const row = document.createElement("div");
  row.className = "weight-row";

  const weightInput = document.createElement("input");
  weightInput.name = "weight[]";
  weightInput.placeholder = "ওজন, যেমন ২৫০ গ্রাম";
  weightInput.required = true;
  weightInput.value = weight;

  const priceInput = document.createElement("input");
  priceInput.name = "price[]";
  priceInput.type = "number";
  priceInput.placeholder = "দাম (টাকা)";
  priceInput.min = "0";
  priceInput.required = true;
  priceInput.value = price;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "বাদ";
  removeButton.onclick = () => row.remove();

  row.append(
    weightInput,
    priceInput,
    removeButton
  );

  container.appendChild(row);
}

// আরও ওজন যোগ বাটন
if ($("addWeightBtn")) {
  $("addWeightBtn").addEventListener("click", () => {
    addWeightRow();
  });
}

// পণ্য সংরক্ষণ
if ($("productForm")) {
  $("productForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!user) {
      alert("আগে অ্যাডমিন হিসেবে লগইন করুন।");
      return;
    }

    const form = event.target;
    const data = new FormData(form);

    const name = data.get("name").trim();
    const description = data.get("description") || "";
    const imageUrl = data.get("imageUrl") || "";
    const id = data.get("id");

    const weightNames = data.getAll("weight[]");
    const prices = data.getAll("price[]");

    const weights = weightNames.map((weight, index) => ({
      weight: weight.trim(),
      price: Number(prices[index])
    })).filter(item =>
      item.weight &&
      Number.isFinite(item.price) &&
      item.price >= 0
    );

    if (!weights.length) {
      alert("কমপক্ষে একটি ওজন ও দাম যোগ করুন।");
      return;
    }

    const productData = {
      name,
      description,
      imageUrl,
      weights,
      updatedAt:
        firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      if (id) {
        await db.collection("products")
          .doc(id)
          .update(productData);

        alert("পণ্য আপডেট হয়েছে।");

      } else {
        productData.createdAt =
          firebase.firestore.FieldValue.serverTimestamp();

        await db.collection("products")
          .add(productData);

        alert("নতুন পণ্য যোগ হয়েছে।");
      }

      form.reset();

      if ($("weightRows")) {
        $("weightRows").innerHTML = "";
        addWeightRow();
      }

      await loadProducts();

    } catch (error) {
      alert("পণ্য সংরক্ষণ করা যায়নি: " + error.message);
    }
  });
}

// পণ্য এডিট
function editP(id) {
  const product = items.find(item => item.id === id);

  if (!product) return;

  const form = $("productForm");

  if (!form) return;

  form.elements.id.value = product.id;
  form.elements.name.value = product.name || "";
  form.elements.description.value =
    product.description || "";
  form.elements.imageUrl.value =
    product.imageUrl || "";

  $("weightRows").innerHTML = "";

  const weights = getWeights(product);

  if (weights.length) {
    weights.forEach(item => {
      addWeightRow(item.weight, item.price);
    });
  } else {
    addWeightRow();
  }

  form.scrollIntoView({
    behavior: "smooth"
  });
}

// অ্যাডমিন পণ্যের তালিকা
function adminProducts() {
  const container = $("adminProducts");

  if (!container) return;

  container.innerHTML = "";

  items.forEach(product => {
    const weights = getWeights(product);

    const priceText = weights.map(item =>
      `${item.weight}: ${cash(item.price)}`
    ).join(" / ");

    const row = document.createElement("div");

    row.innerHTML = `
      <h3>${product.name || ""}</h3>
      <p>${priceText}</p>

      <button onclick="editP('${product.id}')">
        এডিট
      </button>

      <button onclick="deleteP('${product.id}')">
        ডিলিট
      </button>
    `;

    container.appendChild(row);
  });
}

// পণ্য ডিলিট
async function deleteP(id) {
  if (!user) {
    alert("আগে অ্যাডমিন হিসেবে লগইন করুন।");
    return;
  }

  if (!confirm("এই পণ্যটি ডিলিট করতে চান?")) {
    return;
  }

  try {
    await db.collection("products")
      .doc(id)
      .delete();

    await loadProducts();

    alert("পণ্য ডিলিট হয়েছে।");

  } catch (error) {
    alert("ডিলিট করা যায়নি: " + error.message);
  }
}

// অর্ডার জমা
if ($("orderForm")) {
  $("orderForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!cart.length) {
      alert("আপনার কার্ট খালি।");
      return;
    }

    const form = event.target;
    const data = new FormData(form);

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    const zone = data.get("deliveryZone");

    const deliveryCharge =
      zone === "dhaka"
        ? Number(deliverySettings.dhakaCharge)
        : Number(deliverySettings.outsideCharge);

    const order = {
      customerName: data.get("customerName") || "",
      phone: data.get("phone") || "",
      address: data.get("address") || "",
      deliveryZone: zone,
      items: cart.map(item => ({ ...item })),
      subtotal,
      deliveryCharge,
      total: subtotal + deliveryCharge,
      paymentMethod: "Cash on Delivery",
      status: "নতুন অর্ডার",
      createdAt:
        firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection("orders").add(order);

      alert("আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে।");

      cart = [];
      renderCart();

      form.reset();
      updateTotal();

    } catch (error) {
      alert("অর্ডার করা যায়নি: " + error.message);
    }
  });
}

// অ্যাডমিন অর্ডার দেখানো
async function loadOrders() {
  const container =
    $("ordersList") || $("adminOrders");

  if (!container) return;

  try {
    const snapshot = await db.collection("orders")
      .orderBy("createdAt", "desc")
      .get();

    container.innerHTML = "";

    snapshot.forEach(doc => {
      const order = doc.data();

      const productText = (order.items || []).map(item =>
        `${item.name} (${item.w}) × ${item.qty}`
      ).join(", ");

      const row = document.createElement("div");

      row.innerHTML = `
        <h3>অর্ডার: ${doc.id}</h3>
        <p>নাম: ${order.customerName || ""}</p>
        <p>মোবাইল: ${order.phone || ""}</p>
        <p>ঠিকানা: ${order.address || ""}</p>
        <p>পণ্য: ${productText}</p>
        <p>পণ্যের দাম: ${cash(order.subtotal)}</p>
        <p>ডেলিভারি চার্জ: ${cash(order.deliveryCharge)}</p>
        <p>মোট বিল: ${cash(order.total)}</p>
        <p>পেমেন্ট: ক্যাশ অন ডেলিভারি</p>
        <p>অবস্থা: ${order.status || "নতুন অর্ডার"}</p>

        <button onclick="updateOrderStatus('${doc.id}', 'প্রসেসিং')">
          প্রসেসিং
        </button>

        <button onclick="updateOrderStatus('${doc.id}', 'ডেলিভারি সম্পন্ন')">
          ডেলিভারি সম্পন্ন
        </button>
      `;

      container.appendChild(row);
    });

  } catch (error) {
    console.error(error);
    alert("অর্ডার লোড করা যায়নি: " + error.message);
  }
}

// অর্ডারের অবস্থা পরিবর্তন
async function updateOrderStatus(id, status) {
  if (!user) {
    alert("আগে অ্যাডমিন হিসেবে লগইন করুন।");
    return;
  }

  try {
    await db.collection("orders")
      .doc(id)
      .update({ status });

    await loadOrders();

    alert("অর্ডারের অবস্থা আপডেট হয়েছে।");

  } catch (error) {
    alert("আপডেট করা যায়নি: " + error.message);
  }
}

// অ্যাডমিন লগইন
if ($("loginForm")) {
  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const email = $("loginEmail").value;
    const password = $("loginPassword").value;

    try {
      await auth.signInWithEmailAndPassword(
        email,
        password
      );

      alert("লগইন সফল হয়েছে।");

    } catch (error) {
      alert("লগইন হয়নি: " + error.message);
    }
  });
}

// লগআউট
function logout() {
  auth.signOut();
}

// লগইন অবস্থা
auth.onAuthStateChanged(async currentUser => {
  user = currentUser;

  const adminPanel = $("adminPanel");
  const loginArea = $("loginArea");

  if (adminPanel) {
    adminPanel.style.display =
      user ? "block" : "none";
  }

  if (loginArea) {
    loginArea.style.display =
      user ? "none" : "block";
  }

  if (user) {
    await loadProducts();
    await loadOrders();
  }
});

// পেজ চালু হলে
loadProducts();
loadDeliverySettings();

if ($("weightRows") && !$("weightRows").children.length) {
  addWeightRow();
}
