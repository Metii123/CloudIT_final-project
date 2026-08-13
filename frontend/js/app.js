const STORAGE_KEYS = {
  events: "cev_events",
  registrations: "cev_registrations",
  role: "cev_role"
};

const CURRENT_ORGANIZER_ID = "org-1";

/* Reset all locally stored demo data -> better for testing */
function resetDemoData() {
  localStorage.removeItem(STORAGE_KEYS.events);
  localStorage.removeItem(STORAGE_KEYS.registrations);
  localStorage.removeItem(STORAGE_KEYS.role);
  location.reload();
}

$(function () {
  $("#reset-data-btn").on("click", function () {
    if (confirm("Reset all local demo data (events, registrations, role)?")) {
      resetDemoData();
    }
  });
});

/* Role handling*/
function getRole() {
  return localStorage.getItem(STORAGE_KEYS.role) || "guest";
}

function setRole(role) {
  localStorage.setItem(STORAGE_KEYS.role, role);
}

$(function () {
  updateNavForRole();

  const $roleSwitch = $("#role-switch");
  if ($roleSwitch.length) {
    $roleSwitch.val(getRole());
    $roleSwitch.on("change", function () {
      setRole($(this).val());
      location.reload();
    });
  }
});

function updateNavForRole() {
  const role = getRole();
  $('a[href="myRegistrations.html"]').closest("li").toggle(role === "student");
  $('a[href="organizerDashboard.html"]').closest("li").toggle(role === "organizer");
}

function requireRole(requiredRole, containerSelector, message) {
  if (getRole() !== requiredRole) {
    $(containerSelector).html(`<p>${escapeHTML(message)}</p>`);
    return false;
  }
  return true;
}

/* Security, escape any user text before entering it into the DOM, to prevent XSS */
function escapeHTML(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadFromStorage(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* Event CRUD */
function getEvents() {
  return loadFromStorage(STORAGE_KEYS.events);
}

function saveEvents(events) {
  saveToStorage(STORAGE_KEYS.events, events);
}

function getEventById(id) {
  return getEvents().find(e => e.id === id);
}

function createEvent(event) {
  const events = getEvents();
  event.id = "evt-" + Date.now();
  event.organizerId = CURRENT_ORGANIZER_ID;
  events.push(event);
  saveEvents(events);
  return event;
}

function updateEvent(id, updates) {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) return null;
  events[idx] = { ...events[idx], ...updates };
  saveEvents(events);
  return events[idx];
}

function deleteEvent(id) {
  const events = getEvents().filter(e => e.id !== id);
  saveEvents(events);
}

/* Registration CRUD*/
function getRegistrations() {
  return loadFromStorage(STORAGE_KEYS.registrations);
}

function saveRegistrations(regs) {
  saveToStorage(STORAGE_KEYS.registrations, regs);
}

function createRegistration(reg) {
  const regs = getRegistrations();
  reg.id = "reg-" + Date.now();
  reg.status = "registered";
  reg.registeredAt = new Date().toISOString();
  regs.push(reg);
  saveRegistrations(regs);
  return reg;
}

function updateRegistration(id, updates) {
  const regs = getRegistrations();
  const idx = regs.findIndex(r => r.id === id);
  if (idx === -1) return null;
  regs[idx] = { ...regs[idx], ...updates };
  saveRegistrations(regs);
  return regs[idx];
}

function cancelRegistration(id) {
      updateRegistration(id, { status: "cancelled" });
}

function removeRegistrationByOrganizer(id) {
      const regs = getRegistrations().filter(r => r.id !== id);
  saveRegistrations(regs);
}

function getRegistrationsForEvent(eventId) {
  return getRegistrations().filter(r => r.eventId === eventId && r.status === "registered");
}

function getMyRegistrations() {
      return getRegistrations().filter(r => r.status !== "cancelled");
}

/* Seed local Storage with example Events */
function seedEventsIfEmpty(callback) {
  if (getEvents().length > 0) {
    callback();
    return;
  }
  $.getJSON("exampleEvents.json", function (data) {
    saveEvents(data);
    callback();
  }).fail(function () {
    console.error("Could not load exampleEvents.json - is this page being served (not opened as file://)?");
    callback();
  });
}