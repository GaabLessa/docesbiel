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
const bookingForm = document.querySelector("#booking-form");
const bookingProduct = document.querySelector("#booking-product");
const bookingStatus = document.querySelector("#booking-status");
const bookingSubmit = document.querySelector("#booking-submit");
const deliveryMethod = document.querySelector("#delivery-method");
const deliveryAddressFields = document.querySelector("#delivery-address-fields");
const deliveryFeePreview = document.querySelector("#delivery-fee-preview");
const deliveryAddressInputs = ["delivery_postal_code", "delivery_city", "delivery_neighborhood", "delivery_address", "delivery_number"];
let activeDeliveryZones = [];
let selectedCategory = "todos";

function updateDeliveryFields() {
  const isDelivery = deliveryMethod.value === "delivery";
  deliveryAddressFields.hidden = !isDelivery;
  deliveryFeePreview.hidden = !isDelivery;
  deliveryAddressInputs.forEach((name) => {
    bookingForm.elements[name].required = isDelivery;
  });
  updateFreightEstimate();
}

function findDeliveryZone(postalCode) {
  const digits = postalCode.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const code = Number(digits);
  return activeDeliveryZones.find((zone) => code >= Number(zone.postal_code_start) && code <= Number(zone.postal_code_end));
}

function updateFreightEstimate() {
  if (deliveryMethod.value !== "delivery") return;
  const zone = findDeliveryZone(bookingForm.elements.delivery_postal_code.value);
  if (zone) {
    deliveryFeePreview.textContent = `Região ${zone.name}: frete estimado de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(zone.fee_cents / 100)}. A confeitaria confirmará o valor.`;
    deliveryFeePreview.classList.remove("is-error");
  } else {
    deliveryFeePreview.textContent = activeDeliveryZones.length
      ? "Ainda não há uma taxa cadastrada para este CEP; o frete será combinado com a confeitaria."
      : "A confeitaria ainda não cadastrou as regiões e taxas de entrega.";
    deliveryFeePreview.classList.add("is-error");
  }
}

async function loadDeliveryZones() {
  if (!window.supabaseClient) return;
  const { data, error } = await window.supabaseClient
    .from("delivery_zones")
    .select("name, postal_code_start, postal_code_end, fee_cents")
    .eq("is_active", true);
  if (error) {
    console.error("Erro ao carregar regiões de entrega:", error.message);
    return;
  }
  activeDeliveryZones = data || [];
  updateFreightEstimate();
}

function setMinimumBookingDate() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.querySelector("#preferred-date").min = localDate;
}

async function loadBookingProducts() {
  if (!window.supabaseClient) {
    bookingProduct.innerHTML = '<option value="">Catálogo indisponível</option>';
    bookingSubmit.disabled = true;
    showBookingMessage("A conexão com o catálogo ainda não está configurada.", true);
    return;
  }

  const { data, error } = await window.supabaseClient
    .from("products")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error || !data.length) {
    bookingProduct.innerHTML = '<option value="">Nenhum produto disponível</option>';
    bookingSubmit.disabled = true;
    showBookingMessage(error ? "Não consegui carregar os produtos. Tente novamente mais tarde." : "Ainda não há produtos ativos para encomenda.", true);
    if (error) console.error("Erro ao carregar opções de encomenda:", error.message);
    return;
  }

  const placeholder = new Option("Selecione um produto", "");
  bookingProduct.replaceChildren(placeholder);
  data.forEach((product) => {
    const option = new Option(product.name, product.id);
    option.dataset.productName = product.name;
    bookingProduct.add(option);
  });
  bookingSubmit.disabled = false;
}

function showBookingMessage(message, isError = false) {
  bookingStatus.textContent = message;
  bookingStatus.classList.toggle("is-error", isError);
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!window.supabaseClient) return;

  const formData = new FormData(bookingForm);
  const selectedOption = bookingProduct.selectedOptions[0];
  const request = {
    customer_name: formData.get("customer_name").trim(),
    customer_phone: formData.get("customer_phone").trim(),
    customer_email: formData.get("customer_email").trim() || null,
    product_id: bookingProduct.value,
    product_name: selectedOption.dataset.productName,
    quantity: Number(formData.get("quantity")),
    preferred_date: formData.get("preferred_date"),
    preferred_time: formData.get("preferred_time") || null,
    delivery_method: formData.get("delivery_method"),
    delivery_fee_cents: formData.get("delivery_method") === "delivery" ? findDeliveryZone(formData.get("delivery_postal_code"))?.fee_cents ?? null : 0,
    delivery_postal_code: formData.get("delivery_method") === "delivery" ? formData.get("delivery_postal_code").replace(/\D/g, "") : null,
    delivery_city: formData.get("delivery_method") === "delivery" ? formData.get("delivery_city").trim() : null,
    delivery_neighborhood: formData.get("delivery_method") === "delivery" ? formData.get("delivery_neighborhood").trim() : null,
    delivery_address: formData.get("delivery_method") === "delivery" ? formData.get("delivery_address").trim() : null,
    delivery_number: formData.get("delivery_method") === "delivery" ? formData.get("delivery_number").trim() : null,
    delivery_complement: formData.get("delivery_method") === "delivery" ? formData.get("delivery_complement").trim() || null : null,
    notes: formData.get("notes").trim() || null,
  };

  bookingSubmit.disabled = true;
  showBookingMessage("Enviando sua solicitação...");
  const { error } = await window.supabaseClient.from("order_requests").insert(request);
  bookingSubmit.disabled = false;

  if (error) {
    showBookingMessage("Não consegui enviar agora. Confira os campos e tente novamente.", true);
    console.error("Erro ao enviar solicitação de encomenda:", error.message);
    return;
  }

  bookingForm.reset();
  updateDeliveryFields();
  setMinimumBookingDate();
  showBookingMessage("Solicitação enviada! A confeitaria vai confirmar a disponibilidade pelo contato informado.");
});

deliveryMethod.addEventListener("change", updateDeliveryFields);
bookingForm.elements.delivery_postal_code.addEventListener("input", updateFreightEstimate);
updateDeliveryFields();
setMinimumBookingDate();
loadBookingProducts();
loadDeliveryZones();

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
  orderLink.href = "#agendamento";
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
