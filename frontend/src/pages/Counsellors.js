import { store } from '../store.js';
import { counsellorsApi } from '../api/counsellors.js';
import { appointmentsApi } from '../api/appointments.js';
import { Toast } from '../components/Toast.js';
import { router } from '../router.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const Counsellors = {
  _cleanupNavbar: null,

  render() {
    const isAuth = store.isAuthenticated();

    return `
      ${Navbar.render()}

      <main class="counsellors-page page-root" id="main-content">
        <div class="container counsellors-container">

          <!-- Header -->
          <div class="counsellors-header">
            <span class="section-eyebrow">Professional Guidance</span>
            <h1 class="page-title">University Counselling & Psychological Support</h1>
            <p class="page-subtitle">
              Confidential, student-centered consultations with certified campus psychologists and well-being specialists.
            </p>
          </div>

          <!-- Navigation Tabs -->
          <div class="counsellors-tabs-bar" role="tablist">
            <button type="button" class="tab-btn active" id="tab-counsellors-btn" role="tab" aria-selected="true" aria-controls="panel-counsellors">
              Available Counsellors
            </button>
            <button type="button" class="tab-btn" id="tab-appointments-btn" role="tab" aria-selected="false" aria-controls="panel-appointments">
              My Appointments & Consultations
            </button>
          </div>

          <!-- Tab Panel 1: Counsellors Directory -->
          <section id="panel-counsellors" class="tab-panel active" role="tabpanel" aria-labelledby="tab-counsellors-btn">
            
            <!-- Filters -->
            <div class="counsellors-filters-row">
              <div class="search-input-wrap">
                <input
                  type="text"
                  id="counsellor-search-input"
                  class="form-input"
                  placeholder="Search by name, concern, or specialty (e.g. Burnout, Sleep, Imposter Syndrome)..."
                />
              </div>
              <div class="filter-select-wrap">
                <select id="specialty-filter-select" class="form-select">
                  <option value="">All Specialties</option>
                  <option value="Academic Burnout">Academic Burnout</option>
                  <option value="Exam Pressure">Exam Pressure</option>
                  <option value="Anxiety Management">Anxiety Management</option>
                  <option value="Sleep & Circadian Rhythm">Sleep & Circadian Rhythm</option>
                  <option value="Student Life Transition">Student Life Transition</option>
                  <option value="Mindfulness-Based Stress Reduction">Mindfulness & Somatics</option>
                </select>
              </div>
            </div>

            <!-- Counsellor Grid -->
            <div id="counsellors-grid" class="counsellors-grid">
              <div class="loading-spinner">Loading verified counsellors...</div>
            </div>
          </section>

          <!-- Tab Panel 2: My Appointments -->
          <section id="panel-appointments" class="tab-panel" style="display:none;" role="tabpanel" aria-labelledby="tab-appointments-btn">
            ${isAuth ? `
              <div class="appointments-panel-header">
                <h3>Your Booked Consultations</h3>
                <p>Appointments are confirmed directly by campus counseling services.</p>
              </div>
              <div id="appointments-list-container" class="appointments-list">
                <div class="loading-spinner">Loading appointments...</div>
              </div>
            ` : `
              <div class="empty-state">
                <p>Please sign in to view and track your counselling appointments.</p>
                <a href="/auth/login" class="btn btn-primary mt-4">Sign in to your account</a>
              </div>
            `}
          </section>

        </div>

        <!-- Booking Modal -->
        <div class="modal-backdrop" id="booking-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
          <div class="modal-card">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">Confidential Booking</span>
                <h3 id="booking-modal-title" class="modal-title">Schedule a Consultation</h3>
              </div>
              <button type="button" class="modal-close-btn" id="close-booking-modal-btn" aria-label="Close modal">✕</button>
            </div>

            <form id="booking-form" class="modal-form">
              <input type="hidden" id="booking-counsellor-id" />

              <div class="selected-counsellor-banner" id="booking-counsellor-info">
                <!-- Dynamically populated -->
              </div>

              <div class="form-group">
                <label for="booking-support-type" class="form-label">Primary Area of Concern</label>
                <select id="booking-support-type" class="form-select" required>
                  <option value="academic_stress">Academic Stress & Exam Pressure</option>
                  <option value="anxiety_mindfulness">Anxiety & Mindfulness Grounding</option>
                  <option value="personal_counselling">Personal / Emotional Well-Being</option>
                  <option value="general_support">General Guidance & Life Transition</option>
                </select>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="booking-date" class="form-label">Preferred Date</label>
                  <input type="date" id="booking-date" class="form-input" required />
                </div>
                <div class="form-group">
                  <label for="booking-time-slot" class="form-label">Time Slot</label>
                  <select id="booking-time-slot" class="form-select" required>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="booking-notes" class="form-label">Confidential Notes (Optional)</label>
                <textarea
                  id="booking-notes"
                  class="form-textarea"
                  placeholder="Share anything you'd like the counsellor to understand prior to your session..."
                ></textarea>
                <span class="form-hint">Only visible to your assigned counsellor.</span>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="cancel-booking-btn">Cancel</button>
                <button type="submit" class="btn btn-primary" id="confirm-booking-btn">Confirm Consultation Request</button>
              </div>
            </form>
          </div>
        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    let allCounsellors = [];
    const grid = document.getElementById('counsellors-grid');
    const searchInput = document.getElementById('counsellor-search-input');
    const specialtySelect = document.getElementById('specialty-filter-select');

    // Tabs
    const tabCounsBtn = document.getElementById('tab-counsellors-btn');
    const tabApptBtn = document.getElementById('tab-appointments-btn');
    const panelCouns = document.getElementById('panel-counsellors');
    const panelAppt = document.getElementById('panel-appointments');

    function switchTab(isAppointments) {
      if (isAppointments) {
        tabCounsBtn?.classList.remove('active');
        tabApptBtn?.classList.add('active');
        panelCouns.style.display = 'none';
        panelAppt.style.display = 'block';
        loadAppointmentsList();
      } else {
        tabApptBtn?.classList.remove('active');
        tabCounsBtn?.classList.add('active');
        panelAppt.style.display = 'none';
        panelCouns.style.display = 'block';
      }
    }

    tabCounsBtn?.addEventListener('click', () => switchTab(false));
    tabApptBtn?.addEventListener('click', () => switchTab(true));

    // Load counsellors
    async function loadCounsellors() {
      try {
        allCounsellors = await counsellorsApi.listCounsellors();
        renderCounsellors(allCounsellors);
      } catch (e) {
        grid.innerHTML = `<p class="error-text">Unable to load counsellors at this time.</p>`;
      }
    }

    function renderCounsellors(list) {
      if (!list || list.length === 0) {
        grid.innerHTML = `<p class="empty-text">No counsellors found matching your criteria.</p>`;
        return;
      }

      grid.innerHTML = list.map(c => `
        <article class="card counsellor-card" id="counsellor-${c.id}">
          <div class="counsellor-card-header">
            <div class="counsellor-avatar-circle">${c.avatar || 'DR'}</div>
            <div>
              <h3 class="counsellor-name">${c.name}</h3>
              <p class="counsellor-title">${c.title}</p>
              <p class="counsellor-exp">${c.experience_years} years experience • ${c.languages.join(', ')}</p>
            </div>
          </div>

          <p class="counsellor-bio">${c.bio}</p>

          <div class="counsellor-specialties">
            ${c.specialties.map(s => `<span class="badge badge-surface">${s}</span>`).join('')}
          </div>

          <div class="counsellor-schedule-info">
            <span class="schedule-label">Available:</span>
            <span class="schedule-days">${c.available_days.join(', ')}</span>
          </div>

          <div class="counsellor-card-footer">
            <button type="button" class="btn btn-primary btn-sm btn-book" data-id="${c.id}">
              Book Consultation
            </button>
          </div>
        </article>
      `).join('');

      // Wire Book buttons
      document.querySelectorAll('.btn-book').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!store.isAuthenticated()) {
            Toast.info('Please sign in or create an account to book an appointment.');
            router.navigate('/auth/login');
            return;
          }
          const cId = btn.dataset.id;
          const counsellor = allCounsellors.find(item => item.id === cId);
          openBookingModal(counsellor);
        });
      });
    }

    // Filter logic
    function applyFilters() {
      const q = searchInput?.value.toLowerCase().trim() || '';
      const spec = specialtySelect?.value || '';

      const filtered = allCounsellors.filter(c => {
        const matchesQuery = !q ||
          c.name.toLowerCase().includes(q) ||
          c.specialties.some(s => s.toLowerCase().includes(q)) ||
          c.bio.toLowerCase().includes(q);

        const matchesSpec = !spec || c.specialties.includes(spec);
        return matchesQuery && matchesSpec;
      });

      renderCounsellors(filtered);
    }

    searchInput?.addEventListener('input', applyFilters);
    specialtySelect?.addEventListener('change', applyFilters);

    loadCounsellors();

    // ── Booking Modal Logic ────────────────────────────────────
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.getElementById('close-booking-modal-btn');
    const cancelBtn = document.getElementById('cancel-booking-btn');
    const form = document.getElementById('booking-form');
    const counsellorInfoBox = document.getElementById('booking-counsellor-info');
    const counsellorIdInput = document.getElementById('booking-counsellor-id');
    const dateInput = document.getElementById('booking-date');
    const slotSelect = document.getElementById('booking-time-slot');

    // Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];
    if (dateInput) {
      dateInput.min = minDateStr;
      dateInput.value = minDateStr;
    }

    function openBookingModal(c) {
      if (!c || !modal) return;
      counsellorIdInput.value = c.id;
      counsellorInfoBox.innerHTML = `
        <div class="counsellor-avatar-circle" style="width:36px;height:36px;font-size:0.875rem;">${c.avatar}</div>
        <div>
          <strong>${c.name}</strong>
          <span class="text-xs text-ink-60 block">${c.title}</span>
        </div>
      `;

      // Populate counsellor slots if available
      if (c.available_slots && c.available_slots.length > 0) {
        slotSelect.innerHTML = c.available_slots.map(s => `<option value="${s}">${s}</option>`).join('');
      }

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeBookingModal() {
      modal?.classList.remove('open');
      modal?.setAttribute('aria-hidden', 'true');
    }

    closeBtn?.addEventListener('click', closeBookingModal);
    cancelBtn?.addEventListener('click', closeBookingModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeBookingModal();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('confirm-booking-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting request...';

      const counsellor_id = counsellorIdInput.value;
      const support_type = document.getElementById('booking-support-type').value;
      const preferred_date = dateInput.value;
      const time_slot = slotSelect.value;
      const student_notes = document.getElementById('booking-notes').value.trim();

      try {
        await appointmentsApi.bookAppointment({
          counsellor_id,
          support_type,
          preferred_date,
          time_slot,
          student_notes: student_notes || null
        });

        Toast.success('Consultation booked! The counseling team will review your slot.');
        closeBookingModal();
        switchTab(true);
      } catch (err) {
        Toast.error(err.message || 'Could not schedule appointment.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Consultation Request';
      }
    });

    // ── My Appointments List ────────────────────────────────────
    async function loadAppointmentsList() {
      const container = document.getElementById('appointments-list-container');
      if (!container || !store.isAuthenticated()) return;

      try {
        const list = await appointmentsApi.listAppointments();
        if (list.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <p>You have no appointments booked yet.</p>
              <button class="btn btn-primary btn-sm mt-3" id="btn-back-to-counsellors">Find a counsellor</button>
            </div>
          `;
          document.getElementById('btn-back-to-counsellors')?.addEventListener('click', () => switchTab(false));
          return;
        }

        container.innerHTML = list.map(a => {
          const isCancelled = a.status === 'cancelled';
          return `
            <div class="appointment-card card ${isCancelled ? 'appointment-cancelled' : ''}">
              <div class="appointment-header-row">
                <div>
                  <h4 class="appointment-counsellor">${a.counsellor_name || 'Counsellor'}</h4>
                  <p class="appointment-type">${a.support_type.replace('_', ' ').toUpperCase()}</p>
                </div>
                <span class="badge badge-${a.status === 'confirmed' ? 'sage' : (a.status === 'pending' ? 'saffron' : 'surface')}">
                  ${a.status.toUpperCase()}
                </span>
              </div>

              <div class="appointment-details-grid">
                <div>
                  <span class="detail-label">Date:</span>
                  <span class="detail-val">${a.preferred_date}</span>
                </div>
                <div>
                  <span class="detail-label">Time:</span>
                  <span class="detail-val">${a.time_slot}</span>
                </div>
              </div>

              ${a.student_notes ? `
                <div class="appointment-notes-box">
                  <span class="detail-label">Confidential Notes:</span>
                  <p class="appointment-notes-text">"${a.student_notes}"</p>
                </div>
              ` : ''}

              ${!isCancelled ? `
                <div class="appointment-actions-row">
                  <button type="button" class="btn btn-ghost btn-sm btn-cancel-appt text-error" data-id="${a.id}">
                    Cancel appointment
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        // Wire Cancel buttons
        container.querySelectorAll('.btn-cancel-appt').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm('Are you sure you wish to cancel this appointment request?')) return;
            try {
              await appointmentsApi.cancelAppointment(btn.dataset.id);
              Toast.info('Appointment has been cancelled.');
              loadAppointmentsList();
            } catch (err) {
              Toast.error(err.message || 'Failed to cancel appointment.');
            }
          });
        });
      } catch (e) {
        container.innerHTML = `<p class="error-text">Unable to load appointments list.</p>`;
      }
    }
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
