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
const cameras = document.querySelector("#cameras");
const cameraCountLabel = document.querySelector("#cameraCountLabel");
const calcTotal = document.querySelector("#calcTotal");
const estimateList = document.querySelector("#estimateList");
const calcRequestLink = document.querySelector("#calcRequestLink");
const calculator = document.querySelector(".calculator");
const calculatorObject = document.querySelector("#calculatorObject");
const equipmentSubtotal = document.querySelector("#equipmentSubtotal");
const installationSubtotal = document.querySelector("#installationSubtotal");
const installationSubtotalRow = document.querySelector("#installationSubtotalRow");
const calcTotalNote = document.querySelector("#calcTotalNote");
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
let lastRequestType = "turnkey";
let activeShopGroup = "all";
let cart = loadCart();
const requestPhone = "+7 777 608 3077";
const whatsappUrl = "https://wa.me/77776083077";

function money(value) {
  return formatter.format(value).replace(/\s?KZT/, "₸");
}

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value;
}

function requestTypeLabel(requestType = lastRequestType) {
  return requestType === "equipment" ? "Купить оборудование" : "Оборудование + монтаж";
}

function getAttribution() {
  const params = new URLSearchParams(window.location.search || "");
  const fields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const current = Object.fromEntries(fields.map((field) => [field, params.get(field)]).filter(([, value]) => value));

  try {
    if (Object.keys(current).length) {
      window.sessionStorage?.setItem("videoAstanaAttribution", JSON.stringify(current));
      return current;
    }

    return JSON.parse(window.sessionStorage?.getItem("videoAstanaAttribution") || "{}");
  } catch {
    return current;
  }
}

function attributionLines() {
  const attribution = getAttribution();
  if (!Object.keys(attribution).length) return [];

  const source = attribution.utm_source === "google" ? "Google Ads" : attribution.utm_source;
  return [
    "",
    `Источник: ${source || "не указан"}`,
    attribution.utm_campaign ? `Кампания: ${attribution.utm_campaign}` : null,
    attribution.utm_content ? `Группа/объявление: ${attribution.utm_content}` : null,
    attribution.utm_term ? `Ключевое слово: ${attribution.utm_term}` : null,
  ].filter(Boolean);
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
    if (label) label.textContent = "срок архива уточняется";
  });
}

function buildWifiEstimate() {
  const camera = wifiCameras[selectedValue("wifiType") || "outdoor"];
  return [
    { title: camera.title, price: camera.price, category: "equipment" },
    { title: "Монтаж Wi-Fi камеры", price: 13000, category: "installation" },
  ];
}

function buildIpEstimate(cameraCount) {
  const hdd = hddOptions[selectedValue("hdd") || "1tb"];
  const items = [
    { title: `IP камера 4МП с микрофоном × ${cameraCount}`, price: ipPrices.camera * cameraCount, category: "equipment" },
    { ...getRecorder(cameraCount), category: "equipment" },
    { ...getPoeSwitch(cameraCount), category: "equipment" },
    { ...getCable(cameraCount), category: "equipment" },
    { title: "Расходный материал", price: ipPrices.consumables, category: "equipment" },
    {
      title: hdd.title,
      price: hdd.price,
      category: "equipment",
    },
    { title: `Монтаж × ${cameraCount}`, price: ipPrices.installPerCamera * cameraCount, category: "installation" },
  ];

  if (monitorOption.checked) items.push({ title: "Монитор", price: ipPrices.monitor, category: "equipment" });
  if (boxOption.checked) items.push({ title: "Металлический ящик 6U", price: ipPrices.box6u, category: "equipment" });

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
    `Здравствуйте. Хочу: ${requestTypeLabel().toLowerCase()}.`,
    "",
    `Заявка: ${requestTypeLabel()}`,
    `Объект: ${calculatorObject?.value || "Не указан"}`,
    ...lastEstimate.map((item) => `${item.title}: ${money(item.price)}`),
    "",
    `Предварительная сумма: ${money(lastTotal)}`,
    "",
    "Город: Астана",
    ...attributionLines(),
    `Телефон: ${requestPhone}`,
    `WhatsApp: ${whatsappUrl}`,
  ];

  calcRequestLink.href = `${whatsappUrl}?text=${encodeURIComponent(bodyLines.join("\n"))}`;
  calcRequestLink.onclick = () => {
    window.trackWhatsAppClick?.(`calculator_${lastRequestType}`);
    window.gtag?.("event", "videoastana_quote_open", {
      event_category: "contact_intent",
      request_type: lastRequestType,
      object_type: calculatorObject?.value || "not_selected",
      camera_count: selectedValue("systemType") === "wifi" ? 1 : Number(cameras.value || 1),
      transport_type: "beacon",
      business_unit: "video_astana",
    });
  };
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
  lastRequestType = selectedValue("requestType") || "turnkey";
  cameras.value = cameraCount;
  cameraCountLabel.textContent = cameraCount;
  renderHddDays(cameraCount);
  syncCalculatorBranches();

  const fullEstimate = systemType === "wifi" ? buildWifiEstimate() : buildIpEstimate(cameraCount);
  lastEstimate = lastRequestType === "equipment"
    ? fullEstimate.filter((item) => item.category !== "installation")
    : fullEstimate;
  const equipmentTotal = lastEstimate
    .filter((item) => item.category !== "installation")
    .reduce((sum, item) => sum + item.price, 0);
  const installationTotal = lastEstimate
    .filter((item) => item.category === "installation")
    .reduce((sum, item) => sum + item.price, 0);
  lastTotal = lastEstimate.reduce((sum, item) => sum + item.price, 0);

  renderEstimate(lastEstimate);
  equipmentSubtotal.textContent = money(equipmentTotal);
  installationSubtotal.textContent = money(installationTotal);
  installationSubtotalRow.hidden = lastRequestType === "equipment";
  calcTotal.textContent = money(lastTotal);
  calcTotalNote.textContent = lastRequestType === "equipment"
    ? "Предварительная стоимость комплекта без монтажных работ"
    : "Предварительная стоимость оборудования и монтажа";
  calcRequestLink.textContent = lastRequestType === "equipment"
    ? "Получить подбор оборудования в WhatsApp"
    : "Получить смету в WhatsApp";
  updateRequestLink();
}

function openModal() {
  calculate();
  modalSummary.textContent = `${requestTypeLabel()}. Ориентир по калькулятору: ${money(lastTotal)}. Уточним объект и согласуем состав. Подробный расчёт добавится в сообщение WhatsApp.`;

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
          <p>${product.groupTitle || "Оборудование"} · наличие уточняется</p>
          <strong>${product.priceText}</strong>
          <footer>
            <span></span>
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

  cartCheckout.href = `${whatsappUrl}?text=${encodeURIComponent(bodyLines.join("\n"))}`;
  cartCheckout.onclick = () => {
    window.trackWhatsAppClick?.("cart_checkout");
  };
}

function submitLeadForm(event) {
  event.preventDefault();
  calculate();
  window.trackFormSubmit?.("lead_modal_submit");

  const bodyLines = [
    "Здравствуйте. Хочу получить смету.",
    "",
    `Имя: ${leadName.value || "-"}`,
    `Телефон: ${leadPhone.value || "-"}`,
    `Объект: ${document.querySelector("#leadObject").value}`,
    `Запрос: ${requestTypeLabel()}`,
    `Город: Астана`,
    `Комментарий: ${leadComment.value || "-"}`,
    "",
    modalSummary.textContent,
    "",
    ...lastEstimate.map((item) => `${item.title}: ${money(item.price)}`),
    "",
    `Итого: ${money(lastTotal)}`,
    "",
    ...attributionLines(),
    `Телефон: ${requestPhone}`,
    `WhatsApp: ${whatsappUrl}`,
  ];

  window.gtag?.("event", "videoastana_whatsapp_form_open", {
    transport_type: "beacon",
  });
  window.location.href = `${whatsappUrl}?text=${encodeURIComponent(bodyLines.join("\n"))}`;
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

// Консультант — показывать только когда прокрутил до конца страницы
(function initConsultantVisibility() {
  const widget = document.querySelector('.consultant-widget');
  if (!widget) return;

  let shown = false;

  function showIfNearBottom() {
    if (shown) return;
    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    // Показываем когда до конца осталось < 40% страницы
    if (scrollBottom >= docHeight * 0.6) {
      widget.classList.add('visible');
      shown = true;
    }
  }

  window.addEventListener('scroll', showIfNearBottom, { passive: true });
  // Проверяем сразу на случай если страница уже прокручена
  showIfNearBottom();
})();

document.querySelectorAll('[data-object]').forEach(button => {
 button.addEventListener('click', () => {
  const select = document.querySelector('#leadObject');
  const mapping = {'Магазины':'Магазин','Аптеки':'Аптека','Ломбарды':'Ломбард','Офисы и склады':'Офис или склад','Кафе и рестораны':'Кафе или ресторан','СТО и мастерские':'СТО или мастерская'};
  select.value = mapping[button.dataset.object];
 });
});
