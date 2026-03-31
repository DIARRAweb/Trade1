import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const mainContent = document.getElementById("mainContent");
const authButtons = document.getElementById("authButtons");
const logoutButton = document.getElementById("logoutButton");
const searchInput = document.getElementById("searchInput");

let allProducts = [];

// ===================== AUTH UI =====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    authButtons.classList.add("hidden");
    logoutButton.classList.remove("hidden");
  } else {
    authButtons.classList.remove("hidden");
    logoutButton.classList.add("hidden");
  }
});

// ===================== LOAD PRODUCTS =====================
async function loadProducts() {
  const querySnapshot = await getDocs(collection(db, "products"));
  allProducts = [];

  querySnapshot.forEach((doc) => {
    allProducts.push({ id: doc.id, ...doc.data() });
  });
}

// ===================== DISPLAY PRODUCTS =====================
function displayProducts(products, title = "Produits en vedette") {
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

// ===================== HOME (featured) =====================
window.goHome = function() {
  const featured = allProducts.filter(p => p.featured === true);
  displayProducts(featured, "🔥 Produits en vedette");
}

// ===================== ALL PRODUCTS =====================
window.showAllProducts = function() {
  displayProducts(allProducts, "🛍 Tous les produits");
}

// ===================== SEARCH =====================
window.searchProducts = function() {
  const value = searchInput.value.toLowerCase().trim();

  if (!value) {
    goHome();
    return;
  }

  const filtered = allProducts.filter(p =>
    (p.name && p.name.toLowerCase().includes(value)) ||
    (p.category && p.category.toLowerCase().includes(value))
  );

  displayProducts(filtered, "Résultats de recherche : " + value);
}

// ===================== CATEGORIES =====================
window.showCategories = function() {
  let categories = [...new Set(allProducts.map(p => p.category))];

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
}

window.filterCategory = function(category) {
  const filtered = allProducts.filter(p => p.category === category);
  displayProducts(filtered, "Catégorie : " + category);
}

// ===================== VIEW PRODUCT =====================
window.viewProduct = function(id) {
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

      <p><b>Catégorie :</b> ${product.category}</p>
      <p><b>Vendeur :</b> ${product.sellerName}</p>
      <p><b>Description :</b> ${product.description || "Aucune description."}</p>

      <button style="width:100%; padding:12px; border:none; background:#ff6a00; color:white; border-radius:8px; cursor:pointer;"
        onclick="addToCart('${product.id}')">Ajouter au panier</button>

      <button style="width:100%; margin-top:10px; padding:12px; border:none; background:green; color:white; border-radius:8px; cursor:pointer;"
        onclick="buyNow('${product.id}')">Commander maintenant</button>

      <button style="width:100%; margin-top:10px; padding:12px; border:none; background:#222; color:white; border-radius:8px; cursor:pointer;"
        onclick="chatSeller('${product.id}')">Discuter avec le vendeur</button>
    </div>
  `;
}

// ===================== CART (localStorage) =====================
window.addToCart = function(productId) {
  const product = allProducts.find(p => p.id === productId);

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.push(product);

  localStorage.setItem("cart", JSON.stringify(cart));
  alert("Ajouté au panier !");
}

window.showCart = function() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    mainContent.innerHTML = `<h3 class="section-title">🛒 Panier</h3><p>Votre panier est vide.</p>`;
    return;
  }

  let total = cart.reduce((sum, p) => sum + Number(p.price), 0);

  mainContent.innerHTML = `
    <h3 class="section-title">🛒 Panier</h3>
    <div style="background:white; padding:15px; border-radius:10px;">
      ${cart.map((p, index) => `
        <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
          <img src="${p.imageUrl}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
          <div style="flex:1;">
            <b>${p.name}</b><br>
            <span style="color:#ff6a00;">${p.price} FCFA</span><br>
            <small>${p.sellerName}</small>
          </div>
          <button onclick="removeFromCart(${index})" style="border:none; background:red; color:white; padding:8px; border-radius:6px; cursor:pointer;">X</button>
        </div>
      `).join("")}

      <h3>Total : <span style="color:#ff6a00;">${total} FCFA</span></h3>

      <button style="width:100%; padding:12px; border:none; background:green; color:white; border-radius:8px; cursor:pointer;"
        onclick="checkout()">Valider la commande</button>
    </div>
  `;
}

window.removeFromCart = function(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  showCart();
}

// ===================== PLACEHOLDERS =====================
window.buyNow = function(id) {
  alert("Commande directe en cours de développement !");
}

window.chatSeller = function(id) {
  alert("Messagerie en cours de développement !");
}

window.showMessages = function() {
  mainContent.innerHTML = `<h3 class="section-title">💬 Messages</h3><p>Messagerie bientôt disponible.</p>`;
}

window.showProfile = function() {
  mainContent.innerHTML = `<h3 class="section-title">👤 Moi</h3><p>Profil bientôt disponible.</p>`;
}

// ===================== AUTH ACTIONS =====================
window.logout = async function() {
  await signOut(auth);
  alert("Déconnecté !");
}

window.openLogin = function() {
  window.location.href = "login.html";
}

window.openRegister = function() {
  window.location.href = "register.html";
}

// ===================== START =====================
async function startApp() {
  await loadProducts();
  goHome();
}

startApp();