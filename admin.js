const loginView = document.querySelector("#login-view");
const adminView = document.querySelector("#admin-view");
const loginForm = document.querySelector("#login-form");
const productForm = document.querySelector("#product-form");
const loginStatus = document.querySelector("#login-status");
const productStatus = document.querySelector("#product-status");
const listStatus = document.querySelector("#list-status");
const productList = document.querySelector("#admin-products");
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
