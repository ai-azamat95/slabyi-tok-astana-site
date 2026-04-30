const wifiCameras = {
  outdoor: { title: "Wi-Fi камера уличная", price: 65000 },
  indoor: { title: "Wi-Fi камера внутренняя", price: 58000 },
};

const ipPrices = {
  camera: 15000,
  consumables: 10000,
  installPerCamera: 13000,
  monitor: 42000,
  box6u: 35500,
};

const hddOptions = {
  "500gb": { title: "Жесткий диск 500 ГБ", price: 15500, baseDays: 30 },
  "1tb": { title: "Жесткий диск 1 ТБ", price: 27000, baseDays: 60 },
  "2tb": { title: "Жесткий диск 2 ТБ", price: 47000, baseDays: 120 },
  "4tb": { title: "Жесткий диск 4 ТБ", price: 67000, baseDays: 240 },
  "6tb": { title: "Жесткий диск 6 ТБ", price: 100000, baseDays: 360 },
  "8tb": { title: "Жесткий диск 8 ТБ", price: 160000, baseDays: 480 },
};

const objectDefaults = {
  flat: 4,
  house: 6,
  business: 8,
};

const formatter = new Intl.NumberFormat("ru-KZ", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});

const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const installedCounter = document.querySelector("#installedCounter");
const cameras = document.querySelector("#cameras");
const cameraCountLabel = document.querySelector("#cameraCountLabel");
const calcTotal = document.querySelector("#calcTotal");
const estimateList = document.querySelector("#estimateList");
const calcRequestLink = document.querySelector("#calcRequestLink");
const calculator = document.querySelector(".calculator");
const modal = document.querySelector("#leadModal");
const modalSummary = document.querySelector("#modalSummary");
const leadForm = document.querySelector("#leadForm");
const leadName = document.querySelector("#leadName");
const leadPhone = document.querySelector("#leadPhone");
const leadComment = document.querySelector("#leadComment");
const barlauGrid = document.querySelector("#barlauGrid");
const shopTabs = document.querySelector("#shopTabs");
const cartModal = document.querySelector("#cartModal");
const cartItems = document.querySelector("#cartItems");
const cartEmpty = document.querySelector("#cartEmpty");
const cartTotal = document.querySelector("#cartTotal");
const cartCheckout = document.querySelector("#cartCheckout");
const cartCount = document.querySelector("#cartCount");
const cartCountInline = document.querySelector("#cartCountInline");
const monitorOption = document.querySelector("#monitorOption");
const boxOption = document.querySelector("#boxOption");

let lastTotal = 0;
let lastEstimate = [];
let activeShopGroup = "all";
let cart = loadCart();
let installedCameraCount = 1736;
const requestEmail = "manus@acahydraulic.kz";
const requestPhone = "8 707 560 44 53";
const whatsappUrl = "https://wa.me/77075604453";

function money(value) {
  return formatter.format(value).replace(/\s?KZT/, "₸");
}

function formatCount(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function startInstalledCounter() {
  if (!installedCounter) return;

  installedCounter.textContent = formatCount(installedCameraCount);
  window.setInterval(() => {
    installedCameraCount += 1;
    installedCounter.textContent = formatCount(installedCameraCount);
  }, 9000);
}

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value;
}

function getRecorder(cameraCount) {
  if (cameraCount <= 4) return { title: "Регистратор 4-канальный", price: 27000 };
  if (cameraCount <= 8) return { title: "Регистратор 8-канальный", price: 37000 };
  if (cameraCount <= 16) return { title: "Регистратор 16-канальный", price: 47000 };
  return { title: "Регистратор 32-канальный", price: 67000 };
}

function getPoeSwitch(cameraCount) {
  if (cameraCount <= 4) return { title: "PoE коммутатор 6 портов", price: 13000 };
  if (cameraCount <= 8) return { title: "PoE коммутатор 10 портов", price: 17000 };
  if (cameraCount <= 16) return { title: "PoE коммутатор 16 портов", price: 55000 };
  return { title: "PoE коммутатор 24 порта", price: 86000 };
}

function getCable(cameraCount) {
  const meters = Math.ceil(cameraCount / 4) * 100;
  return { title: `Кабель ${meters} м`, price: (meters / 100) * 15000 };
}

function archiveDays(baseDays, cameraCount) {
  return Math.max(1, Math.round((baseDays * 2) / cameraCount));
}

function renderHddDays(cameraCount) {
  Object.entries(hddOptions).forEach(([key, option]) => {
    const label = document.querySelector(`[data-hdd-days="${key}"]`);
    if (label) label.textContent = `архив ~${archiveDays(option.baseDays, cameraCount)} сут.`;
  });
}

function buildWifiEstimate() {
  const camera = wifiCameras[selectedValue("wifiType") || "outdoor"];
  return [
    { title: camera.title, price: camera.price },
    { title: "Монтаж Wi-Fi камеры", price: 13000 },
  ];
}

function buildIpEstimate(cameraCount) {
  const hdd = hddOptions[selectedValue("hdd") || "1tb"];
  const items = [
    { title: `IP камера 4МП с микрофоном × ${cameraCount}`, price: ipPrices.camera * cameraCount },
    getRecorder(cameraCount),
    getPoeSwitch(cameraCount),
    getCable(cameraCount),
    { title: "Расходный материал", price: ipPrices.consumables },
    {
      title: `${hdd.title} (архив ~${archiveDays(hdd.baseDays, cameraCount)} сут.)`,
      price: hdd.price,
    },
    { title: `Монтаж × ${cameraCount}`, price: ipPrices.installPerCamera * cameraCount },
  ];

  if (monitorOption.checked) items.push({ title: "Монитор", price: ipPrices.monitor });
  if (boxOption.checked) items.push({ title: "Металлический ящик 6U", price: ipPrices.box6u });

  return items;
}

function renderEstimate(items) {
  estimateList.innerHTML = items
    .map(
      (item) => `
        <div class="estimate-row">
          <span>${item.title}</span>
          <strong>${money(item.price)}</strong>
        </div>
      `,
    )
    .join("");
}

function updateRequestLink() {
  if (!calcRequestLink) return;

  const bodyLines = [
    "Здравствуйте. Хочу получить смету на видеонаблюдение.",
    "",
    ...lastEstimate.map((item) => `${item.title}: ${money(item.price)}`),
    "",
    `Итого: ${money(lastTotal)}`,
    "",
    "Город: Астана",
    `Телефон: ${requestPhone}`,
    `WhatsApp: ${whatsappUrl}`,
  ];

  calcRequestLink.href = `mailto:${requestEmail}?subject=${encodeURIComponent(
    "Заявка на видеонаблюдение",
  )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
}

function syncCalculatorBranches() {
  const systemType = selectedValue("systemType") || "ip";
  document.querySelectorAll("[data-branch]").forEach((branch) => {
    branch.hidden = branch.dataset.branch !== systemType;
  });
}

function calculate() {
  const systemType = selectedValue("systemType") || "ip";
  const cameraCount = Math.max(1, Math.min(32, Number(cameras.value || 1)));
  cameras.value = cameraCount;
  cameraCountLabel.textContent = cameraCount;
  renderHddDays(cameraCount);
  syncCalculatorBranches();

  lastEstimate = systemType === "wifi" ? buildWifiEstimate() : buildIpEstimate(cameraCount);
  lastTotal = lastEstimate.reduce((sum, item) => sum + item.price, 0);

  renderEstimate(lastEstimate);
  calcTotal.textContent = money(lastTotal);
  updateRequestLink();
}

function openModal() {
  calculate();
  const details = lastEstimate.map((item) => `${item.title}: ${money(item.price)}`).join("; ");
  modalSummary.textContent = `Ориентир по калькулятору: ${money(lastTotal)}. ${details}. Финальная смета зависит от объекта и длины трасс.`;

  if (typeof modal.showModal === "function" && !modal.open) {
    modal.showModal();
    body.classList.add("modal-open");
  }
}

function closeModalState() {
  body.classList.remove("modal-open");
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("slabyiTokCart") || "{}");
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem("slabyiTokCart", JSON.stringify(cart));
}

function productById(id) {
  return window.barlauProducts?.find((product) => String(product.id) === String(id));
}

function shopGroups() {
  const groups = [...new Map((window.barlauProducts || []).map((product) => [product.groupKey, product.groupTitle]))];
  return [["all", "Все"], ...groups];
}

function renderShopTabs() {
  if (!shopTabs || !window.barlauProducts?.length) return;

  shopTabs.innerHTML = shopGroups()
    .map(
      ([key, title]) => `
        <button class="shop-tab ${activeShopGroup === key ? "active" : ""}" type="button" data-shop-group="${key}">
          ${title}
        </button>
      `,
    )
    .join("");
}

function renderBarlauProducts() {
  if (!barlauGrid || !window.barlauProducts?.length) return;

  const products =
    activeShopGroup === "all"
      ? window.barlauProducts
      : window.barlauProducts.filter((product) => product.groupKey === activeShopGroup);

  barlauGrid.innerHTML = products
    .map(
      (product) => `
        <article class="barlau-card">
          <img src="${product.image}" alt="${product.title}" />
          <h3>${product.title}</h3>
          <p>${product.groupTitle || "Оборудование"}${product.stock ? ` · в наличии: ${product.stock} шт.` : ""}</p>
          <strong>${product.priceText}</strong>
          <footer>
            <span>Цена Barlau</span>
            <button class="btn secondary" type="button" data-add-cart="${product.id}">В корзину</button>
          </footer>
        </article>
      `,
    )
    .join("");
}

function cartProducts() {
  return Object.entries(cart)
    .map(([id, qty]) => ({ product: productById(id), qty }))
    .filter((item) => item.product && item.qty > 0);
}

function cartSummary() {
  const items = cartProducts();
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  return { items, count, total };
}

function updateCartLink(items, total) {
  if (!cartCheckout) return;

  const bodyLines = [
    "Здравствуйте. Хочу заказать оборудование:",
    "",
    ...items.map(({ product, qty }) => `${product.title} × ${qty}: ${money(product.price * qty)}`),
    "",
    `Итого: ${money(total)}`,
    "",
    "Город: Астана",
    `Телефон: ${requestPhone}`,
    `WhatsApp: ${whatsappUrl}`,
  ];

  cartCheckout.href = `mailto:${requestEmail}?subject=${encodeURIComponent(
    "Заявка на оборудование",
  )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
}

function submitLeadForm(event) {
  event.preventDefault();
  calculate();

  const bodyLines = [
    "Здравствуйте. Хочу получить смету.",
    "",
    `Имя: ${leadName.value || "-"}`,
    `Телефон: ${leadPhone.value || "-"}`,
    `Комментарий: ${leadComment.value || "-"}`,
    "",
    modalSummary.textContent,
    "",
    ...lastEstimate.map((item) => `${item.title}: ${money(item.price)}`),
    "",
    `Итого: ${money(lastTotal)}`,
    "",
    `Телефон: ${requestPhone}`,
    `WhatsApp: ${whatsappUrl}`,
  ];

  window.location.href = `mailto:${requestEmail}?subject=${encodeURIComponent(
    "Заявка с сайта Слабый ток",
  )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
}

function renderCart() {
  const { items, count, total } = cartSummary();
  if (cartCount) cartCount.textContent = count;
  if (cartCountInline) cartCountInline.textContent = count;
  if (cartTotal) cartTotal.textContent = money(total);

  if (cartEmpty) cartEmpty.hidden = items.length > 0;
  if (cartItems) {
    cartItems.innerHTML = items
      .map(
        ({ product, qty }) => `
          <article class="cart-item">
            <img src="${product.image}" alt="${product.title}" />
            <div>
              <h3>${product.title}</h3>
              <div class="cart-item-row">
                <strong>${money(product.price * qty)}</strong>
                <div class="qty-control" aria-label="Количество">
                  <button type="button" data-cart-dec="${product.id}">-</button>
                  <span>${qty}</span>
                  <button type="button" data-cart-inc="${product.id}">+</button>
                </div>
              </div>
              <button class="cart-remove" type="button" data-cart-remove="${product.id}">Удалить</button>
            </div>
          </article>
        `,
      )
      .join("");
  }

  updateCartLink(items, total);
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  renderCart();
}

function changeCartQty(id, delta) {
  const nextQty = (cart[id] || 0) + delta;
  if (nextQty <= 0) {
    delete cart[id];
  } else {
    cart[id] = nextQty;
  }
  saveCart();
  renderCart();
}

function openCart() {
  renderCart();
  if (typeof cartModal?.showModal === "function" && !cartModal.open) {
    cartModal.showModal();
    body.classList.add("modal-open");
  }
}

menuToggle.addEventListener("click", () => {
  const isOpen = body.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll("[data-object-card]").forEach((card) => {
  card.addEventListener("click", () => {
    const cameraDefault = objectDefaults[card.dataset.objectCard] || 4;
    document.querySelector('input[name="systemType"][value="ip"]').checked = true;
    cameras.value = cameraDefault;
    calculate();
    calculator.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

calculator.addEventListener("input", calculate);
calculator.addEventListener("change", calculate);

document.addEventListener("click", (event) => {
  const groupButton = event.target.closest("[data-shop-group]");
  if (groupButton) {
    activeShopGroup = groupButton.dataset.shopGroup;
    renderShopTabs();
    renderBarlauProducts();
    return;
  }

  const addButton = event.target.closest("[data-add-cart]");
  if (addButton) {
    addToCart(addButton.dataset.addCart);
    openCart();
    return;
  }

  const incButton = event.target.closest("[data-cart-inc]");
  if (incButton) {
    changeCartQty(incButton.dataset.cartInc, 1);
    return;
  }

  const decButton = event.target.closest("[data-cart-dec]");
  if (decButton) {
    changeCartQty(decButton.dataset.cartDec, -1);
    return;
  }

  const removeButton = event.target.closest("[data-cart-remove]");
  if (removeButton) {
    delete cart[removeButton.dataset.cartRemove];
    saveCart();
    renderCart();
    return;
  }

  if (event.target.closest("[data-cart-open]")) {
    openCart();
    return;
  }

  if (event.target.closest("[data-open-modal]")) {
    openModal();
  }
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    modal.close();
  });
});

leadForm?.addEventListener("submit", submitLeadForm);

modal.addEventListener("close", closeModalState);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.close();
  }
});

cartModal?.addEventListener("close", closeModalState);
cartModal?.addEventListener("click", (event) => {
  if (event.target === cartModal) {
    cartModal.close();
  }
});

renderShopTabs();
renderBarlauProducts();
renderCart();
calculate();
startInstalledCounter();
