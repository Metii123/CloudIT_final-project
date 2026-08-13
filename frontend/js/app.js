$(async function () {
  if ($("#event-list").length) {
    try {
      const events = await getEvents();
      const registrations = await getRegistrations();

      populateDepartmentFilter(events);
      renderEvents(applyFilters(events), registrations);

      $("#filter-form input, #filter-form select").on("input change", function () {
        renderEvents(applyFilters(events), registrations);
      });
    } catch (err) {
      console.error(err);
      $("#event-list").html("<p>Could not load events.</p>");
    }
  }


  /* EventDetail.html */
  if ($("#event-detail").length) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    try {
      const event = await getEventById(id);
      const registrations = await getRegistrationsForEvent(event.id);
      const spotsLeft = event.capacity - registrations.length;

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
    } catch (err) {
      console.error(err);
      $("#event-detail").html("<p>Event not found.</p>");
    }
  }

  /* Register.html -> only students may register */
  if ($("#register-form").length) {
    const allowed = requireRole(
      "student",
      "#register-section",
      "Only students can register for events. Switch your role to Student using the menu above."
    );

    if (allowed) {
      const params = new URLSearchParams(window.location.search);

      try {
        const event = await getEventById(params.get("id"));
        $("#register-event-name").text(event.title);
        $("#event-id").val(event.id);
      } catch (err) {
        console.error(err);
      }

      $("#register-form").on("submit", async function (e) {
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

        try {
          await createRegistration({
            eventId: $("#event-id").val(),
            studentName: name,
            studentEmail: email,
            notes: $("#notes").val()
          });

          const reference = await getConfirmationReference();

          $("#register-form").hide();
          if (reference) {
            $("#confirmation-message").text("You're registered! Reference: " + reference);
          }
          $("#confirmation-message").prop("hidden", false);
        } catch (err) {
          console.error(err);
          $("#error-name").text("Registration failed. Please try again.");
        }
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
      await renderMyRegistrations();
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
      await renderOrganizerEvents();

      $("#new-event-btn").on("click", function () {
        $("#event-form")[0].reset();
        $("#event-id-field").val("");
        $("#event-form").prop("hidden", false);
      });

      $("#event-form").on("submit", async function (e) {
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

        try {
          if (id) {
            await updateEvent(id, eventData);
          } else {
            await createEvent(eventData);
          }
          $("#event-form").prop("hidden", true);
          await renderOrganizerEvents();
        } catch (err) {
          console.error(err);
          alert("Could not save the event.");
        }
      });
    }
  }
});

/* other helper functions */
function populateDepartmentFilter(events) {
  const departments = [...new Set(events.map((e) => e.department))];
  const $select = $("#department-filter");
  departments.forEach((dep) => {
    $select.append(`<option value="${escapeHTML(dep)}">${escapeHTML(dep)}</option>`);
  });
}

function applyFilters(events) {
  const category = $("#category-filter").val();
  const department = $("#department-filter").val();
  const dateSort = $("#date-sort").val();

  const filtered = events.filter((e) => {
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

function renderEvents(events, registrations) {
  const $list = $("#event-list");
  $list.empty();

  if (events.length === 0) {
    $list.append("<p>No events match your search.</p>");
    return;
  }

  events.forEach((e) => {
    const spotsLeft =
      e.capacity -
      registrations.filter((r) => r.eventId === e.id && r.status === "registered").length;

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

async function renderMyRegistrations() {
  const $list = $("#registrations-list");
  $list.empty();

  let regs;
  let events;
  try {
    regs = await getMyRegistrations();
    events = await getEvents();
  } catch (err) {
    console.error(err);
    $list.append("<p>Could not load your registrations.</p>");
    return;
  }




  if (regs.length === 0) {
    $list.append("<p>You haven't registered for any events yet.</p>");
    return;
  }

  regs.forEach((r) => {
    const event = events.find((e) => e.id === r.eventId);
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

  $(".save-notes-btn").on("click", async function () {
    const $card = $(this).closest(".event-card");
    const regId = $card.data("reg-id");
    const newNotes = $card.find(".notes-input").val();
    try {
      await updateRegistration(regId, { notes: newNotes });
      await renderMyRegistrations();
    } catch (err) {
      console.error(err);
    }
  });

  $(".cancel-btn").on("click", async function () {
    const $card = $(this).closest(".event-card");
    const regId = $card.data("reg-id");
    if (!confirm("Cancel this registration?")) return;
    try {
      await cancelRegistration(regId);
      await renderMyRegistrations();
    } catch (err) {
      console.error(err);
    }
  });
}

async function renderOrganizerEvents() {
  const $list = $("#organizer-event-list");
  $list.empty();

  let allEvents;
  let registrations;
  try {
    allEvents = await getEvents();
    registrations = await getRegistrations();
  } catch (err) {
    console.error(err);
    $list.append("<p>Could not load your events.</p>");
    return;
  }


  /* Organizer can only manage their own events */
  const events = allEvents.filter((e) => e.organizerId === CURRENT_ORGANIZER_ID);

  if (events.length === 0) {
    $list.append("<p>No events yet - create your first one above.</p>");
    return;
  }

  events.forEach((e) => {
    const registrants = registrations.filter(
      (r) => r.eventId === e.id && r.status === "registered"
    );

    const registrantList = registrants.length
      ? "<ul>" +
        registrants
          .map(
            (r) =>
              `<li>${escapeHTML(r.studentName)} (${escapeHTML(r.studentEmail)})
             <button class="remove-registrant-btn" data-reg-id="${escapeHTML(r.id)}">Remove</button>
           </li>`
          )
          .join("") +
        "</ul>"
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
    const event = events.find((e) => e.id === id);
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

  $(".delete-btn").on("click", async function () {
    const id = $(this).closest(".event-card").data("event-id");
    const event = events.find((e) => e.id === id);
    if (!event || event.organizerId !== CURRENT_ORGANIZER_ID) {
      alert("You can only delete your own events.");
      return;
    }
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      await deleteEvent(id);
      await renderOrganizerEvents();
    } catch (err) {
      console.error(err);
    }
  });

  
  /* Organizer removing a student from their event(removing their registration)*/
  $(".remove-registrant-btn").on("click", async function () {
    const regId = $(this).data("reg-id");
    if (!confirm("Remove this registrant from the event?")) return;
    try {
      await removeRegistrationByOrganizer(regId);
      await renderOrganizerEvents();
    } catch (err) {
      console.error(err);
    }
  });
}
