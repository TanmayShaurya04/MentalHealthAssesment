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
              Confidential, student-centered consultations with certified campus psychologists and well-being specialists. Affordable student rates (all under ₹2,000) with instant video consultation support.
            </p>
          </div>

          <!-- Navigation Tabs -->
          <div class="counsellors-tabs-bar" role="tablist">
            <button type="button" class="tab-btn active" id="tab-counsellors-btn" role="tab" aria-selected="true" aria-controls="panel-counsellors">
              Verified Counsellors Directory
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
                  placeholder="Search by name, context, or specialty (e.g. Burnout, Sleep, Imposter Syndrome)..."
                />
              </div>
              <div class="filter-select-wrap">
                <select id="specialty-filter-select" class="form-select">
                  <option value="">All Contexts & Specialties</option>
                  <option value="Academic Burnout">Academic Burnout</option>
                  <option value="Exam Pressure">Exam Pressure</option>
                  <option value="Anxiety Management">Anxiety Management</option>
                  <option value="Sleep & Circadian Rhythm">Sleep & Circadian Rhythm</option>
                  <option value="Student Life Transition">Student Life Transition</option>
                  <option value="Mindfulness-Based Stress Reduction">Mindfulness & Somatics</option>
                </select>
              </div>
            </div>

            <!-- Counsellor Table Container -->
            <div id="counsellors-table-wrapper" class="counsellors-table-container">
              <div class="loading-spinner">Loading verified counsellors directory...</div>
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

        <!-- Video Call Launcher Modal -->
        <div class="modal-backdrop" id="video-call-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="video-modal-title">
          <div class="modal-card modal-card--video">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow text-success">● Live Consultation Room</span>
                <h3 id="video-modal-title" class="modal-title">Secure Video Consultation</h3>
              </div>
              <button type="button" class="modal-close-btn" id="close-video-modal-btn" aria-label="Close modal">✕</button>
            </div>

            <div class="video-modal-body">
              <div class="video-counsellor-profile" id="video-counsellor-details">
                <!-- Dynamically populated -->
              </div>

              <div class="video-preview-screen">
                <div class="video-cam-box">
                  <div class="video-cam-placeholder">
                    <span class="video-cam-icon">📹</span>
                    <p class="font-medium text-ink">Encrypted 1-on-1 Consultation Space</p>
                    <span class="text-xs text-ink-60 mt-1">End-to-end private • No recordings • Peer-to-peer audio & video</span>
                  </div>
                </div>
              </div>

              <div class="video-room-guidelines mt-4">
                <div class="guideline-item">
                  <span class="guideline-badge">✓</span>
                  <span><strong>Microphone & Camera:</strong> Ensure your browser permissions are allowed.</span>
                </div>
                <div class="guideline-item">
                  <span class="guideline-badge">✓</span>
                  <span><strong>Confidentiality:</strong> Everything discussed is strictly covered by student-patient privacy.</span>
                </div>
              </div>

              <div class="video-modal-actions mt-6">
                <button type="button" class="btn btn-secondary" id="cancel-video-modal-btn">Close</button>
                <a id="btn-enter-video-room" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-video">
                  Start Video Call Now →
                </a>
              </div>
            </div>
          </div>
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
    const tableWrapper = document.getElementById('counsellors-table-wrapper');
    const searchInput = document.getElementById('counsellor-search-input');
    const specialtySelect = document.getElementById('specialty-filter-select');

    // Modals
    const videoModal = document.getElementById('video-call-modal');
    const closeVideoBtn = document.getElementById('close-video-modal-btn');
    const cancelVideoBtn = document.getElementById('cancel-video-modal-btn');
    const videoCounsellorDetails = document.getElementById('video-counsellor-details');
    const enterVideoRoomBtn = document.getElementById('btn-enter-video-room');

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

    function openVideoModal(c) {
      if (!c || !videoModal) return;
      const fee = c.fee || 800;
      const meetLink = c.video_meet_link || `https://meet.jit.si/serenova-consultation-${c.id}`;

      videoCounsellorDetails.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="counsellor-avatar-circle" style="width:48px;height:48px;font-size:1rem;flex-shrink:0;">${c.avatar}</div>
          <div>
            <h4 class="font-bold text-lg text-ink">${c.name}</h4>
            <p class="text-xs text-ink-60">${c.title} • ${c.experience_years} Years Exp.</p>
            <p class="text-xs text-accent mt-0.5 font-medium">${c.context || c.specialties.join(', ')}</p>
          </div>
        </div>
        <div class="video-fee-badge mt-3">
          <span class="badge badge-surface">Standard Consultation Fee: <strong>₹${fee}</strong></span>
          <span class="badge badge-sage ml-2">Video Enabled</span>
        </div>
      `;

      enterVideoRoomBtn.href = meetLink;
      videoModal.classList.add('open');
      videoModal.setAttribute('aria-hidden', 'false');
    }

    function closeVideoModal() {
      videoModal?.classList.remove('open');
      videoModal?.setAttribute('aria-hidden', 'true');
    }

    closeVideoBtn?.addEventListener('click', closeVideoModal);
    cancelVideoBtn?.addEventListener('click', closeVideoModal);
    videoModal?.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoModal();
    });

    // Load counsellors
    async function loadCounsellors() {
      try {
        allCounsellors = await counsellorsApi.listCounsellors();
        renderCounsellorsTable(allCounsellors);
      } catch (e) {
        tableWrapper.innerHTML = `<p class="error-text">Unable to load counsellors at this time.</p>`;
      }
    }

    // Render Table View with Experience, Context, Fee (< 2000), and Working Video Chat
    function renderCounsellorsTable(list) {
      if (!list || list.length === 0) {
        tableWrapper.innerHTML = `<p class="empty-text p-6">No counsellors found matching your search criteria.</p>`;
        return;
      }

      tableWrapper.innerHTML = `
        <div class="table-responsive">
          <table class="counsellors-table" aria-label="Counsellors Directory">
            <thead>
              <tr>
                <th scope="col" style="min-width: 220px;">Counsellor</th>
                <th scope="col" style="min-width: 200px;">Context & Specialisation</th>
                <th scope="col" style="min-width: 110px;">Experience</th>
                <th scope="col" style="min-width: 140px;">Languages</th>
                <th scope="col" style="min-width: 120px;">Fee (Student Rate)</th>
                <th scope="col" style="min-width: 130px;">Availability</th>
                <th scope="col" style="min-width: 230px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(c => {
                const fee = c.fee || 800;
                const contextText = c.context || c.specialties.join(', ');

                return `
                  <tr id="counsellor-row-${c.id}">
                    <td>
                      <div class="counsellor-profile-cell">
                        <div class="counsellor-avatar-circle" style="width: 40px; height: 40px; font-size: 0.875rem;">
                          ${c.avatar || 'DR'}
                        </div>
                        <div>
                          <strong class="counsellor-table-name">${c.name}</strong>
                          <span class="counsellor-table-title">${c.title}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="counsellor-context-cell">
                        <span class="context-primary-label">${contextText}</span>
                        <div class="specialties-micro-tags mt-1">
                          ${c.specialties.slice(0, 2).map(s => `<span class="badge badge-surface badge-xs">${s}</span>`).join('')}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span class="experience-pill font-medium text-ink">${c.experience_years} Years</span>
                    </td>

                    <td>
                      <span class="text-xs text-ink-80">${c.languages.join(', ')}</span>
                    </td>

                    <td>
                      <div class="fee-badge-wrap">
                        <strong class="fee-amount text-accent">₹${fee}</strong>
                        <span class="fee-period text-xs text-ink-60">/ session</span>
                      </div>
                    </td>

                    <td>
                      <span class="schedule-days-pill text-xs">${c.available_days.join(', ')}</span>
                      <span class="text-xs text-ink-60 block mt-0.5">${c.available_slots.length} daily slots</span>
                    </td>

                    <td>
                      <div class="table-actions-cell">
                        <button
                          type="button"
                          class="btn btn-video btn-sm btn-video-chat"
                          data-id="${c.id}"
                          title="Start live video consultation with ${c.name}"
                        >
                          📹 Video Chat
                        </button>
                        <button
                          type="button"
                          class="btn btn-primary btn-sm btn-book"
                          data-id="${c.id}"
                          title="Book an appointment"
                        >
                          📅 Book
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Wire Video Chat buttons
      tableWrapper.querySelectorAll('.btn-video-chat').forEach(btn => {
        btn.addEventListener('click', () => {
          const cId = btn.dataset.id;
          const counsellor = allCounsellors.find(item => item.id === cId);
          openVideoModal(counsellor);
        });
      });

      // Wire Book buttons
      tableWrapper.querySelectorAll('.btn-book').forEach(btn => {
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
          (c.context && c.context.toLowerCase().includes(q)) ||
          c.specialties.some(s => s.toLowerCase().includes(q)) ||
          c.bio.toLowerCase().includes(q);

        const matchesSpec = !spec || c.specialties.includes(spec);
        return matchesQuery && matchesSpec;
      });

      renderCounsellorsTable(filtered);
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
      const fee = c.fee || 800;

      counsellorInfoBox.innerHTML = `
        <div class="counsellor-avatar-circle" style="width:36px;height:36px;font-size:0.875rem;">${c.avatar}</div>
        <div style="flex-grow:1;">
          <strong>${c.name}</strong>
          <span class="text-xs text-ink-60 block">${c.title} • ${c.experience_years} Years Exp.</span>
        </div>
        <div class="text-right">
          <strong class="text-accent">₹${fee}</strong>
          <span class="text-xs text-ink-60 block">Fee per session</span>
        </div>
      `;

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

              <div class="appointment-actions-row">
                ${!isCancelled ? `
                  <a
                    href="https://meet.jit.si/serenova-consultation-${a.counsellor_id}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-video btn-sm"
                  >
                    📹 Join Video Call
                  </a>
                  <button type="button" class="btn btn-ghost btn-sm btn-cancel-appt text-error" data-id="${a.id}">
                    Cancel appointment
                  </button>
                ` : `
                  <span class="text-xs text-ink-60">Consultation cancelled</span>
                `}
              </div>
            </div>
          `;
        }).join('');

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
