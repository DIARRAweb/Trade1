// app.js
import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ===================== ELEMENTS HTML =====================
const mainContent = document.getElementById("mainContent");
const authButtons = document.getElementById("authButtons");
const logoutButton = document.getElementById("logoutButton");
const searchInput = document.getElementById("searchInput");

// ===================== VARIABLES =====================
let allProducts = [];
let currentUser = null;

// ===================== AUTH STATE =====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authButtons.classList.add("hidden");
    logoutButton.classList.remove("hidden");
  } else {
    currentUser = null;
    authButtons.classList.remove("hidden");
    logoutButton.classList.add("hidden");
  }
});

// ===================== LOAD PRODUCTS =====================
async function loadProducts() {
  const querySnapshot = await getDocs(collection(db, "products"));
  allProducts = [];

  querySnapshot.forEach((docSnap) => {
    allProducts.push({ id: docSnap.id, ...docSnap.data() });
  });
}

// ===================== DISPLAY PRODUCTS =====================
function displayProducts(products, title = "Produits") {
  if (products.length === 0) {
    mainContent.innerHTML = `
      <h3 class="section-title">${title}</h3>
      <p>Aucun produit trouvé.</p>
    `;
    return;
  }

  mainContent.innerHTML = `
    <h3 class="section-title">${title}</h3>
    <div class="products-grid">
      ${products.map(p => `
        <div class="product-card">
          <img src="${p.imageUrl}" alt="${p.name}">
          <h4>${p.name}</h4>
          <p class="price">${p.price} FCFA</p>
          <p class="seller">${p.sellerName}</p>
          <button onclick="viewProduct('${p.id}')">Voir</button>
        </div>
      `).join("")}
    </div>
  `;
}

// ===================== HOME (FEATURED) =====================
window.goHome = function () {
  const featured = allProducts.filter(p => p.featured === true);

  if (featured.length > 0) {
    displayProducts(featured, "🔥 Produits en vedette");
  } else {
    displayProducts(allProducts, "🛍 Tous les produits");
  }
};

// ===================== SHOW ALL PRODUCTS =====================
window.showAllProducts = function () {
  displayProducts(allProducts, "🛍 Tous les produits");
};

// ===================== SEARCH =====================
window.searchProducts = function () {
  const value = searchInput.value.toLowerCase().trim();

  if (!value) {
    goHome();
    return;
  }

  const filtered = allProducts.filter(p =>
    (p.name && p.name.toLowerCase().includes(value)) ||
    (p.category && p.category.toLowerCase().includes(value)) ||
    (p.sellerName && p.sellerName.toLowerCase().includes(value))
  );

  displayProducts(filtered, `Résultats pour : "${value}"`);
};

// ===================== CATEGORIES =====================
window.showCategories = function () {
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

  mainContent.innerHTML = `
    <h3 class="section-title">📂 Catégories</h3>
    <div style="background:white; padding:15px; border-radius:10px;">
      ${categories.map(cat => `
        <p style="padding:12px; border-bottom:1px solid #eee; cursor:pointer;"
           onclick="filterCategory('${cat}')">
           👉 ${cat}
        </p>
      `).join("")}
    </div>
  `;
};

window.filterCategory = function (category) {
  const filtered = allProducts.filter(p => p.category === category);
  displayProducts(filtered, "Catégorie : " + category);
};

// ===================== VIEW PRODUCT =====================
window.viewProduct = function (id) {
  const product = allProducts.find(p => p.id === id);

  if (!product) {
    alert("Produit introuvable !");
    return;
  }

  mainContent.innerHTML = `
    <div style="background:white; padding:15px; border-radius:10px;">
      <img src="${product.imageUrl}" style="width:100%; height:250px; object-fit:cover; border-radius:10px;">

      <h2>${product.name}</h2>
      <h3 style="color:#ff6a00;">${product.price} FCFA</h3>

      <p><b>Catégorie :</b> ${product.category || "Non définie"}</p>
      <p><b>Vendeur :</b> ${product.sellerName || "Inconnu"}</p>

      <p style="margin-top:15px;"><b>Description :</b></p>
      <p>${product.description || "Aucune description."}</p>

      <button style="width:100%; padding:12px; border:none; background:#ff6a00; color:white; border-radius:8px; cursor:pointer;"
        onclick="addToCart('${product.id}')">Ajouter au panier</button>

      <button style="width:100%; margin-top:10px; padding:12px; border:none; background:green; color:white; border-radius:8px; cursor:pointer;"
        onclick="buyNow('${product.id}')">Commander maintenant</button>

      <button style="width:100%; margin-top:10px; padding:12px; border:none; background:#222; color:white; border-radius:8px; cursor:pointer;"
        onclick="chatSeller('${product.id}')">Discuter avec le vendeur</button>

      <button style="width:100%; margin-top:10px; padding:12px; border:none; background:#555; color:white; border-radius:8px; cursor:pointer;"
        onclick="goHome()">⬅ Retour</button>
    </div>
  `;
};

// ===================== CART SYSTEM =====================
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

window.addToCart = function (productId) {
  const product = allProducts.find(p => p.id === productId);

  if (!product) {
    alert("Produit introuvable !");
    return;
  }

  let cart = getCart();

  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      sellerName: product.sellerName,
      qty: 1
    });
  }

  saveCart(cart);
  alert("Produit ajouté au panier !");
};

window.showCart = function () {
  let cart = getCart();

  if (cart.length === 0) {
    mainContent.innerHTML = `
      <h3 class="section-title">🛒 Panier</h3>
      <p>Votre panier est vide.</p>
    `;
    return;
  }

  let total = cart.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0);
  let livraison = 1000; // livraison fixe pour test
  let totalFinal = total + livraison;

  mainContent.innerHTML = `
    <h3 class="section-title">🛒 Panier</h3>

    <div style="background:white; padding:15px; border-radius:10px;">
      ${cart.map((p, index) => `
        <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
          <img src="${p.imageUrl}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
          <div style="flex:1;">
            <b>${p.name}</b><br>
            <span style="color:#ff6a00;">${p.price} FCFA</span><br>
            <small>${p.sellerName}</small><br>
            <small>Quantité : ${p.qty}</small>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <button onclick="increaseQty(${index})" style="border:none; background:green; color:white; padding:6px; border-radius:6px; cursor:pointer;">+</button>
            <button onclick="decreaseQty(${index})" style="border:none; background:#ff6a00; color:white; padding:6px; border-radius:6px; cursor:pointer;">-</button>
            <button onclick="removeFromCart(${index})" style="border:none; background:red; color:white; padding:6px; border-radius:6px; cursor:pointer;">X</button>
          </div>
        </div>
      `).join("")}

      <p><b>Total produits :</b> ${total} FCFA</p>
      <p><b>Livraison :</b> ${livraison} FCFA</p>
      <h3>Total final : <span style="color:#ff6a00;">${totalFinal} FCFA</span></h3>

      <button style="width:100%; padding:12px; border:none; background:green; color:white; border-radius:8px; cursor:pointer;"
        onclick="checkout()">Valider la commande</button>
    </div>
  `;
};

window.increaseQty = function (index) {
  let cart = getCart();
  cart[index].qty += 1;
  saveCart(cart);
  showCart();
};

window.decreaseQty = function (index) {
  let cart = getCart();
  if (cart[index].qty > 1) {
    cart[index].qty -= 1;
  }
  saveCart(cart);
  showCart();
};

window.removeFromCart = function (index) {
  let cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  showCart();
};

window.checkout = function () {
  alert("Paiement et commande bientôt disponible !");
};

// ===================== MESSAGES =====================
window.chatSeller = function () {
  alert("Messagerie en cours de développement !");
};

window.showMessages = function () {
  mainContent.innerHTML = `
    <h3 class="section-title">💬 Messages</h3>
    <p>Messagerie bientôt disponible.</p>
  `;
};

// ===================== PROFILE =====================
window.showProfile = function () {
  if (!currentUser) {
    mainContent.innerHTML = `
      <h3 class="section-title">👤 Moi</h3>
      <p>Connectez-vous pour accéder à votre compte.</p>
    `;
    return;
  }

  mainContent.innerHTML = `
    <h3 class="section-title">👤 Mon compte</h3>
    <div style="background:white; padding:15px; border-radius:10px;">
      <p><b>Email :</b> ${currentUser.email}</p>
      <p>Plus d'informations bientôt disponibles (rôle, commandes, historique...).</p>
    </div>
  `;
};

// ===================== BUY NOW =====================
window.buyNow = function () {
  alert("Commande directe en cours de développement !");
};

// ===================== LOGOUT =====================
window.logout = async function () {
  await signOut(auth);
  alert("Déconnecté !");
  goHome();
};

// ===================== MODALS =====================
window.openLogin = function () {
  document.getElementById("loginModal").classList.remove("hidden");
};

window.closeLogin = function () {
  document.getElementById("loginModal").classList.add("hidden");
};

window.openRegister = function () {
  document.getElementById("registerModal").classList.remove("hidden");
};

window.closeRegister = function () {
  document.getElementById("registerModal").classList.add("hidden");
};

// ===================== LOGIN FUNCTION =====================
window.loginUser = async function () {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Connexion réussie !");
    closeLogin();
    goHome();
  } catch (error) {
    alert("Erreur : " + error.message);
  }
};

// ===================== REGISTER FUNCTION =====================
window.registerUser = async function () {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const role = document.getElementById("regRole").value;

  if (!name || !email || !password) {
    alert("Veuillez remplir tous les champs !");
    return;
  }

  if (!role) {
    alert("Choisis un type de compte !");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      role: role,
      createdAt: new Date()
    });

    alert("Compte créé avec succès !");
    closeRegister();
    goHome();
  } catch (error) {
    alert("Erreur : " + error.message);
  }
};

// ===================== START APP =====================
async function startApp() {
  await loadProducts();
  goHome();
}

startApp();
