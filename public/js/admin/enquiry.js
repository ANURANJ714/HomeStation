document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  function updateDateTime() {
    const display = document.getElementById("datetimeDisplay");
    if (!display) return;
    const now = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    display.textContent = now.toLocaleDateString("en-IN", options);
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const sidebar = document.querySelector(".sidebar");
  const closeSidebar = document.getElementById("closeSidebar");

  if (hamburgerMenu && sidebar) {
    hamburgerMenu.addEventListener("click", () =>
      sidebar.classList.toggle("active"),
    );
    if (closeSidebar) {
      closeSidebar.addEventListener("click", () =>
        sidebar.classList.remove("active"),
      );
    }
  }

  function triggerFilterState(targetPage = 1) {
    const search = document.getElementById("ticketSearch").value.trim();
    const status = document.getElementById("statusFilter").value;
    window.location.href = `/admin/enquiries?page=${targetPage}&search=${encodeURIComponent(search)}&status=${status}`;
  }

  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.addEventListener("change", () => triggerFilterState(1));
  }

  const ticketSearchInput = document.getElementById("ticketSearch");
  const searchToggleBtn = document.getElementById("searchToggleBtn");

  if (ticketSearchInput) {
    ticketSearchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") triggerFilterState(1);
    });
  }

  if (searchToggleBtn) {
    searchToggleBtn.addEventListener("click", () => {
      if (searchToggleBtn.classList.contains("search-toggle-clear")) {
        ticketSearchInput.value = "";
        triggerFilterState(1);
      } else {
        triggerFilterState(1);
      }
    });
  }

  document.querySelectorAll(".change-page-node-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      triggerFilterState(this.getAttribute("data-page"));
    });
  });

  document.querySelectorAll(".open-modal-trigger-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const target = this.getAttribute("data-target");
      const modal = document.getElementById(target);
      if (modal) modal.style.display = "flex";
    });
  });

  document.querySelectorAll(".close-modal-trigger-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const target = this.getAttribute("data-target");
      const modal = document.getElementById(target);
      if (modal) modal.style.display = "none";
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      e.target.style.display = "none";
    }
  });

  document.querySelectorAll(".open-view-msg-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.getElementById("modalTicketId").textContent =
      this.getAttribute("data-ticket");
      document.getElementById("modalCreatedDate").textContent =
        this.getAttribute("data-date");
      document.getElementById("modalVisitorName").textContent =
        this.getAttribute("data-name");
      document.getElementById("modalVisitorEmail").textContent =
        this.getAttribute("data-email");
      document.getElementById("modalUpdatedDate").textContent =
        this.getAttribute("data-updated");
      document.getElementById("modalSubjectText").textContent =
        this.getAttribute("data-subject");
      document.getElementById("modalMessageContentText").textContent =
        this.getAttribute("data-msg");

      const status = this.getAttribute("data-status");
      const badgeBox = document.getElementById("modalCurrentStatusBadgeBox");

      if (status === "Ticket Raised") {
        badgeBox.innerHTML =
          '<span class="badge badge-info">Ticket Raised</span>';
        document.getElementById("radioStatusRaised").checked = true;
      } else if (status === "Pending") {
        badgeBox.innerHTML = '<span class="badge badge-warning">Pending</span>';
        document.getElementById("radioStatusPending").checked = true;
      } else {
        badgeBox.innerHTML =
          '<span class="badge badge-success">Resolved</span>';
        document.getElementById("radioStatusResolved").checked = true;
      }

      document.getElementById("viewMessageModal").style.display = "flex";
    });
  });

  const addSubjectForm = document.getElementById("addSubjectForm");
  if (addSubjectForm) {
    addSubjectForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const nameInput = document.getElementById("newSubjectName").value.trim();
      const checkedAuthRadio = document.querySelector(
        'input[name="newSubjectNeedAuth"]:checked',
      );
      const needAuthValue = checkedAuthRadio ? checkedAuthRadio.value : "false";

      if (!nameInput) {
        return Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Subject name field cannot be submitted blank.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      try {
        const response = await fetch("/admin/enquiries/subjects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "csrf-token": csrfToken,
          },
          body: JSON.stringify({
            name: nameInput,
            needAuth: needAuthValue,
          }),
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Added!",
            text: data.message,
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => {
            window.location.reload();
          });
        } else {
          Swal.fire({
            icon: data.reason === "DUPLICATE" ? "warning" : "error",
            title:
              data.reason === "DUPLICATE"
                ? "Duplicate Entry"
                : "Operation Failed",
            text: data.message || "An unexpected error occurred.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Could not establish server connection tunnel.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    });
  }

  const deleteSubjectForm = document.getElementById("deleteSubjectForm");
  if (deleteSubjectForm) {
    deleteSubjectForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const targetSelectField = document.getElementById(
        "targetSubjectDeleteId",
      );
      const selectedSubjectId = targetSelectField.value;

      if (!selectedSubjectId) {
        return Swal.fire({
          icon: "error",
          title: "Selection Required",
          text: "Please select an existing subject category to proceed with deletion.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      Swal.fire({
        title: "Are you sure?",
        text: "This operation will completely erase this subject category description record.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, Delete",
        heightAuto: false,
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const response = await fetch(
              `/admin/enquiries/subjects/${selectedSubjectId}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  "csrf-token": csrfToken,
                },
              },
            );

            const data = await response.json();

            if (data.success) {
              Swal.fire({
                icon: "success",
                title: "Erased!",
                text: data.message,
                timer: 1500,
                showConfirmButton: false,
                heightAuto: false,
              }).then(() => {
                window.location.reload();
              });
            } else {
              Swal.fire({
                icon: "error",
                title: "Action Denied",
                text: data.message,
                confirmButtonColor: "#222",
                heightAuto: false,
              });
            }
          } catch (error) {
            Swal.fire({
              icon: "error",
              title: "Network Error",
              text: "Could not successfully complete deletion request transaction.",
              confirmButtonColor: "#222",
              heightAuto: false,
            });
          }
        }
      });
    });
  }

  const adminLogoutForm = document.getElementById("adminLogoutForm");
  if (adminLogoutForm) {
      adminLogoutForm.addEventListener("submit", async function (e) {
          e.preventDefault(); 

          try {
              const response = await fetch("/admin/logout", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "csrf-token": csrfToken 
                  }
              });

              if (response.redirected) {
                  window.location.href = response.url;
                  return;
              }

              const data = await response.json();

              if (data.success || response.ok) {
                  Swal.fire({
                      icon: "success",
                      title: "Logged Out",
                      text: data.message || "Redirecting to authentication login window...",
                      timer: 1500,
                      showConfirmButton: false,
                      heightAuto: false
                  }).then(() => {
                      window.location.href = "/admin/login";
                  });
              } else {
                  Swal.fire({
                      icon: "error",
                      title: "Logout Failed",
                      text: data.message || "An unexpected issue occurred.",
                      confirmButtonColor: "#222",
                      heightAuto: false
                  });
              }
          } catch (error) {
              window.location.href = "/admin/login";
          }
      });
  }
});
