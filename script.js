
const firebaseConfig = {
  apiKey: "এখানে_তোমার_আগের_API_KEY",
  authDomain: "এখানে_তোমার_আগের_AUTH_DOMAIN",
  projectId: "এখানে_তোমার_আগের_PROJECT_ID",
  storageBucket: "এখানে_তোমার_আগের_STORAGE_BUCKET",
  messagingSenderId: "এখানে_তোমার_আগের_MESSAGING_SENDER_ID",
  appId: "এখানে_তোমার_আগের_APP_ID"
};

let db, auth, user = null;
let items = [], cart = [];
let deliverySettings = { dhakaCharge: 70, outsideCharge: 130 };

const $ = id => document.getElementById(id);
const cash = n => "৳" + Number(n || 0).toLocaleString("bn-BD");

function modal(id, on = true) {
  $(id).classList.toggle("open", on);
}

function start() {
  $("year").textContent = new Date().getFullYear();

  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();

  db.collection("products").onSnapshot(s => {
    items = s.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
    if (user) adminProducts();
  });

  db.collection("settings").doc("general").onSnapshot(s => {
    if (s.exists) {
      const d = s.data();
      deliverySettings = {
        dhakaCharge: Number(d.dhakaCharge ?? 70),
        outsideCharge: Number(d.outsideCharge ?? 130)
      };
    }
    $("deliveryForm").elements.dhakaCharge.value = deliverySettings.dhakaCharge;
    $("deliveryForm").elements.outsideCharge.value = deliverySettings.outsideCharge;
  });

  auth.onAuthStateChanged(u => {
    user = u;
    $("loginForm").hidden = !!u;
    $("adminPanel").hidden = !u;

    if (u) {
      loadOrders();
      adminProducts();
    }
  });
}

function render() {
  $("productGrid").innerHTML = items.map(p => `
    <article class="product">
      <img src="${p.imageUrl || ""}" onerror="this.style.display='none'">
      <h3>${p.name || ""}</h3>
      <p>${p.description || ""}</p>
      <select id="w-${p.id}">
        <option value="500gm">৫০০ গ্রাম — ${cash(p.price_500gm)}</option>
        <option value="1kg">১ কেজি — ${cash(p.price_1kg)}</option>
      </select>
      <button class="btn" onclick="add('${p.id}')">কার্টে যোগ করুন</button>
    </article>
  `).join("") || "এখনো পণ্য যোগ করা হয়নি।";
}

function add(id) {
  const p = items.find(x => x.id === id);
  if (!p) return;

  const w = $("w-" + id).value;
  const price = Number(w === "1kg" ? p.price_1kg : p.price_500gm);
  const x = cart.find(x => x.id === id && x.w === w);

  if (x) x.qty++;
  else cart.push({ id, name: p.name, w, price, qty: 1 });

  cartRender();
}

function cartRender() {
  $("cartCount").textContent = cart.reduce((a, x) => a + x.qty, 0);

  $("cartItems").innerHTML = cart.map((x, i) => `
    <div class="cartrow">
      ${x.name} — ${x.w} × ${x.qty}
      <b>${cash(x.price * x.qty)}</b>
      <button onclick="cart.splice(${i},1);cartRender()">বাদ</button>
    </div>
  `).join("");

  $("cartTotal").textContent = cash(
    cart.reduce((a, x) => a + x.price * x.qty, 0)
  );
}

$("cartToggle").onclick = () => $("cart").classList.add("open");
$("cartClose").onclick = () => $("cart").classList.remove("open");
$("adminOpen").onclick = () => modal("admin");

document.querySelectorAll("[data-close]").forEach(b => {
  b.onclick = () => modal(b.dataset.close, false);
});

$("checkoutBtn").onclick = () => {
  if (!cart.length) return alert("কার্ট খালি");
  $("cart").classList.remove("open");
  modal("checkout");
};

$("orderForm").onsubmit = async e => {
  e.preventDefault();

  const f = new FormData(e.target);
  const zone = f.get("deliveryZone");

  if (!zone) {
    $("orderMsg").textContent = "ডেলিভারি এলাকা নির্বাচন করুন।";
    return;
  }

  const subtotal = cart.reduce((a, x) => a + x.price * x.qty, 0);

  const charge = zone === "dhaka"
    ? deliverySettings.dhakaCharge
    : deliverySettings.outsideCharge;

  try {
    const r = await db.collection("orders").add({
      customerName: f.get("name"),
      phone: f.get("phone"),
      address: f.get("address"),
      deliveryZone: zone,
      deliveryCharge: charge,
      items: cart,
      subtotal: subtotal,
      total: subtotal + charge,
      paymentMethod: "Cash on Delivery",
      status: "নতুন অর্ডার",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    $("orderMsg").textContent =
      "অর্ডার গ্রহণ করা হয়েছে। অর্ডার আইডি: " + r.id;

    cart = [];
    cartRender();
    e.target.reset();

  } catch (err) {
    $("orderMsg").textContent = "অর্ডার হয়নি: " + err.message;
  }
};

$("loginForm").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);

  try {
    await auth.signInWithEmailAndPassword(
      f.get("email"),
      f.get("password")
    );
    $("adminMsg").textContent = "লগইন সফল";
  } catch (err) {
    $("adminMsg").textContent = err.message;
  }
};

$("logout").onclick = () => auth.signOut();

$("productForm").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);

  const data = {
    name: f.get("name"),
    description: f.get("description"),
    imageUrl: f.get("imageUrl"),
    price_1kg: Number(f.get("price_1kg")),
    price_500gm: Number(f.get("price_500gm")),
    weights: ["500gm", "1kg"]
  };

  try {
    const id = f.get("id");

    if (id) {
      await db.collection("products").doc(id).update(data);
    } else {
      await db.collection("products").add(data);
    }

    e.target.reset();
    $("adminMsg").textContent = "পণ্য সংরক্ষণ হয়েছে";

  } catch (err) {
    $("adminMsg").textContent = err.message;
  }
};

$("deliveryForm").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);

  try {
    const settings = {
      dhakaCharge: Number(f.get("dhakaCharge")),
      outsideCharge: Number(f.get("outsideCharge"))
    };

    await db.collection("settings").doc("general").set(
      settings,
      { merge: true }
    );

    deliverySettings = settings;
    $("adminMsg").textContent = "ডেলিভারি চার্জ সংরক্ষণ হয়েছে";

  } catch (err) {
    $("adminMsg").textContent = err.message;
  }
};

function adminProducts() {
  $("adminProducts").innerHTML = items.map(p => `
    <div class="adminrow">
      ${p.name} — ${cash(p.price_500gm)} / ${cash(p.price_1kg)}
      <button onclick="editP('${p.id}')">Edit</button>
      <button onclick="delP('${p.id}')">Delete</button>
    </div>
  `).join("");
}

function editP(id) {
  const p = items.find(x => x.id === id);
  const f = $("productForm");

  f.elements.id.value = id;
  f.elements.name.value = p.name || "";
  f.elements.description.value = p.description || "";
  f.elements.imageUrl.value = p.imageUrl || "";
  f.elements.price_1kg.value = p.price_1kg || 0;
  f.elements.price_500gm.value = p.price_500gm || 0;
}

async function delP(id) {
  if (confirm("পণ্য মুছবেন?")) {
    await db.collection("products").doc(id).delete();
  }
}

function loadOrders() {
  db.collection("orders")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot(s => {
      $("orders").innerHTML = s.docs.map(d => {
        const o = d.data();

        return `
          <div class="adminrow">
            <b>${o.customerName}</b> ${o.phone}<br>
            ${o.address}<br>
            ডেলিভারি এলাকা: ${
              o.deliveryZone === "dhaka" ? "ঢাকার মধ্যে" :
              o.deliveryZone === "outside" ? "ঢাকার বাইরে" : "পুরোনো অর্ডার"
            }<br>
            ডেলিভারি চার্জ: ${cash(o.deliveryCharge)}<br>
            ${(o.items || []).map(x =>
              x.name + " " + x.w + " × " + x.qty
            ).join(", ")}<br>
            পণ্যের দাম: ${cash(o.subtotal)}<br>
            <b>সর্বমোট: ${cash(o.total)}</b> · COD · ${o.status}<br>
            <button onclick="status('${d.id}','প্রসেসিং')">প্রসেসিং</button>
            <button onclick="status('${d.id}','ডেলিভারি সম্পন্ন')">সম্পন্ন</button>
          </div>
        `;
      }).join("") || "অর্ডার নেই";
    });
}

async function status(id, s) {
  await db.collection("orders").doc(id).update({ status: s });
}

start();
