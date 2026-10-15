const loginView = document.querySelector("#login-view");
const adminView = document.querySelector("#admin-view");
const loginForm = document.querySelector("#login-form");
const productForm = document.querySelector("#product-form");
const loginStatus = document.querySelector("#login-status");
const productStatus = document.querySelector("#product-status");
const listStatus = document.querySelector("#list-status");
const productList = document.querySelector("#admin-products");
const supabaseClient = window.supabaseClient;

function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

async function loadAdminProducts() {
  showStatus(listStatus, "Carregando produtos...");
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, category, price_cents, is_active")
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
    item.append(name, details);
    productList.append(item);
  });

  showStatus(listStatus, data.length ? `${data.length} produtos no catálogo.` : "Nenhum produto cadastrado ainda.");
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
    const imageUrl = formData.get("image_url").trim();
    showStatus(productStatus, "Salvando produto...");

    const { error } = await supabaseClient.from("products").insert({
      name: formData.get("name").trim(),
      description: formData.get("description").trim(),
      category: formData.get("category"),
      price_cents: rawPrice === "" ? null : Math.round(Number(rawPrice) * 100),
      image_url: imageUrl || null,
      is_active: true,
    });

    if (error) {
      showStatus(productStatus, "Não foi possível salvar. Confira os campos e as permissões do administrador.", true);
      console.error("Erro ao salvar produto:", error.message);
      return;
    }

    productForm.reset();
    showStatus(productStatus, "Produto salvo no catálogo!");
    await loadAdminProducts();
  });

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
