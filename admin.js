const loginView = document.querySelector("#login-view");
const adminView = document.querySelector("#admin-view");
const loginForm = document.querySelector("#login-form");
const productForm = document.querySelector("#product-form");
const loginStatus = document.querySelector("#login-status");
const productStatus = document.querySelector("#product-status");
const listStatus = document.querySelector("#list-status");
const productList = document.querySelector("#admin-products");
const requestsList = document.querySelector("#admin-requests");
const requestsStatus = document.querySelector("#requests-status");
const deliveryZoneForm = document.querySelector("#delivery-zone-form");
const deliveryZoneList = document.querySelector("#delivery-zones");
const zonesStatus = document.querySelector("#zones-status");
const productFormTitle = document.querySelector("#product-form-title");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const currentImageNote = document.querySelector("#current-image-note");
const supabaseClient = window.supabaseClient;
let editingProduct = null;

function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

async function loadAdminProducts() {
  showStatus(listStatus, "Carregando produtos...");
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, description, category, price_cents, image_url, is_active")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) {
    showStatus(listStatus, "Não consegui carregar o catálogo. Confira as políticas do banco.", true);
    console.error("Erro ao carregar produtos:", error.message);
    return;
  }

  productList.replaceChildren();
  data.forEach((product) => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = product.name;
    const details = document.createElement("span");
    const price = product.price_cents === null
      ? "Preço a definir"
      : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price_cents / 100);
    details.textContent = `${product.category === "bolos" ? "Bolo" : "Doce"} · ${price}${product.is_active ? "" : " · Inativo"}`;
    const textGroup = document.createElement("div");
    textGroup.className = "admin-product-text";
    textGroup.append(name, details);
    const editButton = document.createElement("button");
    editButton.className = "button button-outline admin-edit-button";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.setAttribute("aria-label", `Editar ${product.name}`);
    editButton.addEventListener("click", () => startEditingProduct(product));
    const actions = document.createElement("div");
    actions.className = "admin-product-actions";
    const deleteButton = document.createElement("button");
    deleteButton.className = "button button-outline admin-delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";
    deleteButton.setAttribute("aria-label", `Excluir ${product.name}`);
    deleteButton.addEventListener("click", () => deleteProduct(product, deleteButton));
    actions.append(editButton, deleteButton);
    item.append(textGroup, actions);
    productList.append(item);
  });

  showStatus(listStatus, data.length ? `${data.length} produtos no catálogo.` : "Nenhum produto cadastrado ainda.");
}

const requestStatusLabels = {
  pending: "Aguardando resposta",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

async function loadAdminRequests() {
  showStatus(requestsStatus, "Carregando solicitações...");
  const { data, error } = await supabaseClient
    .from("order_requests")
    .select("id, customer_name, customer_phone, customer_email, product_name, quantity, preferred_date, preferred_time, delivery_method, delivery_postal_code, delivery_city, delivery_neighborhood, delivery_address, delivery_number, delivery_complement, delivery_fee_cents, notes, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showStatus(requestsStatus, "Não consegui carregar as solicitações. Confira se a etapa de agendamentos foi configurada.", true);
    console.error("Erro ao carregar solicitações:", error.message);
    return;
  }

  requestsList.replaceChildren();
  data.forEach((request) => {
    const item = document.createElement("li");
    item.className = "admin-request-card";
    const heading = document.createElement("div");
    heading.className = "admin-request-heading";
    const customer = document.createElement("strong");
    customer.textContent = request.customer_name;
    const statusLabel = document.createElement("span");
    statusLabel.className = "request-status-badge";
    statusLabel.textContent = requestStatusLabels[request.status] || request.status;
    heading.append(customer, statusLabel);

    const contact = document.createElement("p");
    contact.textContent = `Contato: ${request.customer_phone}${request.customer_email ? ` · ${request.customer_email}` : ""}`;
    const product = document.createElement("p");
    product.textContent = `Pedido: ${request.quantity} × ${request.product_name}`;
    const date = document.createElement("p");
    const requestedDate = new Date(`${request.preferred_date}T12:00:00Z`);
    const formattedDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(requestedDate);
    const formattedTime = request.preferred_time ? ` às ${request.preferred_time.slice(0, 5)}` : " (sem horário definido)";
    date.textContent = `Data desejada: ${formattedDate}${formattedTime}`;
    item.append(heading, contact, product, date);

    const delivery = document.createElement("p");
    if (request.delivery_method === "delivery") {
      const address = [request.delivery_address, request.delivery_number, request.delivery_complement]
        .filter(Boolean).join(", ");
      const area = [request.delivery_neighborhood, request.delivery_city, request.delivery_postal_code]
        .filter(Boolean).join(" · ");
      const fee = request.delivery_fee_cents === null
        ? "Frete a confirmar"
        : `Frete estimado: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(request.delivery_fee_cents / 100)}`;
      delivery.textContent = `Entrega: ${address} · ${area} · ${fee}`;
    } else {
      delivery.textContent = "Retirada no local · sem taxa de entrega";
    }
    item.append(delivery);

    if (request.notes) {
      const notes = document.createElement("p");
      notes.textContent = `Detalhes: ${request.notes}`;
      item.append(notes);
    }

    const controls = document.createElement("div");
    controls.className = "request-controls";
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Status do pedido de ${request.customer_name}`);
    Object.entries(requestStatusLabels).forEach(([value, label]) => {
      const option = new Option(label, value);
      option.selected = value === request.status;
      select.add(option);
    });
    const saveButton = document.createElement("button");
    saveButton.className = "button button-outline admin-edit-button";
    saveButton.type = "button";
    saveButton.textContent = "Atualizar status";
    saveButton.addEventListener("click", () => updateRequestStatus(request.id, select.value, saveButton));
    controls.append(select, saveButton);
    item.append(controls);
    requestsList.append(item);
  });

  showStatus(requestsStatus, data.length ? `${data.length} solicitação(ões).` : "Nenhuma solicitação recebida ainda.");
}

let adminDeliveryZones = [];

function formatPostalCode(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : value;
}

async function loadAdminDeliveryZones() {
  showStatus(zonesStatus, "Carregando regiões...");
  const { data, error } = await supabaseClient
    .from("delivery_zones")
    .select("id, name, postal_code_start, postal_code_end, fee_cents")
    .order("postal_code_start");

  if (error) {
    showStatus(zonesStatus, "Não consegui carregar as regiões. Confira a configuração dos agendamentos.", true);
    console.error("Erro ao carregar regiões:", error.message);
    return;
  }

  adminDeliveryZones = data || [];
  deliveryZoneList.replaceChildren();
  adminDeliveryZones.forEach((zone) => {
    const item = document.createElement("li");
    const details = document.createElement("span");
    const fee = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(zone.fee_cents / 100);
    details.textContent = `${zone.name} · CEP ${formatPostalCode(zone.postal_code_start)} a ${formatPostalCode(zone.postal_code_end)} · ${fee}`;
    const removeButton = document.createElement("button");
    removeButton.className = "button button-outline admin-delete-button";
    removeButton.type = "button";
    removeButton.textContent = "Excluir região";
    removeButton.addEventListener("click", async () => {
      if (!window.confirm(`Excluir a região “${zone.name}”? Pedidos já recebidos não serão alterados.`)) return;
      removeButton.disabled = true;
      const { error: deleteError } = await supabaseClient.from("delivery_zones").delete().eq("id", zone.id);
      if (deleteError) {
        removeButton.disabled = false;
        showStatus(zonesStatus, "Não consegui excluir esta região.", true);
        console.error("Erro ao excluir região:", deleteError.message);
        return;
      }
      await loadAdminDeliveryZones();
      showStatus(zonesStatus, "Região excluída.");
    });
    item.append(details, removeButton);
    deliveryZoneList.append(item);
  });

  showStatus(zonesStatus, adminDeliveryZones.length ? `${adminDeliveryZones.length} região(ões) cadastrada(s).` : "Nenhuma região cadastrada ainda.");
}

async function saveDeliveryZone(event) {
  event.preventDefault();
  const formData = new FormData(deliveryZoneForm);
  const start = formData.get("postal_code_start").replace(/\D/g, "");
  const end = formData.get("postal_code_end").replace(/\D/g, "");
  const startNumber = Number(start);
  const endNumber = Number(end);
  const fee = Number(formData.get("fee"));

  if (start.length !== 8 || end.length !== 8 || startNumber > endNumber) {
    showStatus(zonesStatus, "Informe uma faixa válida: CEP inicial e final com 8 números, em ordem.", true);
    return;
  }
  if (!Number.isFinite(fee) || fee < 0) {
    showStatus(zonesStatus, "Informe um valor de frete válido.", true);
    return;
  }
  const overlaps = adminDeliveryZones.some((zone) =>
    startNumber <= Number(zone.postal_code_end) && endNumber >= Number(zone.postal_code_start));
  if (overlaps) {
    showStatus(zonesStatus, "Essa faixa de CEP se sobrepõe a uma região existente. Ajuste os limites.", true);
    return;
  }

  const saveButton = deliveryZoneForm.querySelector('[type="submit"]');
  saveButton.disabled = true;
  showStatus(zonesStatus, "Salvando região...");
  const { error } = await supabaseClient.from("delivery_zones").insert({
    name: formData.get("name").trim(),
    postal_code_start: start,
    postal_code_end: end,
    fee_cents: Math.round(fee * 100),
    is_active: true,
  });
  saveButton.disabled = false;

  if (error) {
    showStatus(zonesStatus, "Não consegui salvar a região. Confira os CEPs e tente novamente.", true);
    console.error("Erro ao salvar região:", error.message);
    return;
  }

  deliveryZoneForm.reset();
  await loadAdminDeliveryZones();
  showStatus(zonesStatus, "Região e taxa cadastradas.");
}

async function updateRequestStatus(requestId, status, button) {
  button.disabled = true;
  const { error } = await supabaseClient.from("order_requests").update({ status }).eq("id", requestId);
  button.disabled = false;

  if (error) {
    showStatus(requestsStatus, "Não consegui atualizar o status. Tente novamente.", true);
    console.error("Erro ao atualizar status:", error.message);
    return;
  }

  await loadAdminRequests();
  showStatus(requestsStatus, "Status atualizado.");
}

async function deleteProduct(product, button) {
  const confirmed = window.confirm(`Tem certeza de que deseja excluir “${product.name}”? Essa ação não pode ser desfeita.`);
  if (!confirmed) return;

  button.disabled = true;
  showStatus(listStatus, `Excluindo ${product.name}...`);
  const { error } = await supabaseClient.from("products").delete().eq("id", product.id);

  if (error) {
    button.disabled = false;
    showStatus(listStatus, "Não foi possível excluir o produto. Confira as permissões do administrador.", true);
    console.error("Erro ao excluir produto:", error.message);
    return;
  }

  let imageCleanupFailed = false;
  if (product.image_url) {
    try {
      const imagePath = new URL(product.image_url).pathname.split("/storage/v1/object/public/product-images/")[1];
      if (imagePath) {
        const { error: imageError } = await supabaseClient.storage.from("product-images").remove([decodeURIComponent(imagePath)]);
        imageCleanupFailed = Boolean(imageError);
        if (imageError) console.error("Produto excluído; não consegui remover sua imagem:", imageError.message);
      }
    } catch (error) {
      imageCleanupFailed = true;
      console.error("Produto excluído; não consegui identificar a imagem para removê-la:", error);
    }
  }

  if (editingProduct?.id === product.id) stopEditingProduct();
  await loadAdminProducts();
  if (imageCleanupFailed) {
    showStatus(listStatus, "Produto excluído. A imagem ficou no armazenamento e pode ser removida depois.", true);
  } else {
    showStatus(listStatus, "Produto excluído.");
  }
}

function startEditingProduct(product) {
  editingProduct = product;
  productForm.elements.name.value = product.name;
  productForm.elements.description.value = product.description || "";
  productForm.elements.category.value = product.category;
  productForm.elements.is_active.value = String(product.is_active);
  productForm.elements.price.value = product.price_cents === null ? "" : (product.price_cents / 100).toFixed(2);
  productForm.elements.image_file.value = "";
  productFormTitle.textContent = "Editar produto";
  productForm.querySelector('[type="submit"]').innerHTML = 'Salvar alterações <span aria-hidden="true">→</span>';
  cancelEditButton.hidden = false;
  currentImageNote.hidden = !product.image_url;
  showStatus(productStatus, product.image_url ? "Edite os campos; selecione outra imagem apenas se quiser substituí-la." : "Edite os campos do produto.");
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopEditingProduct() {
  editingProduct = null;
  productForm.reset();
  productFormTitle.textContent = "Adicionar produto";
  productForm.querySelector('[type="submit"]').innerHTML = 'Salvar produto <span aria-hidden="true">→</span>';
  cancelEditButton.hidden = true;
  currentImageNote.hidden = true;
  showStatus(productStatus, "");
}

async function showAdminIfAuthorized(session) {
  loginView.hidden = true;
  adminView.hidden = true;
  showStatus(loginStatus, "Verificando autorização...");

  const { data: isAdmin, error } = await supabaseClient.rpc("is_admin");
  if (error || !isAdmin) {
    await supabaseClient.auth.signOut();
    loginView.hidden = false;
    adminView.hidden = true;
    showStatus(loginStatus, error ? "Não foi possível verificar a autorização. Confirme se as regras do administrador foram instaladas." : "Esta conta não tem acesso à área administrativa.", true);
    return;
  }

  document.querySelector("#admin-account").textContent = session.user.email;
  loginView.hidden = true;
  adminView.hidden = false;
  await loadAdminProducts();
  await loadAdminRequests();
  await loadAdminDeliveryZones();
}

if (!supabaseClient) {
  showStatus(loginStatus, "A conexão com o Supabase ainda não está configurada.", true);
} else {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    showStatus(loginStatus, "Entrando...");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (error) {
      showStatus(loginStatus, "Não foi possível entrar. Confira o e-mail e a senha.", true);
      return;
    }

    await showAdminIfAuthorized(data.session);
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(productForm);
    const rawPrice = formData.get("price");
    const imageFile = formData.get("image_file");
    let imageUrl = editingProduct?.image_url || null;

    if (imageFile.size > 0) {
      const allowedTypes = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      if (!allowedTypes[imageFile.type]) {
        showStatus(productStatus, "Escolha uma imagem PNG, JPG ou WebP.", true);
        return;
      }
      if (imageFile.size > 5 * 1024 * 1024) {
        showStatus(productStatus, "A imagem precisa ter no máximo 5 MB.", true);
        return;
      }

      showStatus(productStatus, "Enviando imagem para o Supabase...");
      const imagePath = `products/${crypto.randomUUID()}.${allowedTypes[imageFile.type]}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("product-images")
        .upload(imagePath, imageFile, { contentType: imageFile.type, upsert: false });

      if (uploadError) {
        showStatus(productStatus, "Não consegui enviar a imagem. Confira se o armazenamento do Supabase foi configurado.", true);
        console.error("Erro ao enviar imagem:", uploadError.message);
        return;
      }

      ({ data: { publicUrl: imageUrl } } = supabaseClient.storage
        .from("product-images")
        .getPublicUrl(imagePath));
    }

    showStatus(productStatus, "Salvando produto...");

    const productData = {
      name: formData.get("name").trim(),
      description: formData.get("description").trim(),
      category: formData.get("category"),
      price_cents: rawPrice === "" ? null : Math.round(Number(rawPrice) * 100),
      image_url: imageUrl || null,
      is_active: formData.get("is_active") === "true",
    };
    const result = editingProduct
      ? await supabaseClient.from("products").update(productData).eq("id", editingProduct.id)
      : await supabaseClient.from("products").insert(productData);
    const { error } = result;

    if (error) {
      showStatus(productStatus, "Não foi possível salvar. Confira as permissões do administrador.", true);
      console.error("Erro ao salvar produto:", error.message);
      return;
    }

    const wasEditing = Boolean(editingProduct);
    stopEditingProduct();
    showStatus(productStatus, wasEditing ? "Alterações salvas no produto!" : "Produto salvo no catálogo!");
    await loadAdminProducts();
  });

  cancelEditButton.addEventListener("click", stopEditingProduct);
  deliveryZoneForm.addEventListener("submit", saveDeliveryZone);

  document.querySelector("#logout-button").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    adminView.hidden = true;
    loginView.hidden = false;
    loginForm.reset();
    showStatus(loginStatus, "Você saiu da área administrativa.");
  });

  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) showAdminIfAuthorized(session);
  });
}
