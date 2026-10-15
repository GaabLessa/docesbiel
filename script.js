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

// Os botões de categoria mostram apenas os produtos correspondentes.
const filterButtons = document.querySelectorAll(".filter-button");
const productCards = document.querySelectorAll(".product-card[data-category]");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedCategory = button.dataset.filter;

    filterButtons.forEach((item) => {
      const isSelected = item === button;
      item.classList.toggle("is-active", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });

    productCards.forEach((card) => {
      const shouldShow = selectedCategory === "todos" || card.dataset.category === selectedCategory;
      card.hidden = !shouldShow;
    });
  });
});
