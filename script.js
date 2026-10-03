/* ==========================================================
   EliteCut Barbershop - script.js
   Frontend-only booking logic. No backend, no database.
   ========================================================== */

// ---------- DATA ----------
const services = [
    { id: "classic-haircut", alt: "Barber styling a customer's hair with a comb and scissors", name: "Classic Haircut", price: 150, image: "images/service-haircut.jpg",
      description: "Professional classic haircut with clean finishing and styling." },
    { id: "skin-fade", alt: "Back view of a skin fade haircut with a barber holding a razor", name: "Skin Fade", price: 200, image: "images/service-fade.jpg",
      description: "Clean skin fade with detailed blending and professional finishing." },
    { id: "haircut-beard", alt: "Side view of a fade haircut with a styled beard and a barber's razor", name: "Haircut + Beard", price: 250, image: "images/service-beard.jpg",
      description: "Complete haircut and beard grooming for a polished look." },
    { id: "beard-trim", alt: "Barber shaping a customer's beard with a straight razor", name: "Beard Trim", price: 100, image: "images/service-trim.jpg",
      description: "Clean and well-shaped beard trim with detailed finishing." }
];

const barbers = [
    { id: "alex", alt: "Alex, senior barber, holding a comb and razor beside his nameplate", name: "Alex", role: "Senior Barber", image: "images/barber-1.jpg",
      description: "Specializes in classic cuts and clean professional styles." },
    { id: "mark", alt: "Mark, master barber, holding clippers and scissors beside his nameplate", name: "Mark", role: "Master Barber", image: "images/barber-2.jpg",
      description: "Known for detailed fades and modern styles." },
    { id: "daniel", alt: "Daniel, professional barber, holding clippers and a comb beside his nameplate", name: "Daniel", role: "Professional Barber", image: "images/barber-3.jpg",
      description: "Focused on beard grooming and polished finishing." }
];

// No 12:00 PM slot (lunch break). "hour" is 24-hour time for same-day checks.
const timeSlots = [
    { label: "9:00 AM", hour: 9 },  { label: "10:00 AM", hour: 10 },
    { label: "11:00 AM", hour: 11 }, { label: "1:00 PM", hour: 13 },
    { label: "2:00 PM", hour: 14 },  { label: "3:00 PM", hour: 15 },
    { label: "4:00 PM", hour: 16 },  { label: "5:00 PM", hour: 17 }
];

// ---------- BOOKING STATE ----------
// Single source of truth for the current booking.
const booking = {
    service: null,   // a service object from the services array
    barber: null,    // a barber object from the barbers array
    date: null,      // "YYYY-MM-DD"
    time: null,      // a slot object from timeSlots
    customerName: "",
    phone: "",
    email: "",
    notes: "",
    price: 0,
    bookingId: null
};

const TOTAL_STEPS = 5;
let currentStep = 1;

// ---------- DOM ELEMENTS ----------
const header = document.getElementById("site-header");
const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");
const bookingFlow = document.getElementById("booking-flow");
const confirmation = document.getElementById("confirmation");
const dateInput = document.getElementById("booking-date");
const serviceOptions = document.getElementById("service-options");
const barberOptions = document.getElementById("barber-options");
const timeOptions = document.getElementById("time-options");

// ---------- HELPERS ----------
function $(id) { return document.getElementById(id); }

function formatPrice(amount) { return "₱" + amount; }

// Today as "YYYY-MM-DD" in the user's local time (not UTC).
function getTodayString() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// "2026-10-10" -> "October 10, 2026". Built from parts to avoid timezone shifts.
function formatDate(dateString) {
    const [y, m, d] = dateString.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function setError(id, message) {
    const el = $(id);
    el.textContent = message;
    const input = el.previousElementSibling;
    if (input && (input.tagName === "INPUT" || input.tagName === "TEXTAREA")) {
        input.classList.toggle("invalid", message !== "");
        input.setAttribute("aria-invalid", message !== "");
    }
}

function scrollToSection(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth" });
}

// ---------- NAVIGATION ----------
function closeMenu() {
    navMenu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
}

function toggleMenu() {
    const isOpen = navMenu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
}

function handleScroll() {
    header.classList.toggle("scrolled", window.scrollY > 40);
}

function setupNavigation() {
    menuToggle.addEventListener("click", toggleMenu);
    navMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
    window.addEventListener("scroll", handleScroll);
    handleScroll();

    // Highlight the nav link of the section currently on screen
    const links = navMenu.querySelectorAll("ul a");
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + entry.target.id));
            }
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(l => {
        const section = document.querySelector(l.getAttribute("href"));
        if (section) observer.observe(section);
    });
}

// ---------- RENDER SERVICES & BARBERS (from arrays) ----------
function renderServiceCards() {
    $("services-grid").innerHTML = services.map(s => `
        <article class="card item-card">
            <div class="img-wrap"><img src="${s.image}" alt="${s.alt}" loading="lazy"></div>
            <div class="item-body">
                <h3>${s.name}</h3>
                <p>${s.description}</p>
                <span class="price">${formatPrice(s.price)}</span>
                <button type="button" class="btn btn-primary" data-service="${s.id}">Book Now</button>
            </div>
        </article>`).join("");
}

function renderBarberCards() {
    $("barbers-grid").innerHTML = barbers.map(b => `
        <article class="card item-card barber-card">
            <div class="img-wrap"><img src="${b.image}" alt="${b.alt}" loading="lazy"></div>
            <div class="item-body">
                <h3>${b.name}</h3>
                <span class="role">${b.role}</span>
                <p>${b.description}</p>
                <button type="button" class="btn btn-outline" data-barber="${b.id}">Book with ${b.name}</button>
            </div>
        </article>`).join("");
}

// ---------- SERVICE SELECTION ----------
function renderServiceOptions() {
    serviceOptions.innerHTML = services.map(s => `
        <button type="button" class="option" role="radio" aria-checked="false" data-id="${s.id}">
            <span class="opt-check" aria-hidden="true">✓ Selected</span>
            <span class="opt-name">${s.name}</span>
            <span class="opt-meta"><span class="opt-price">${formatPrice(s.price)}</span></span>
        </button>`).join("");
}

function selectService(id) {
    const service = services.find(s => s.id === id);
    if (!service) return;
    booking.service = service;
    booking.price = service.price;          // price always comes from the data, never typed by the user
    markSelected(serviceOptions, id);
    setError("error-service", "");
}

// ---------- BARBER SELECTION ----------
function renderBarberOptions() {
    barberOptions.innerHTML = barbers.map(b => `
        <button type="button" class="option" role="radio" aria-checked="false" data-id="${b.id}">
            <span class="opt-check" aria-hidden="true">✓ Selected</span>
            <span class="opt-name">${b.name}</span>
            <span class="opt-meta">${b.role}</span>
        </button>`).join("");
}

function selectBarber(id) {
    const barber = barbers.find(b => b.id === id);
    if (!barber) return;
    booking.barber = barber;
    markSelected(barberOptions, id);
    setError("error-barber", "");
}

// Adds the "selected" look (border, background, check text) to one option.
function markSelected(container, id) {
    container.querySelectorAll(".option").forEach(btn => {
        const isSelected = btn.dataset.id === id;
        btn.classList.toggle("selected", isSelected);
        btn.setAttribute("aria-checked", String(isSelected));
    });
}

// ---------- DATE & TIME ----------
function setupDateInput() {
    dateInput.min = getTodayString();
    dateInput.addEventListener("change", () => {
        booking.date = dateInput.value || null;
        // A time chosen earlier may be in the past for the new date
        renderTimeSlots();
        validateDate();
    });
}

function isSlotInPast(slot) {
    if (booking.date !== getTodayString()) return false;
    return slot.hour <= new Date().getHours();   // same-day slots must still be ahead of us
}

function renderTimeSlots() {
    if (booking.time && isSlotInPast(booking.time)) booking.time = null;
    timeOptions.innerHTML = timeSlots.map(slot => {
        const selected = booking.time && booking.time.label === slot.label;
        return `<button type="button" class="time-btn${selected ? " selected" : ""}" data-time="${slot.label}"
                    aria-pressed="${selected ? "true" : "false"}" ${isSlotInPast(slot) ? "disabled" : ""}>${slot.label}</button>`;
    }).join("");
}

function selectTime(label) {
    booking.time = timeSlots.find(s => s.label === label) || null;
    renderTimeSlots();
    setError("error-time", "");
}

// ---------- VALIDATION ----------
function validateDate() {
    const value = dateInput.value;
    if (!value) { setError("error-date", "Please select a valid date."); return false; }
    if (value < getTodayString()) { setError("error-date", "Please select a valid date. Past dates are not allowed."); booking.date = null; return false; }
    const [y, m, d] = value.split("-").map(Number);
    if (new Date(y, m - 1, d).getDay() === 0) { setError("error-date", "We're closed on Sundays. Please pick another date."); booking.date = null; return false; }
    booking.date = value;
    setError("error-date", "");
    return true;
}

function validateName() {
    const ok = $("customer-name").value.trim() !== "";
    setError("error-name", ok ? "" : "Please enter your full name.");
    return ok;
}

function validatePhone() {
    const cleaned = $("customer-phone").value.replace(/[\s-]/g, "");
    const ok = /^(09\d{9}|\+639\d{9})$/.test(cleaned);
    setError("error-phone", ok ? "" : "Please enter a valid phone number.");
    return ok;
}

function validateEmail() {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($("customer-email").value.trim());
    setError("error-email", ok ? "" : "Please enter a valid email address.");
    return ok;
}

// Validates the fields of one step. Returns true if the user may continue.
function validateStep(step) {
    if (step === 1) {
        if (!booking.service) { setError("error-service", "Please select a service."); return false; }
        return true;
    }
    if (step === 2) {
        if (!booking.barber) { setError("error-barber", "Please select a barber."); return false; }
        return true;
    }
    if (step === 3) {
        const dateOk = validateDate();
        let timeOk = true;
        if (!booking.time) { setError("error-time", "Please select a time."); timeOk = false; }
        return dateOk && timeOk;
    }
    if (step === 4) {
        // Run all three so every error shows at once
        const results = [validateName(), validatePhone(), validateEmail()];
        return results.every(Boolean);
    }
    return true;
}

// ---------- MULTI-STEP NAVIGATION ----------
function showStep(step) {
    currentStep = step;
    bookingFlow.querySelectorAll(".step-panel").forEach(panel => {
        panel.hidden = Number(panel.dataset.step) !== step;
    });
    updateProgress();
    if (step === 5) updateSummary();
    const heading = bookingFlow.querySelector(`.step-panel[data-step="${step}"] h3`);
    if (heading) heading.focus({ preventScroll: true });
}

function updateProgress() {
    document.querySelectorAll("#progress li").forEach(li => {
        const n = Number(li.dataset.progress);
        li.classList.toggle("done", n < currentStep);
        li.classList.toggle("active", n === currentStep);
        li.querySelector(".dot").textContent = n < currentStep ? "✓" : n;
        if (n === currentStep) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
}

function nextStep() {
    if (!validateStep(currentStep)) return;
    if (currentStep === 4) saveCustomerInfo();
    if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
}

function previousStep() {
    if (currentStep === 4) saveCustomerInfo();   // keep what was typed
    if (currentStep > 1) showStep(currentStep - 1);
}

// ---------- CUSTOMER INFORMATION ----------
function saveCustomerInfo() {
    booking.customerName = $("customer-name").value.trim();
    booking.phone = $("customer-phone").value.trim();
    booking.email = $("customer-email").value.trim();
    booking.notes = $("customer-notes").value.trim();
}

// ---------- BOOKING SUMMARY ----------
// Builds <dt>/<dd> rows with textContent so user text can never inject HTML.
function fillSummary(listEl, rows) {
    listEl.innerHTML = "";
    rows.forEach(([label, value, cls]) => {
        const row = document.createElement("div");
        row.className = "row" + (cls ? " " + cls : "");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        listEl.appendChild(row);
    });
}

function updateSummary() {
    fillSummary($("summary-list"), [
        ["Service", booking.service.name],
        ["Barber", booking.barber.name],
        ["Date", formatDate(booking.date)],
        ["Time", booking.time.label],
        ["Customer", booking.customerName],
        ["Phone", booking.phone],
        ["Email", booking.email],
        ["Notes", booking.notes || "None"],
        ["Total", formatPrice(booking.price), "total"]
    ]);
}

// ---------- BOOKING ID ----------
// EC-YYYYMMDD-XXX  (XXX = random 3-digit number). Created only on confirmation.
function generateBookingId() {
    const datePart = booking.date.replace(/-/g, "");
    const random = Math.floor(100 + Math.random() * 900);
    return "EC-" + datePart + "-" + random;
}

// ---------- CONFIRMATION ----------
function confirmBooking() {
    // Last check: the chosen same-day time could have passed while reviewing
    if (booking.time && isSlotInPast(booking.time)) {
        booking.time = null;
        renderTimeSlots();
        showStep(3);
        setError("error-time", "That time has passed. Please select a new time.");
        return;
    }
    booking.bookingId = generateBookingId();
    fillSummary($("confirmation-list"), [
        ["Booking ID", booking.bookingId, "id"],
        ["Service", booking.service.name],
        ["Barber", booking.barber.name],
        ["Date", formatDate(booking.date)],
        ["Time", booking.time.label],
        ["Customer", booking.customerName],
        ["Price", formatPrice(booking.price), "total"]
    ]);
    bookingFlow.hidden = true;
    $("progress").hidden = true;
    confirmation.hidden = false;
    confirmation.querySelector("h3").focus({ preventScroll: true });
}

// ---------- RESET BOOKING ----------
function resetBooking() {
    booking.service = null;
    booking.barber = null;
    booking.date = null;
    booking.time = null;
    booking.customerName = "";
    booking.phone = "";
    booking.email = "";
    booking.notes = "";
    booking.price = 0;
    booking.bookingId = null;

    ["customer-name", "customer-phone", "customer-email", "customer-notes"].forEach(id => { $(id).value = ""; $(id).classList.remove("invalid"); });
    dateInput.value = "";
    dateInput.min = getTodayString();
    ["error-service", "error-barber", "error-date", "error-time", "error-name", "error-phone", "error-email"].forEach(id => setError(id, ""));

    markSelected(serviceOptions, "");
    markSelected(barberOptions, "");
    renderTimeSlots();

    confirmation.hidden = true;
    bookingFlow.hidden = false;
    $("progress").hidden = false;
    showStep(1);
    scrollToSection("booking");
}

// Brings the booking form back if a confirmation is on screen
function ensureFormVisible() {
    if (!confirmation.hidden) resetBooking();
}

// ---------- EVENT SETUP ----------
function setupBooking() {
    renderServiceOptions();
    renderBarberOptions();
    renderTimeSlots();
    setupDateInput();
    showStep(1);

    serviceOptions.addEventListener("click", e => { const b = e.target.closest(".option"); if (b) selectService(b.dataset.id); });
    barberOptions.addEventListener("click", e => { const b = e.target.closest(".option"); if (b) selectBarber(b.dataset.id); });
    timeOptions.addEventListener("click", e => { const b = e.target.closest(".time-btn"); if (b && !b.disabled) selectTime(b.dataset.time); });

    bookingFlow.addEventListener("click", e => {
        const action = e.target.dataset.action;
        if (action === "next") nextStep();
        if (action === "back") previousStep();
        if (action === "edit") showStep(1);
        if (action === "confirm") confirmBooking();
    });
    $("book-another").addEventListener("click", resetBooking);

    // Clear errors as soon as the user corrects the field
    $("customer-name").addEventListener("input", validateName);
    $("customer-phone").addEventListener("input", validatePhone);
    $("customer-email").addEventListener("input", validateEmail);

    // Service and barber cards in the page sections
    $("services-grid").addEventListener("click", e => {
        const btn = e.target.closest("[data-service]");
        if (!btn) return;
        ensureFormVisible();
        selectService(btn.dataset.service);
        showStep(1);
        scrollToSection("booking");
    });
    $("barbers-grid").addEventListener("click", e => {
        const btn = e.target.closest("[data-barber]");
        if (!btn) return;
        ensureFormVisible();
        selectBarber(btn.dataset.barber);
        scrollToSection("booking");
    });
}

// ---------- CONTACT FORM ----------
function setupContactForm() {
    const form = $("contact-form");
    form.addEventListener("submit", e => {
        e.preventDefault();
        const name = $("contact-name").value.trim();
        const email = $("contact-email").value.trim();
        const message = $("contact-message").value.trim();
        setError("error-contact-name", name ? "" : "Please enter your name.");
        setError("error-contact-email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "" : "Please enter a valid email address.");
        setError("error-contact-message", message ? "" : "Please enter a message.");
        const ok = name && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && message;
        $("contact-success").textContent = ok ? "Thank you! Your message has been received." : "";
        if (ok) form.reset();
    });
}

// ---------- SCROLL REVEAL ----------
function setupReveal() {
    const items = document.querySelectorAll(".section");
    items.forEach(el => el.classList.add("reveal"));
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } });
    }, { threshold: 0.08 });
    items.forEach(el => observer.observe(el));
}

// ---------- START ----------
renderServiceCards();
renderBarberCards();
setupNavigation();
setupBooking();
setupContactForm();
setupReveal();
