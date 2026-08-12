import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Toast from './components/Toast';
import { 
  saveDailyAttendance, 
  saveAttendanceRecord, 
  subscribeToAttendance, 
  addEmployeeToFirestore, 
  deleteEmployeeFromFirestore, 
  subscribeToEmployees 
} from './firebase/attendanceService';
import { 
  CheckSquare, 
  Calendar, 
  CalendarDays, 
  Users, 
  UserPlus, 
  Trash2,
  LogOut,
  Shield,
  User,
  Save,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

// Code Splitting / Lazy Loading for Performance
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const EmployeePortal = lazy(() => import('./components/EmployeePortal'));

// Minimalist Loading Spinner for Lazy-loaded routes
function LoadingSpinner() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{
        width: '42px',
        height: '42px',
        border: '3px solid rgba(99, 102, 241, 0.2)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Loading Portal...</span>
    </div>
  );
}

const INITIAL_EMPLOYEES = [];

function MainApp({ isForceAdminRoute }) {
  const { currentUser, userRole, logout, isFirebaseConfigured } = useAuth();
  
  const [activeTab, setActiveTab] = useState('mark'); // 'mark' | 'register' | 'employees'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  // Employee roster
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);

  // New Employee form state (Name + Email)
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Engineering');

  // Attendance store
  const [attendanceData, setAttendanceData] = useState({});

  // Toast notification message
  const [toastMessage, setToastMessage] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Admin access check
  const isAdmin = isForceAdminRoute || userRole === 'admin';

  // Single Real-time Firestore sync listeners
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubAttendance = subscribeToAttendance((data) => {
      setAttendanceData(prev => ({ ...prev, ...data }));
    });

    const unsubEmployees = subscribeToEmployees((list) => {
      setEmployees(list || []);
    });

    return () => {
      unsubAttendance();
      unsubEmployees();
    };
  }, [isFirebaseConfigured]);

  // Mark status in local state for selectedDate
  const handleStatusChange = useCallback((empId, status) => {
    if (!isAdmin) return;

    setAttendanceData(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [empId]: status
      }
    }));
  }, [isAdmin, selectedDate]);

  // Save Attendance to Firestore for selectedDate
  const handleSaveAttendance = async () => {
    if (!isAdmin) return;
    setSavingAttendance(true);

    try {
      const currentDayMap = attendanceData[selectedDate] || {};
      await saveDailyAttendance(selectedDate, { [selectedDate]: currentDayMap });
      setToastMessage(`Attendance saved successfully for ${selectedDate}!`);
    } catch (err) {
      console.error(err);
      setToastMessage('Failed to save attendance. Please try again.');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Add new employee (Admin Only: Name + Email)
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newEmpName.trim() || !newEmpEmail.trim()) return;

    const empData = {
      name: newEmpName.trim(),
      email: newEmpEmail.toLowerCase().trim(),
      designation: newEmpRole.trim() || 'Staff Member',
      department: newEmpDept
    };

    try {
      await addEmployeeToFirestore(empData);
      setToastMessage(`Employee ${newEmpName} registered successfully!`);
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpRole('');
    } catch (err) {
      console.error(err);
    }
  };

  // Remove employee (Admin Only)
  const handleRemoveEmployee = async (emp) => {
    if (!isAdmin) return;
    await deleteEmployeeFromFirestore(emp.id || emp.uid, emp.email);
    setToastMessage(`Employee removed.`);
  };

  // Memoized daily statistics for selectedDate
  const currentDayRecords = useMemo(() => attendanceData[selectedDate] || {}, [attendanceData, selectedDate]);
  
  const dailyStats = useMemo(() => {
    let present = 0, absent = 0, late = 0, leave = 0;
    employees.forEach(emp => {
      const st = currentDayRecords[emp.id || emp.email];
      if (st === 'P') present++;
      else if (st === 'A') absent++;
      else if (st === 'L') late++;
      else if (st === 'H') leave++;
    });
    return { present, absent, late, leave };
  }, [employees, currentDayRecords]);

  // Days array generator for monthly register
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 0);
    const daysCount = date.getDate();
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  }, [selectedMonth]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* Toast Popup Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Header Banner */}
      <header className="glass-panel app-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="brand">
          <div className="brand-icon">
            <CheckSquare size={24} />
          </div>
          <div>
            <h1 className="brand-title">Attendance Tracker Pro</h1>
            <p className="brand-subtitle">University & Enterprise Attendance Management</p>
          </div>
        </div>

        {/* User Badge & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '0.4rem 0.85rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              background: isAdmin ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              {isAdmin ? <Shield size={14} /> : <User size={14} />}
            </div>
            <div>
              <div style={{ fontWeight: '700', lineHeight: 1.2 }}>{currentUser?.name || currentUser?.displayName || currentUser?.email}</div>
              <div style={{ fontSize: '0.72rem', color: isAdmin ? '#f59e0b' : '#818cf8', fontWeight: '700', textTransform: 'uppercase' }}>
                {isAdmin ? '👑 Admin Panel' : '👤 Employee View'}
              </div>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={logout} style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      {/* RENDER EMPLOYEE PORTAL IF NOT ADMIN */}
      {!isAdmin ? (
        <Suspense fallback={<LoadingSpinner />}>
          <EmployeePortal 
            currentUser={currentUser}
            employees={employees}
            attendanceData={attendanceData}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        </Suspense>
      ) : (
        /* RENDER ADMIN CONTROLS IF ADMIN ROLE OR ACCESSED VIA /admin ROUTE */
        <>
          {/* Navigation Tabs for Admin */}
          <div className="glass-panel" style={{ padding: '0.5rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button 
              className={`pill-btn ${activeTab === 'mark' ? 'active' : ''}`}
              onClick={() => setActiveTab('mark')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Calendar size={16} /> Attendance
            </button>

            <button 
              className={`pill-btn ${activeTab === 'employees' ? 'active' : ''}`}
              onClick={() => setActiveTab('employees')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Users size={16} /> Employees ({employees.length})
            </button>

            <button 
              className={`pill-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CalendarDays size={16} /> Monthly Register
            </button>
          </div>

          {/* TAB 1: MARK ATTENDANCE */}
          {activeTab === 'mark' && (
            <div>
              <div className="glass-panel controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select Date:</label>
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      padding: '0.5rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--bg-card-border)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-present">Present: {dailyStats.present}</span>
                  <span className="badge badge-late">Late: {dailyStats.late}</span>
                  <span className="badge badge-absent">Absent: {dailyStats.absent}</span>
                  <span className="badge badge-leave">Leave: {dailyStats.leave}</span>
                  
                  <button 
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance}
                    className="btn btn-primary"
                    style={{ 
                      height: '38px', 
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      fontWeight: '700',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Save size={16} /> {savingAttendance ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>

              <div className="glass-panel table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Employee Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th style={{ textAlign: 'center' }}>Mark Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                          No employees added yet. Go to the <strong>Employees</strong> tab to add your team members!
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp, index) => {
                        const empKey = emp.id || emp.email;
                        const status = currentDayRecords[empKey] || '';
                        return (
                          <tr key={empKey}>
                            <td style={{ color: 'var(--text-dim)', fontWeight: '600' }}>{index + 1}</td>
                            <td>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{emp.name}</div>
                              {emp.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{emp.email}</div>}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{emp.designation}</td>
                            <td>
                              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                {emp.department}
                              </span>
                            </td>
                            <td>
                              <div className="status-selector" style={{ margin: '0 auto' }}>
                                <button 
                                  className={`status-btn present ${status === 'P' ? 'active' : ''}`}
                                  onClick={() => handleStatusChange(empKey, 'P')}
                                >
                                  Present (P)
                                </button>
                                <button 
                                  className={`status-btn late ${status === 'L' ? 'active' : ''}`}
                                  onClick={() => handleStatusChange(empKey, 'L')}
                                >
                                  Late (L)
                                </button>
                                <button 
                                  className={`status-btn absent ${status === 'A' ? 'active' : ''}`}
                                  onClick={() => handleStatusChange(empKey, 'A')}
                                >
                                  Absent (A)
                                </button>
                                <button 
                                  className={`status-btn leave ${status === 'H' ? 'active' : ''}`}
                                  onClick={() => handleStatusChange(empKey, 'H')}
                                >
                                  Leave (H)
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: EMPLOYEES (Add Name + Email) */}
          {activeTab === 'employees' && isAdmin && (
            <div>
              <div className="glass-panel controls-bar" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={18} color="#f59e0b" /> Add Employee (Name + Email)
                </h3>

                <form onSubmit={handleAddEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="john@company.com"
                      value={newEmpEmail}
                      onChange={(e) => setNewEmpEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Designation</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Software Engineer"
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Department</label>
                    <select
                      value={newEmpDept}
                      onChange={(e) => setNewEmpDept(e.target.value)}
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Management">Management</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ height: '42px', justifyContent: 'center', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    <UserPlus size={16} /> Register Employee
                  </button>
                </form>
              </div>

              <div className="glass-panel table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name & Email</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                          No employees added yet. Use the form above to add your team!
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp, idx) => (
                        <tr key={emp.id || emp.email}>
                          <td style={{ color: 'var(--text-dim)', fontWeight: '600' }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{emp.name}</div>
                            {emp.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{emp.email}</div>}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{emp.designation}</td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                              {emp.department}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn-icon-only"
                              style={{ color: 'var(--status-absent)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                              onClick={() => handleRemoveEmployee(emp)}
                              title="Remove Employee"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MONTHLY REGISTER */}
          {activeTab === 'register' && (
            <div>
              <div className="glass-panel controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select Month:</label>
                  <input 
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      padding: '0.5rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--bg-card-border)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--status-present)', fontWeight: '700' }}>P = Present</span>
                  <span style={{ color: 'var(--status-late)', fontWeight: '700' }}>L = Late</span>
                  <span style={{ color: 'var(--status-absent)', fontWeight: '700' }}>A = Absent</span>
                  <span style={{ color: 'var(--status-leave)', fontWeight: '700' }}>H = Half/Leave</span>
                </div>
              </div>

              <div className="glass-panel table-container" style={{ overflowX: 'auto' }}>
                <table className="attendance-table" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: '#121826', zIndex: 2 }}>Employee</th>
                      {daysInMonth.map(d => (
                        <th key={d} style={{ textAlign: 'center', minWidth: '34px', padding: '0.5rem 0.2rem' }}>
                          {d}
                        </th>
                      ))}
                      <th style={{ textAlign: 'center', color: 'var(--status-present)' }}>P</th>
                      <th style={{ textAlign: 'center', color: 'var(--status-absent)' }}>A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={daysInMonth.length + 3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                          No employee records found.
                        </td>
                      </tr>
                    ) : (
                      employees.map(emp => {
                        const empKey = emp.id || emp.email;
                        let monthP = 0;
                        let monthA = 0;

                        return (
                          <tr key={empKey}>
                            <td style={{ position: 'sticky', left: 0, background: '#121826', zIndex: 1, fontWeight: '700' }}>
                              {emp.name}
                            </td>
                            {daysInMonth.map(day => {
                              const dayStr = `${selectedMonth}-${day < 10 ? '0' + day : day}`;
                              const st = attendanceData[dayStr]?.[empKey] || '-';
                              
                              if (st === 'P') monthP++;
                              if (st === 'A') monthA++;

                              let color = 'var(--text-dim)';
                              if (st === 'P') color = 'var(--status-present)';
                              if (st === 'A') color = 'var(--status-absent)';
                              if (st === 'L') color = 'var(--status-late)';
                              if (st === 'H') color = 'var(--status-leave)';

                              return (
                                <td key={day} style={{ textAlign: 'center', padding: '0.5rem 0.2rem', fontWeight: '700', color }}>
                                  {st}
                                </td>
                              );
                            })}
                            <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--status-present)' }}>{monthP}</td>
                            <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--status-absent)' }}>{monthA}</td>
                          </tr>
                        );
                      }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

function AppContent() {
  const { currentUser } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }, []);

  const isAdminRoute = currentPath === '/admin' || currentPath === '/admin/';

  // Route 1: Admin Route (/admin)
  if (isAdminRoute) {
    if (!currentUser) {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <AdminLogin onNavigateToEmployeeLogin={() => navigateTo('/')} />
        </Suspense>
      );
    }
    return <MainApp isForceAdminRoute={true} />;
  }

  // Route 2: Regular Employee / Main Route (/)
  if (!currentUser) {
    return <Login onNavigateToAdmin={() => navigateTo('/admin')} />;
  }

  return <MainApp isForceAdminRoute={false} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
