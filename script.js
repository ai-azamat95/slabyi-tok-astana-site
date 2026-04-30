const MARKUP = 1.5;

const prices = {
  camera: {
    hiwatch: 18000,
    hikvision: 28000,
    china: 12000,
  },
  recorder: {
    hiwatch: 30000,
    hikvision: 45000,
    china: 25000,
  },
  storage: {
    "1tb": 10000,
    "2tb": 18000,
    "4tb": 32000,
  },
  laborPerCamera: {
    flat: 3000,
    house: 6000,
    business: 8500,
  },
  cablePerCamera: {
    flat: 1250,
    house: 2500,
    business: 3500,
  },
};

const objectDefaults = {
  flat: {
    cameras: 4,
    storage: "1tb",
  },
  house: {
    cameras: 6,
    storage: "2tb",
  },
  business: {
    cameras: 8,
    storage: "4tb",
  },
};

const formatter = new Intl.NumberFormat("ru-KZ", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});

const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const brand = document.querySelector("#brand");
const cameras = document.querySelector("#cameras");
const storage = document.querySelector("#storage");
const installMode = document.querySelector("#installMode");
const calcTotal = document.querySelector("#calcTotal");
const calculator = document.querySelector(".calculator");
const modal = document.querySelector("#leadModal");
const modalSummary = document.querySelector("#modalSummary");
const barlauGrid = document.querySelector("#barlauGrid");

let lastTotal = 0;

function customerPrice(value) {
  return Math.round(Number(value || 0) * MARKUP);
}

function selectedObject() {
  return document.querySelector('input[name="object"]:checked').value;
}

function setObject(value) {
  const input = document.querySelector(`input[name="object"][value="${value}"]`);
  if (input) input.checked = true;
}

function calculate() {
  const objectType = selectedObject();
  const cameraCount = Math.max(1, Math.min(64, Number(cameras.value || 1)));
  cameras.value = cameraCount;

  const equipment =
    customerPrice(prices.camera[brand.value]) * cameraCount +
    customerPrice(prices.recorder[brand.value]) +
    customerPrice(prices.storage[storage.value]);

  const laborMultiplier = installMode.value === "clean" ? 1.35 : 1;
  const labor =
    installMode.value === "none"
      ? 0
      : Math.round(
          (prices.laborPerCamera[objectType] + prices.cablePerCamera[objectType]) *
            laborMultiplier *
            cameraCount,
        );

  lastTotal = equipment + labor;
  calcTotal.textContent = formatter.format(lastTotal).replace(/\s?KZT/, "₸");
}

function openModal() {
  calculate();
  modalSummary.textContent = `Ориентир по калькулятору: ${formatter
    .format(lastTotal)
    .replace(/\s?KZT/, "₸")}. Финальная смета зависит от объекта, длины кабеля и модели камер.`;

  if (typeof modal.showModal === "function" && !modal.open) {
    modal.showModal();
    body.classList.add("modal-open");
  }
}

function closeModalState() {
  body.classList.remove("modal-open");
}

function renderBarlauProducts() {
  if (!barlauGrid || !window.barlauProducts?.length) return;

  barlauGrid.innerHTML = window.barlauProducts
    .slice(0, 12)
    .map(
      (product) => `
        <article class="barlau-card">
          <img src="${product.image}" alt="${product.title}" />
          <h3>${product.title}</h3>
          <p>${product.stock ? `В наличии: ${product.stock} шт.` : "Позиция Barlau"}</p>
          <strong>${product.priceText}</strong>
          <button class="btn secondary" type="button" data-open-modal>В смету</button>
        </article>
      `,
    )
    .join("");
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

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextValue = Number(cameras.value || 1) + Number(button.dataset.step);
    cameras.value = Math.max(1, Math.min(64, nextValue));
    calculate();
  });
});

document.querySelectorAll("[data-object-card]").forEach((card) => {
  card.addEventListener("click", () => {
    const objectType = card.dataset.objectCard;
    const defaults = objectDefaults[objectType];
    setObject(objectType);
    cameras.value = defaults.cameras;
    storage.value = defaults.storage;
    calculate();
    calculator.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

calculator.addEventListener("input", calculate);
calculator.addEventListener("change", calculate);

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-modal]")) {
    openModal();
  }
});

modal.addEventListener("close", closeModalState);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.close();
  }
});

renderBarlauProducts();
calculate();
