/* =========================
   CityMall - script.js
   One file for index + index2
========================= */

const LEASE_KEY = "leasedUnits_v1";
const INIT_KEY  = "leasesInitialized_v1";

/**
 * مهم للتسليم:
 * أول مرة تفتح المشروع في أي جهاز/متصفح → يمسح الحجوزات القديمة (لو كانت موجودة)
 * وبعدها: الحجز يخدم طبيعي ويخزن في localStorage.
 */
(function initializeForSubmission() {
  if (!localStorage.getItem(INIT_KEY)) {
    localStorage.removeItem(LEASE_KEY);
    localStorage.setItem(INIT_KEY, "1");
  }
})();

/* ---------- Helpers ---------- */
function getLeasedUnits() {
  try { return JSON.parse(localStorage.getItem(LEASE_KEY)) || {}; }
  catch { return {}; }
}

function setLeasedUnits(obj) {
  localStorage.setItem(LEASE_KEY, JSON.stringify(obj));
}

function normalizeUnitId(unitStr) {
  if (!unitStr) return null;

  if (/^\d+$/.test(unitStr)) return unitStr;
  if (/^K-\d+$/i.test(unitStr)) return unitStr.toUpperCase();

  const kioskMatch = unitStr.match(/K-\d+/i);
  if (kioskMatch) return kioskMatch[0].toUpperCase();

  const numMatch = unitStr.match(/\b\d{3}\b/);
  if (numMatch) return numMatch[0];

  return null;
}

/* =========================
   Floor Switch (Map)
========================= */
function switchFloor(floor) {
  const ground = document.getElementById("floor-ground");
  const first  = document.getElementById("floor-first");

  const btnGround = document.getElementById("btn-ground");
  const btnFirst  = document.getElementById("btn-first");

  if (!ground || !first || !btnGround || !btnFirst) return;

  if (floor === "ground") {
    ground.style.display = "block";
    first.style.display  = "none";
    btnGround.classList.add("active-btn");
    btnFirst.classList.remove("active-btn");
  } else {
    ground.style.display = "none";
    first.style.display  = "block";
    btnFirst.classList.add("active-btn");
    btnGround.classList.remove("active-btn");
  }
}

/* =========================
   Map -> Card Highlight
========================= */
function highlightCard(unitId) {
  const target = document.getElementById("card-" + unitId);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

  document.querySelectorAll(".card").forEach(c => c.classList.remove("active-card"));
  target.classList.add("active-card");

  setTimeout(() => target.classList.remove("active-card"), 2500);
}

/* =========================
   Modal Gallery
========================= */
let currentImageIndex = 0;
let imagesList = [];

function openGallery(title, imagesArray) {
  const modal = document.getElementById("photoModal");
  const modalTitle = document.getElementById("modalTitle");

  if (!modal || !modalTitle) return;

  modalTitle.innerText = title;
  imagesList = Array.isArray(imagesArray) ? imagesArray : [];
  currentImageIndex = 0;

  showImage(currentImageIndex);
  modal.style.display = "block";
}

function showImage(index) {
  const fullImage = document.getElementById("full-image");
  if (!fullImage || imagesList.length === 0) return;

  if (index >= imagesList.length) currentImageIndex = 0;
  if (index < 0) currentImageIndex = imagesList.length - 1;

  fullImage.src = imagesList[currentImageIndex];
}

function changeImage(n) {
  currentImageIndex += n;
  showImage(currentImageIndex);
}

function closeModal() {
  const modal = document.getElementById("photoModal");
  if (modal) modal.style.display = "none";
}

/* Close modal on outside click */
window.addEventListener("click", (event) => {
  const modal = document.getElementById("photoModal");
  if (modal && event.target === modal) modal.style.display = "none";
});

/* =========================
   Leasing UI (index.html)
========================= */
function markCardLeased(unitId) {
  const card = document.getElementById("card-" + unitId);
  if (!card) return;

  // badge
  const badge = card.querySelector(".badge");
  if (badge) {
    badge.classList.remove("available");
    badge.classList.add("lease-pending");
    badge.textContent = "Leased";
  }

  // price
  const price = card.querySelector(".price");
  if (price) price.textContent = "Occupied";

  // image grayscale
  const img = card.querySelector(".card-image");
  if (img) img.style.filter = "grayscale(100%)";

  // disable actions (photos + book)
  const actions = card.querySelectorAll(".card-actions .btn-outline");
  actions.forEach(btn => {
    if (btn.tagName.toLowerCase() === "a") {
      const disabledBtn = document.createElement("button");
      disabledBtn.className = "btn-outline";
      disabledBtn.disabled = true;
      disabledBtn.style.opacity = "0.5";
      disabledBtn.style.cursor = "not-allowed";
      disabledBtn.textContent = "غير متاح حالياً";
      btn.replaceWith(disabledBtn);
    } else {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
      btn.onclick = null;
      btn.textContent = "غير متاح حالياً";
    }
  });
}

function markMapLeased(unitId) {
  document.querySelectorAll(".interactive-map .mall-unit").forEach(g => {
    const t = g.querySelector("text");
    if (!t) return;

    if (t.textContent.trim().toUpperCase() === unitId.toUpperCase()) {
      g.classList.remove("unit-available", "clickable");
      g.classList.add("unit-leased");
      g.onclick = null;
      g.style.cursor = "default";
    }
  });
}

function applyLeasedState() {
  const leased = getLeasedUnits();
  Object.keys(leased).forEach(unitId => {
    markCardLeased(unitId);
    markMapLeased(unitId);
  });
}

/* =========================
   Leasing Form (index2.html)
========================= */
function setupLeaseForm() {
  const form = document.getElementById("leaseForm");
  if (!form) return; // مش في index2.html

  const urlParams = new URLSearchParams(window.location.search);
  const unitName = urlParams.get("unit") || "";
  const interestInput = document.getElementById("interest");

  if (interestInput) interestInput.value = unitName;

  // if already leased
  const unitId = normalizeUnitId(unitName);
  const leased = getLeasedUnits();

  if (unitId && leased[unitId]) {
    alert("المحل هذا محجوز / مؤجر بالفعل.");
    form.querySelectorAll("input, textarea, button").forEach(el => {
      el.disabled = true;
      el.style.opacity = "0.7";
      el.style.cursor = "not-allowed";
    });
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const unit = document.getElementById("interest")?.value.trim();
    const message = document.getElementById("message")?.value.trim();

    if (!name || !email || !unit) {
      alert("عبي الاسم + الإيميل + اسم المحل.");
      return;
    }

    const id = normalizeUnitId(unit);
    if (!id) {
      alert("ما قدرناش نحدد رقم المحل من: " + unit);
      return;
    }

    const leasedNow = getLeasedUnits();
    if (leasedNow[id]) {
      alert("عذراً، المحل هذا محجوز بالفعل.");
      return;
    }

    leasedNow[id] = { unitName: unit, name, email, message, leasedAt: new Date().toISOString() };
    setLeasedUnits(leasedNow);

    alert("✅ تم تاكيد الحجز.");
    window.location.href = "index.html#listings";
  });
}

/* =========================
   Boot
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // On index.html: apply leased UI
  applyLeasedState();

  // On index2.html: setup form
  setupLeaseForm();
});

/* Expose functions used by inline onclick in HTML */
window.switchFloor = switchFloor;
window.highlightCard = highlightCard;
window.openGallery = openGallery;
window.changeImage = changeImage;
window.closeModal = closeModal;
