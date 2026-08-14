const FUNCTION_URL = "https://campus-fn-21652.azurewebsites.net";


const STORAGE_KEYS = {
  role: "cev_role"
};

const CURRENT_ORGANIZER_ID = "org-1";



async function api(path, options = {}) {
  const config = { headers: {}, ...options };
  if (config.body !== undefined) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(path, config);
  if (!response.ok) {
    throw new Error(response.status + " " + response.statusText);
  }
  return response.status === 204 ? null : response.json();
}

function resetDemoData() {
  api("/api/reset", { method: "POST" })
    .then(function () {
      localStorage.removeItem(STORAGE_KEYS.role);
      location.reload();
    })
    .catch(function (err) {
      console.error(err);
      alert("Could not reset demo data.");
    });
}

$(function () {
  $("#reset-data-btn").on("click", function () {
    if (confirm("Reset all demo data (events, registrations, role)?")) {
      resetDemoData();
    }
  });
});

/* Role handling */
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

/* Event CRUD */
function getEvents() {
  return api("/api/events");
}

function getEventById(id) {
  return api("/api/events/" + encodeURIComponent(id));
}

function createEvent(event) {
  return api("/api/events", {
    method: "POST",
    body: { ...event, organizerId: CURRENT_ORGANIZER_ID }
  });
}

function updateEvent(id, updates) {
  return api("/api/events/" + encodeURIComponent(id), { method: "PUT", body: updates });
}

function deleteEvent(id) {
  return api("/api/events/" + encodeURIComponent(id), { method: "DELETE" });
}

/* Registration CRUD */
function getRegistrations() {
  return api("/api/registrations");
}

function createRegistration(registration) {
  return api("/api/registrations", { method: "POST", body: registration });
}

function updateRegistration(id, updates) {
  return api("/api/registrations/" + encodeURIComponent(id), { method: "PATCH", body: updates });
}

function cancelRegistration(id) {
  return updateRegistration(id, { status: "cancelled" });
}


function removeRegistrationByOrganizer(id) {
  return api("/api/registrations/" + encodeURIComponent(id), { method: "DELETE" });
}


function getRegistrationsForEvent(eventId) {
  return api("/api/registrations?eventId=" + encodeURIComponent(eventId) + "&status=registered");
}


function getMyRegistrations() {
  return api("/api/registrations?status=registered");
}

/* Serverless component */
async function getConfirmationReference() {
  if (!FUNCTION_URL) return null;
  try {
    const response = await fetch(FUNCTION_URL + "/api/function");
    if (!response.ok) return null;
    const data = await response.json();
    return data.reference;
  } catch (err) {
    console.error(err);
    return null;
  }
}
