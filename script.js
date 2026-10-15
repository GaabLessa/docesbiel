const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Abrir menu" : "Fechar menu");
  navigation.classList.toggle("is-open", !isOpen);
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Abrir menu");
    navigation.classList.remove("is-open");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();

// Os filtros consultam os cartões que existem agora, inclusive os carregados do banco.
const filterButtons = document.querySelectorAll(".filter-button");
const productGrid = document.querySelector(".product-grid");
const catalogStatus = document.querySelector("#catalog-status");
let selectedCategory = "todos";

function applyProductFilter() {
  productGrid.querySelectorAll(".product-card[data-category]").forEach((card) => {
    card.hidden = selectedCategory !== "todos" && card.dataset.category !== selectedCategory;
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.filter;
    filterButtons.forEach((item) => {
      const isSelected = item === button;
      item.classList.toggle("is-active", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });
    applyProductFilter();
  });
});

function showCatalogMessage(message) {
  catalogStatus.textContent = message;
  catalogStatus.hidden = false;
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.category = product.category;

  const imageBox = document.createElement("div");
  imageBox.className = "product-image";
  if (product.image_url && product.image_url.startsWith("https://")) {
    const image = document.createElement("img");
    image.src = product.image_url;
    image.alt = product.name;
    image.loading = "lazy";
    imageBox.append(image);
  }

  const tag = document.createElement("span");
  tag.className = "product-tag";
  tag.textContent = product.category === "bolos" ? "Bolo artesanal" : "Doce artesanal";
  imageBox.append(tag);

  const info = document.createElement("div");
  info.className = "product-info";
  const description = document.createElement("div");
  const name = document.createElement("h3");
  name.textContent = product.name;
  const detail = document.createElement("p");
  detail.textContent = product.description || "Preparado com carinho.";
  description.append(name, detail);

  if (product.price_cents !== null) {
    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
      .format(product.price_cents / 100);
    description.append(price);
  }
  info.append(description);

  const orderLink = document.createElement("a");
  orderLink.className = "product-order";
  orderLink.href = "#pedido";
  orderLink.append(document.createTextNode("Tenho interesse "));
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  orderLink.append(arrow);

  card.append(imageBox, info, orderLink);
  return card;
}

async function loadProductsFromSupabase() {
  if (!window.supabaseClient) return; // Sem configuração, a vitrine de demonstração continua aparecendo.

  showCatalogMessage("Carregando produtos do catálogo...");
  const { data, error } = await window.supabaseClient
    .from("products")
    .select("id, name, description, category, price_cents, image_url, sort_order")
    .order("sort_order");

  if (error) {
    showCatalogMessage("Não foi possível carregar os produtos do Supabase. A vitrine de exemplo continua disponível.");
    console.error("Erro ao carregar produtos:", error.message);
    return;
  }

  if (!data.length) {
    showCatalogMessage("Ainda não há produtos ativos no catálogo.");
    return;
  }

  productGrid.replaceChildren(...data.map(createProductCard));
  catalogStatus.hidden = true;
  applyProductFilter();
}

loadProductsFromSupabase();
