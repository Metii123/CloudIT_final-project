$(function() {
    if ($("#event-list").length) {
        seedEventsIfEmpty(function() {
            populateDepartmentFilter();
            renderEvents(applyFilters(getEvents()));
        });

        $("#filter-form input, #filter-form select").on("input change", function() {
            renderEvents(applyFilters(getEvents()));
        });
    }

/* EventDetail.html */
  if ($("#event-detail").length) {
    seedEventsIfEmpty(function () {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      const event = getEventById(id);

      if (!event) {
        $("#event-detail").html("<p>Event not found.</p>");
        return;
      }

      const spotsLeft = event.capacity - getRegistrations().filter(
        r => r.eventId === event.id && r.status === "registered"
      ).length;

      $("#event-title").text(event.title);
      $("#event-description").text(event.description);
      $("#event-date").text(event.date);
      $("#event-time").text(event.time);
      $("#event-location").text(event.location);
      $("#event-department").text(event.department);
      $("#event-category").text(event.category);
      $("#event-capacity").text(spotsLeft + " remaining");

      $("#register-link").attr("href", `register.html?id=${encodeURIComponent(event.id)}`);

      if (getRole() !== "student") {
        $("#register-link").hide();
      }
    });
  }

/* Register.html -> only students may register */
  if ($("#register-form").length) {
    const allowed = requireRole(
      "student",
      "#register-section",
      "Only students can register for events. Switch your role to Student using the menu above."
    );

    if (allowed) {
      seedEventsIfEmpty(function () {
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get("id");
        const event = getEventById(eventId);

        if (event) {
          $("#register-event-name").text(event.title);
          $("#event-id").val(event.id);
        }
      });

      $("#register-form").on("submit", function (e) {
        e.preventDefault();

        let valid = true;
        $("#error-name, #error-email").text("");

        const name = $("#student-name").val().trim();
        const email = $("#student-email").val().trim();

        if (name.length === 0) {
          $("#error-name").text("Name is required.");
          valid = false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          $("#error-email").text("Enter a valid email address.");
          valid = false;
        }

        if (!valid) return;

        createRegistration({
          eventId: $("#event-id").val(),
          studentName: name,
          studentEmail: email,
          notes: $("#notes").val()
        });

        $("#register-form").hide();
        $("#confirmation-message").prop("hidden", false);
      });
    }
  }

  if ($("#registrations-list").length) {
    const allowed = requireRole(
      "student",
      "#my-Registrations",
      "Only students have registrations to manage. Switch your role to Student using the menu above."
    );
    if (allowed) {
      seedEventsIfEmpty(renderMyRegistrations);
    }
  }

/* OrganizerDashboard.html -> only Organizers manage events */
  if ($("#organizer-event-list").length) {
    const allowed = requireRole(
      "organizer",
      "#organizer-dashboard",
      "Only organizers can manage events. Switch your role to Organizer using the menu above."
    );

    if (allowed) {
      seedEventsIfEmpty(renderOrganizerEvents);

      $("#new-event-btn").on("click", function () {
        $("#event-form")[0].reset();
        $("#event-id-field").val("");
        $("#event-form").prop("hidden", false);
      });

      $("#event-form").on("submit", function (e) {
        e.preventDefault();

        const id = $("#event-id-field").val();
        const eventData = {
          title: $("#title").val().trim(),
          description: $("#description").val().trim(),
          category: $("#category").val(),
          department: $("#department").val().trim(),
          date: $("#date").val(),
          time: $("#time").val(),
          location: $("#location").val().trim(),
          capacity: Number($("#capacity").val())
        };

        if (id) {
          const existing = getEventById(id);
          if (!existing || existing.organizerId !== CURRENT_ORGANIZER_ID) {
            alert("You can only edit your own events.");
            return;
          }
          updateEvent(id, eventData);
        } else {
          createEvent(eventData);
        }

        $("#event-form").prop("hidden", true);
        renderOrganizerEvents();
      });
    }
  }

});

/* other helper functions */
function populateDepartmentFilter() {
  const departments = [...new Set(getEvents().map(e => e.department))];
  const $select = $("#department-filter");
  departments.forEach(dep => {
    $select.append(`<option value="${escapeHTML(dep)}">${escapeHTML(dep)}</option>`);
  });
}

function applyFilters(events) {
  const category = $("#category-filter").val();
  const department = $("#department-filter").val();
  const dateSort = $("#date-sort").val(); 

  const filtered = events.filter(e => {
    const matchesCategory = !category || e.category === category;
    const matchesDepartment = !department || e.department === department;
    return matchesCategory && matchesDepartment;
  });

  filtered.sort((a, b) => {
    return dateSort === "latest"
      ? new Date(b.date) - new Date(a.date)
      : new Date(a.date) - new Date(b.date);
  });

  return filtered;
}

function renderEvents(events) {
  const $list = $("#event-list");
  $list.empty();

  if (events.length === 0) {
    $list.append("<p>No events match your search.</p>");
    return;
  }

  events.forEach(e => {
    const spotsLeft = e.capacity - getRegistrations().filter(
      r => r.eventId === e.id && r.status === "registered"
    ).length;

    const card = `
      <article class="event-card">
        <h3>${escapeHTML(e.title)}</h3>
        <p class="meta">${escapeHTML(e.date)} / ${escapeHTML(e.department)} / ${escapeHTML(e.category)}</p>
        <p>${escapeHTML(e.description)}</p>
        <p class="meta">${spotsLeft} spots left</p>
        <a class="btn" href="eventDetail.html?id=${encodeURIComponent(e.id)}">View details</a>
      </article>
    `;
    $list.append(card);
  });
}

function renderMyRegistrations() {
  const $list = $("#registrations-list");
  $list.empty();

  const regs = getMyRegistrations();

  if (regs.length === 0) {
    $list.append("<p>You haven't registered for any events yet.</p>");
    return;
  }

  regs.forEach(r => {
    const event = getEventById(r.eventId);
    if (!event) return;

    const row = `
      <article class="event-card" data-reg-id="${escapeHTML(r.id)}">
        <h3>${escapeHTML(event.title)}</h3>
        <p class="meta">${escapeHTML(event.date)} / ${escapeHTML(event.location)}</p>
        <label>Notes
          <textarea class="notes-input">${escapeHTML(r.notes || "")}</textarea>
        </label>
        <button class="save-notes-btn">Save notes</button>
        <button class="cancel-btn">Cancel registration</button>
      </article>
    `;
    $list.append(row);
  });

  $(".save-notes-btn").on("click", function () {
    const $card = $(this).closest(".event-card");
    const regId = $card.data("reg-id");
    const newNotes = $card.find(".notes-input").val();
    updateRegistration(regId, { notes: newNotes });
    renderMyRegistrations();
  });

  $(".cancel-btn").on("click", function () {
    const $card = $(this).closest(".event-card");
    const regId = $card.data("reg-id");
    if (confirm("Cancel this registration?")) {
      cancelRegistration(regId);
      renderMyRegistrations();
    }
  });
}


function renderOrganizerEvents() {
  const $list = $("#organizer-event-list");
  $list.empty();

/* Organizer can only manage their own events */
  const events = getEvents().filter(e => e.organizerId === CURRENT_ORGANIZER_ID);

  if (events.length === 0) {
    $list.append("<p>No events yet - create your first one above.</p>");
    return;
  }

  events.forEach(e => {
    const registrants = getRegistrationsForEvent(e.id);

    const registrantList = registrants.length
      ? "<ul>" + registrants.map(r =>
          `<li>${escapeHTML(r.studentName)} (${escapeHTML(r.studentEmail)})
             <button class="remove-registrant-btn" data-reg-id="${escapeHTML(r.id)}">Remove</button>
           </li>`
        ).join("") + "</ul>"
      : "<p class='meta'>No one registered yet.</p>";

    const card = `
      <article class="event-card" data-event-id="${escapeHTML(e.id)}">
        <h3>${escapeHTML(e.title)}</h3>
        <p class="meta">${escapeHTML(e.date)} / ${escapeHTML(e.department)}</p>
        <p>${escapeHTML(e.description)}</p>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
        <details>
          <summary>Registrants (${registrants.length})</summary>
          ${registrantList}
        </details>
      </article>
    `;
    $list.append(card);
  });

  $(".edit-btn").on("click", function () {
    const id = $(this).closest(".event-card").data("event-id");
    const event = getEventById(id);
    if (!event) return;

    $("#event-id-field").val(event.id);
    $("#title").val(event.title);
    $("#description").val(event.description);
    $("#category").val(event.category);
    $("#department").val(event.department);
    $("#date").val(event.date);
    $("#time").val(event.time);
    $("#location").val(event.location);
    $("#capacity").val(event.capacity);

    $("#event-form").prop("hidden", false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $(".delete-btn").on("click", function () {
    const id = $(this).closest(".event-card").data("event-id");
    const event = getEventById(id);
    if (!event || event.organizerId !== CURRENT_ORGANIZER_ID) {
      alert("You can only delete your own events.");
      return;
    }
    if (confirm("Delete this event? This cannot be undone.")) {
      deleteEvent(id);
      renderOrganizerEvents();
    }
  });

  /* Organizer removing a student from their event(removing their registration)*/
  $(".remove-registrant-btn").on("click", function () {
    const regId = $(this).data("reg-id");
    if (confirm("Remove this registrant from the event?")) {
      removeRegistrationByOrganizer(regId);
      renderOrganizerEvents();
    }
  });
}

