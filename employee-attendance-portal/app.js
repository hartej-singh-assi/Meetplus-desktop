/* ==========================================================================
   PulseHR Pro - Enterprise Multi-User Auth & Hierarchy Core Engine
   ========================================================================== */

// --- 1. User Database with Reporting Hierarchy ---
const USERS_DB = {
  "john.doe@company.com": {
    email: "john.doe@company.com",
    id: "EMP-84920",
    name: "John Doe",
    title: "Sr. Software Engineer",
    role: "EMPLOYEE", // Level 3: Individual Contributor
    canApprove: false,
    managerName: "Michael Vance (Engineering Manager)",
    avatar: "JD",
    avatarBg: "#3b82f6"
  },
  "michael.vance@company.com": {
    email: "michael.vance@company.com",
    id: "MGR-10204",
    name: "Michael Vance",
    title: "Engineering Manager",
    role: "MANAGER", // Level 2: Reporting Manager
    canApprove: true,
    managerName: "Sarah Jenkins (VP & HR Admin)",
    avatar: "MV",
    avatarBg: "#f59e0b"
  },
  "sarah.jenkins@company.com": {
    email: "sarah.jenkins@company.com",
    id: "HR-00001",
    name: "Sarah Jenkins",
    title: "VP of HR & Operations",
    role: "HR_ADMIN", // Level 1: Global HR Admin
    canApprove: true,
    managerName: "Executive Board",
    avatar: "SJ",
    avatarBg: "#8b5cf6"
  }
};

const STORAGE_KEY_AUTH = 'pulsehr_auth_user_v1';
const STORAGE_KEY_ATTENDANCE = 'pulsehr_attendance_records_v1';
const STORAGE_KEY_PUNCH_STATE = 'pulsehr_punch_state_v1';

let currentUser = null;
let attendanceData = {};
let selectedDateForModal = null;

let punchState = {
  isClockedIn: false,
  clockInTime: null,
  clockOutTime: null,
  elapsedSeconds: 0
};

let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {

  // --- 2. Auth Session Manager ---
  const loginContainer = document.getElementById('loginContainer');
  const appContent = document.getElementById('appContent');
  const logoutBtn = document.getElementById('logoutBtn');
  const manualLoginForm = document.getElementById('manualLoginForm');

  function checkSession() {
    const savedEmail = localStorage.getItem(STORAGE_KEY_AUTH);
    if (savedEmail && USERS_DB[savedEmail]) {
      loginUser(savedEmail, false);
    } else {
      showLoginScreen();
    }
  }

  window.quickLogin = function(email) {
    loginUser(email, true);
  };

  manualLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    if (USERS_DB[email]) {
      loginUser(email, true);
    } else {
      // Default to John Doe if unrecognized email
      loginUser('john.doe@company.com', true);
    }
  });

  function loginUser(email, triggerToast = true) {
    currentUser = USERS_DB[email] || USERS_DB['john.doe@company.com'];
    localStorage.setItem(STORAGE_KEY_AUTH, currentUser.email);

    loginContainer.style.display = 'none';
    appContent.style.display = 'flex';

    updateUserProfileUI();
    enforceHierarchyPermissions();
    initializeSeedData();
    loadPunchState();
    renderCalendar();
    renderAttendanceTable();
    updateStatsCards();

    if (triggerToast) {
      showToast(`Welcome back, ${currentUser.name}! Signed in as ${currentUser.title}.`, 'success');
    }
  }

  logoutBtn.addEventListener('click', logoutUser);

  function logoutUser() {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    currentUser = null;
    appContent.style.display = 'none';
    loginContainer.style.display = 'flex';
    showToast('Signed out of PulseHR Pro session.', 'info');
  }

  function showLoginScreen() {
    appContent.style.display = 'none';
    loginContainer.style.display = 'flex';
  }

  function updateUserProfileUI() {
    if (!currentUser) return;
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userRoleDisplay').textContent = `${currentUser.id} • ${currentUser.title}`;
    document.getElementById('userMgtTag').textContent = `Reporting to: ${currentUser.managerName}`;
    
    const avatarEl = document.getElementById('avatarInitials');
    avatarEl.textContent = currentUser.avatar;
    avatarEl.style.background = currentUser.avatarBg;

    // Update 360° Profile fields
    document.getElementById('profAvatar').textContent = currentUser.avatar;
    document.getElementById('profAvatar').style.background = currentUser.avatarBg;
    document.getElementById('profName').textContent = currentUser.name;
    document.getElementById('profTitle').textContent = `${currentUser.title} • Engineering & HR`;
    document.getElementById('profEmail').innerHTML = `<i class="fa-solid fa-envelope"></i> ${currentUser.email}`;
    document.getElementById('valFullName').textContent = currentUser.name;
    document.getElementById('valEmpId').textContent = currentUser.id;
    document.getElementById('valDesignation').textContent = currentUser.title;
    document.getElementById('valReportingMgr').textContent = currentUser.managerName;
    document.getElementById('psEmpName').textContent = currentUser.name;
    document.getElementById('psEmpId').textContent = currentUser.id;
    document.getElementById('psDesignation').textContent = currentUser.title;
  }

  // --- 3. Strict Hierarchy Permission Guard ---
  const hrQueueNavTab = document.getElementById('hrQueueNavTab');
  const portalSubhead = document.getElementById('portalSubhead');
  const approvalScopeText = document.getElementById('approvalScopeText');

  function enforceHierarchyPermissions() {
    if (!currentUser) return;

    if (currentUser.canApprove) {
      hrQueueNavTab.style.display = 'flex';
      if (currentUser.role === 'HR_ADMIN') {
        portalSubhead.textContent = 'Global HR & Executive Admin Suite';
        approvalScopeText.textContent = 'Global Company Oversight: Review all pending employee leaves, WFH, and expense claims.';
      } else {
        portalSubhead.textContent = 'Reporting Manager Approvals Suite';
        approvalScopeText.textContent = `Team Oversight: Review pending requests submitted by your direct reports.`;
      }
    } else {
      // Standard IC Employee: CANNOT APPROVE ANYTHING
      hrQueueNavTab.style.display = 'none';
      portalSubhead.textContent = 'Employee Self-Service (ESS) Portal';

      // If currently on Approvals tab, forcibly revert to Attendance tab
      const activeTab = document.querySelector('.module-view.active');
      if (activeTab && activeTab.id === 'tabHrQueue') {
        switchTab('tabAttendance');
      }
    }
  }

  // --- 4. Module Navigation Engine ---
  const navTabBtns = document.querySelectorAll('.nav-tab-btn');
  const moduleViews = document.querySelectorAll('.module-view');

  navTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Guard Check: Block standard employees from accessing HR Approvals Queue
      if (tabId === 'tabHrQueue' && currentUser && !currentUser.canApprove) {
        showToast('Access Denied: Standard employees cannot access approval workflows.', 'danger');
        return;
      }
      switchTab(tabId);
    });
  });

  function switchTab(tabId) {
    navTabBtns.forEach(b => b.classList.remove('active'));
    moduleViews.forEach(v => v.classList.remove('active'));

    const targetBtn = document.querySelector(`.nav-tab-btn[data-tab="${tabId}"]`);
    const targetView = document.getElementById(tabId);

    if (targetBtn) targetBtn.classList.add('active');
    if (targetView) targetView.classList.add('active');
  }

  // --- 5. Data Persistence & Seed Data ---
  function initializeSeedData() {
    const stored = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (stored) {
      attendanceData = JSON.parse(stored);
      return;
    }

    const seed = {};
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
      const d = new Date(2026, 7, day);
      const dayOfWeek = d.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        seed[dateStr] = { date: dateStr, status: 'WEEKEND', clockIn: '--:--', clockOut: '--:--', hours: 0, location: 'Non-Working Day', notes: 'Weekend' };
      } else if (day === 15) {
        seed[dateStr] = { date: dateStr, status: 'HOLIDAY', clockIn: '--:--', clockOut: '--:--', hours: 0, location: 'National Holiday', notes: 'Independence Day' };
      } else if (day === 6) {
        seed[dateStr] = { date: dateStr, status: 'LEAVE', clockIn: '--:--', clockOut: '--:--', hours: 0, location: 'Out of Office', notes: 'Casual Leave' };
      } else if (day === 4 || day === 11) {
        seed[dateStr] = { date: dateStr, status: 'LATE', clockIn: '09:28 AM', clockOut: '06:15 PM', hours: 8.8, location: 'HQ Office Tech Park', notes: 'Traffic delay' };
      } else if (day > 10) {
        seed[dateStr] = { date: dateStr, status: 'UPCOMING', clockIn: '--:--', clockOut: '--:--', hours: 0, location: '--', notes: 'Scheduled Shift' };
      } else {
        seed[dateStr] = { date: dateStr, status: 'PRESENT', clockIn: '09:02 AM', clockOut: '06:05 PM', hours: 9.0, location: 'HQ Office Tech Park', notes: 'Normal working day' };
      }
    }

    attendanceData = seed;
    saveAttendanceData();
  }

  function saveAttendanceData() {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceData));
  }

  function loadPunchState() {
    const saved = localStorage.getItem(STORAGE_KEY_PUNCH_STATE);
    if (saved) {
      punchState = JSON.parse(saved);
      if (punchState.isClockedIn) {
        startActivePunchTimer();
      }
    }
    updatePunchUI();
  }

  function savePunchState() {
    localStorage.setItem(STORAGE_KEY_PUNCH_STATE, JSON.stringify(punchState));
  }

  // --- 6. Digital Clock & Punch Action ---
  function updateLiveClock() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

    document.getElementById('digitalClock').textContent = now.toLocaleTimeString('en-US', timeOptions);
    document.getElementById('digitalDate').textContent = now.toLocaleDateString('en-US', dateOptions);
  }

  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  const punchBtn = document.getElementById('punchBtn');
  const punchBtnText = document.getElementById('punchBtnText');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const punchInTimeVal = document.getElementById('punchInTimeVal');
  const punchOutTimeVal = document.getElementById('punchOutTimeVal');
  const totalWorkedVal = document.getElementById('totalWorkedVal');

  punchBtn.addEventListener('click', togglePunchStatus);

  function togglePunchStatus() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = '2026-08-10';

    if (!punchState.isClockedIn) {
      punchState.isClockedIn = true;
      punchState.clockInTime = timeStr;
      punchState.clockOutTime = '--:--';
      punchState.clockInTimestamp = now.getTime();

      const hour = now.getHours();
      const min = now.getMinutes();
      const isLate = (hour > 9 || (hour === 9 && min > 15));

      attendanceData[dateStr] = {
        date: dateStr,
        status: isLate ? 'LATE' : 'PRESENT',
        clockIn: timeStr,
        clockOut: '--:--',
        hours: 0,
        location: 'HQ Office Tech Park',
        notes: isLate ? 'Late Clock-in' : 'On-time Clock-in'
      };

      saveAttendanceData();
      startActivePunchTimer();
      showToast(isLate ? 'Punched in (Late arrival recorded)' : 'Successfully Clocked In!', isLate ? 'warning' : 'success');

    } else {
      punchState.isClockedIn = false;
      punchState.clockOutTime = timeStr;

      if (timerInterval) clearInterval(timerInterval);
      const hoursWorked = (punchState.elapsedSeconds / 3600).toFixed(1);

      let finalStatus = 'PRESENT';
      if (hoursWorked < 5) finalStatus = 'HALFDAY';

      attendanceData[dateStr] = {
        date: dateStr,
        status: finalStatus,
        clockIn: punchState.clockInTime,
        clockOut: timeStr,
        hours: parseFloat(hoursWorked),
        location: 'HQ Office Tech Park',
        notes: 'Punched out for the day'
      };

      saveAttendanceData();
      showToast(`Clocked Out! Total time: ${hoursWorked} hrs`, 'success');
    }

    savePunchState();
    updatePunchUI();
    renderCalendar();
    renderAttendanceTable();
    updateStatsCards();
  }

  function startActivePunchTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (punchState.clockInTimestamp) {
        const now = new Date().getTime();
        punchState.elapsedSeconds = Math.floor((now - punchState.clockInTimestamp) / 1000);
        const hrs = Math.floor(punchState.elapsedSeconds / 3600);
        const mins = Math.floor((punchState.elapsedSeconds % 3600) / 60);
        totalWorkedVal.textContent = `${hrs}h ${mins}m`;
      }
    }, 1000);
  }

  function updatePunchUI() {
    if (punchState.isClockedIn) {
      punchBtn.className = 'punch-button clock-out';
      punchBtnText.textContent = 'CLOCK OUT';
      statusDot.className = 'status-indicator-dot active';
      statusText.textContent = 'Currently Clocked In';
      punchInTimeVal.textContent = punchState.clockInTime || '--:--';
      punchOutTimeVal.textContent = '--:--';
    } else {
      punchBtn.className = 'punch-button clock-in';
      punchBtnText.textContent = 'CLOCK IN';
      statusDot.className = 'status-indicator-dot';
      statusText.textContent = punchState.clockOutTime ? 'Clocked Out Today' : 'Not Punched In';
      punchInTimeVal.textContent = punchState.clockInTime || '--:--';
      punchOutTimeVal.textContent = punchState.clockOutTime || '--:--';
    }
  }

  // --- 7. Attendance Calendar Engine ---
  const calendarDaysGrid = document.getElementById('calendarDaysGrid');
  const calendarMonthTitle = document.getElementById('calendarMonthTitle');
  let viewYear = 2026;
  let viewMonth = 7;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  document.getElementById('todayBtn').addEventListener('click', () => {
    viewYear = 2026; viewMonth = 7; renderCalendar();
  });

  function renderCalendar() {
    calendarMonthTitle.textContent = `${monthNames[viewMonth]} ${viewYear}`;
    calendarDaysGrid.innerHTML = '';

    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const adjustedFirstDay = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();

    for (let i = adjustedFirstDay; i > 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `<div class="day-header"><span class="day-number">${prevMonthTotalDays - i + 1}</span></div>`;
      calendarDaysGrid.appendChild(cell);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = attendanceData[dateStr] || { status: 'UPCOMING', clockIn: '--:--', clockOut: '--:--', hours: 0 };

      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      if (viewYear === 2026 && viewMonth === 7 && day === 10) cell.classList.add('today');

      cell.innerHTML = `
        <div class="day-header">
          <span class="day-number">${day}</span>
          <span class="status-badge-chip ${record.status.toLowerCase()}">${record.status}</span>
        </div>
        <div class="day-content">
          ${record.clockIn !== '--:--' ? `<div class="time-row"><i class="fa-regular fa-clock"></i> ${record.clockIn}</div>` : ''}
          ${record.hours > 0 ? `<div class="hours-worked-tag">${record.hours} hrs</div>` : ''}
        </div>
      `;

      cell.addEventListener('click', () => openDayDetailModal(dateStr, record));
      calendarDaysGrid.appendChild(cell);
    }
  }

  // --- 8. Modals Manager ---
  function openModal(modalEl) { modalEl.classList.add('show'); }
  function closeModal(modalEl) { modalEl.classList.remove('show'); }

  document.querySelectorAll('.closeModalBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      closeModal(document.getElementById(modalId));
    });
  });

  function openDayDetailModal(dateStr, record) {
    selectedDateForModal = dateStr;
    const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('modalDateTitle').textContent = `Attendance Details - ${formattedDate}`;
    document.getElementById('modalStatusBadge').textContent = record.status;
    document.getElementById('modalStatusBadge').className = `status-badge-chip ${record.status.toLowerCase()}`;
    document.getElementById('modalClockIn').textContent = record.clockIn || '--:--';
    document.getElementById('modalClockOut').textContent = record.clockOut || '--:--';
    document.getElementById('modalHours').textContent = `${record.hours} hrs`;
    document.getElementById('modalNotes').textContent = record.notes ? `"${record.notes}"` : 'No notes attached.';
    openModal(document.getElementById('dayDetailModal'));
  }

  document.getElementById('openLeaveModalBtn').addEventListener('click', () => openModal(document.getElementById('leaveModal')));
  document.getElementById('openWfhModalBtn')?.addEventListener('click', () => openModal(document.getElementById('wfhModal')));
  document.getElementById('openCompOffModalBtn')?.addEventListener('click', () => openModal(document.getElementById('wfhModal')));
  document.getElementById('openExpenseModalBtn')?.addEventListener('click', () => openModal(document.getElementById('expenseModal')));

  document.getElementById('regularizeFromModalBtn').addEventListener('click', () => {
    closeModal(document.getElementById('dayDetailModal'));
    document.getElementById('regDate').value = selectedDateForModal;
    openModal(document.getElementById('regularizeModal'));
  });

  // Handle Leave Submission
  document.getElementById('leaveForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('leaveType').value;
    const startDate = document.getElementById('leaveStartDate').value;
    if (startDate) {
      attendanceData[startDate] = { date: startDate, status: 'LEAVE', clockIn: '--:--', clockOut: '--:--', hours: 0, location: 'Out of Office', notes: `${type} Request` };
      saveAttendanceData();
      renderCalendar();
      renderAttendanceTable();
      updateStatsCards();
    }
    closeModal(document.getElementById('leaveModal'));
    showToast(`Leave application submitted for ${type}! Sent to ${currentUser.managerName} for approval.`, 'success');
  });

  // Handle WFH Submission
  document.getElementById('wfhForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const wfhDate = document.getElementById('wfhDate').value;
    closeModal(document.getElementById('wfhModal'));
    showToast(`WFH request submitted for ${wfhDate}! Sent to ${currentUser.managerName} for approval.`, 'success');
  });

  // Handle Expense Submission
  document.getElementById('expenseForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('expCategory').value;
    const amount = document.getElementById('expAmount').value;
    const tbody = document.getElementById('expenseTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#EXP-${Math.floor(1000 + Math.random() * 9000)}</strong></td>
      <td>${category}</td>
      <td>Aug 10, 2026</td>
      <td><strong>$${parseFloat(amount).toFixed(2)}</strong></td>
      <td><a href="#" style="color: var(--primary-accent);"><i class="fa-solid fa-paperclip"></i> receipt_uploaded.pdf</a></td>
      <td><span class="status-badge-chip late">UNDER MANAGER REVIEW</span></td>
      <td><button class="action-btn" style="padding: 4px 10px; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i> View</button></td>
    `;
    tbody.prepend(tr);
    closeModal(document.getElementById('expenseModal'));
    showToast(`Expense claim submitted! Sent to ${currentUser.managerName} for authorization.`, 'success');
  });

  // Handle Regularization Submission
  document.getElementById('regularizeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const regDate = document.getElementById('regDate').value;
    attendanceData[regDate] = {
      date: regDate, status: 'PRESENT', clockIn: '09:00 AM', clockOut: '06:00 PM', hours: 9.0, location: 'Regularized', notes: 'Attendance Regularized'
    };
    saveAttendanceData();
    renderCalendar();
    renderAttendanceTable();
    updateStatsCards();
    closeModal(document.getElementById('regularizeModal'));
    showToast('Attendance regularization submitted to manager!', 'success');
  });

  // --- 9. Payslip Viewer Modal ---
  window.viewPayslipModal = function(monthStr, amount) {
    document.getElementById('psMonthTitle').textContent = `PAYSLIP FOR ${monthStr.toUpperCase()}`;
    document.getElementById('psNetPayVal').textContent = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    openModal(document.getElementById('payslipModal'));
  };

  // --- 10. Company Policy Viewer ---
  window.openPolicyModal = function(title, content) {
    document.getElementById('policyModalTitle').textContent = title;
    document.getElementById('policyModalBody').textContent = content;
    openModal(document.getElementById('policyModal'));
  };

  document.getElementById('policySearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#tabPolicies .content-box-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? 'flex' : 'none';
    });
  });

  // --- 11. Profile Tabs ---
  document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.prof-tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-proftab');
      document.getElementById(targetId).style.display = 'block';
    });
  });

  // --- 12. HR Approvals Queue Actions (Hierarchy Protected) ---
  window.approveHrItem = function(btn, title) {
    if (!currentUser || !currentUser.canApprove) {
      showToast('Unauthorized: Only managers can perform approvals.', 'danger');
      return;
    }
    const row = btn.closest('tr');
    row.style.opacity = '0.4';
    btn.parentElement.innerHTML = `<span class="status-badge-chip present"><i class="fa-solid fa-check"></i> APPROVED BY ${currentUser.name.toUpperCase()}</span>`;
    updateHrQueueCounter();
    showToast(`Approved by ${currentUser.name}: ${title}`, 'success');
  };

  window.rejectHrItem = function(btn) {
    if (!currentUser || !currentUser.canApprove) {
      showToast('Unauthorized: Only managers can perform approvals.', 'danger');
      return;
    }
    const row = btn.closest('tr');
    row.style.opacity = '0.4';
    btn.parentElement.innerHTML = `<span class="status-badge-chip absent"><i class="fa-solid fa-xmark"></i> REJECTED BY ${currentUser.name.toUpperCase()}</span>`;
    updateHrQueueCounter();
    showToast(`Request Rejected by ${currentUser.name}`, 'warning');
  };

  function updateHrQueueCounter() {
    const countEl = document.getElementById('hrQueueCount');
    let current = parseInt(countEl.textContent, 10);
    if (current > 0) countEl.textContent = current - 1;
  }

  // --- 13. Attendance Table Logger ---
  const attendanceTableBody = document.getElementById('attendanceTableBody');
  document.getElementById('searchInput').addEventListener('input', renderAttendanceTable);
  document.getElementById('statusFilterSelect').addEventListener('change', renderAttendanceTable);

  function renderAttendanceTable() {
    attendanceTableBody.innerHTML = '';
    const query = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilterSelect').value;

    Object.keys(attendanceData).sort().reverse().forEach(dateStr => {
      const rec = attendanceData[dateStr];
      if (rec.status === 'UPCOMING') return;

      const matchesSearch = dateStr.includes(query) || rec.status.toLowerCase().includes(query);
      const matchesStatus = (statusFilter === 'ALL') || (rec.status === statusFilter);

      if (matchesSearch && matchesStatus) {
        const tr = document.createElement('tr');
        const dateFormatted = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        tr.innerHTML = `
          <td><strong>${dateFormatted}</strong></td>
          <td>09:00 AM - 06:00 PM</td>
          <td>${rec.clockIn}</td>
          <td>${rec.clockOut}</td>
          <td><strong>${rec.hours > 0 ? rec.hours + ' hrs' : '--'}</strong></td>
          <td><span class="status-badge-chip ${rec.status.toLowerCase()}">${rec.status}</span></td>
          <td>${rec.notes || rec.location}</td>
          <td><button class="action-btn" style="padding: 4px 10px; font-size: 0.75rem;" onclick="openDayDetailModal('${dateStr}', attendanceData['${dateStr}'])"><i class="fa-solid fa-eye"></i> Details</button></td>
        `;
        attendanceTableBody.appendChild(tr);
      }
    });
  }

  // CSV Export
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    let csv = 'Date,Status,Clock In,Clock Out,Total Hours,Notes\n';
    Object.keys(attendanceData).sort().forEach(d => {
      const r = attendanceData[d];
      csv += `"${d}","${r.status}","${r.clockIn}","${r.clockOut}","${r.hours}","${r.notes || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Attendance_Report.csv'; a.click();
    showToast('Report downloaded to CSV!', 'success');
  });

  // Stats Card Calculations
  function updateStatsCards() {
    let totalPresent = 0, totalLate = 0, totalHours = 0, workingDaysCount = 0;
    Object.keys(attendanceData).forEach(d => {
      const r = attendanceData[d];
      if (r.status !== 'WEEKEND' && r.status !== 'HOLIDAY' && r.status !== 'UPCOMING') {
        workingDaysCount++;
        if (r.status === 'PRESENT') totalPresent++;
        if (r.status === 'LATE') { totalPresent++; totalLate++; }
        totalHours += r.hours || 0;
      }
    });
    const rate = workingDaysCount > 0 ? ((totalPresent / workingDaysCount) * 100).toFixed(1) : 100;
    document.getElementById('statRate').textContent = `${rate}%`;
    document.getElementById('progressRate').style.width = `${rate}%`;
    document.getElementById('statPresentDays').innerHTML = `${totalPresent} <span style="font-size: 1rem; font-weight: normal; color: var(--text-muted);">/ ${workingDaysCount}</span>`;
    document.getElementById('statTotalHours').textContent = `${totalHours.toFixed(1)} hrs`;
  }

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    themeToggleBtn.innerHTML = next === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  });

  function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Initialize Session
  checkSession();

});
