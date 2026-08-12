import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import { 
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
  UserCheck,
  User,
  Info
} from 'lucide-react';

import EmployeePortal from './components/EmployeePortal';

const INITIAL_EMPLOYEES = [
  { id: 1, name: 'Munibah Khan', designation: 'Software Engineer', department: 'Engineering' },
  { id: 2, name: 'Ayesha Ahmed', designation: 'UI Designer', department: 'Design' },
  { id: 3, name: 'Zaid Bilal', designation: 'Backend Developer', department: 'Engineering' },
  { id: 4, name: 'Sarah Jenkins', designation: 'Project Manager', department: 'Management' },
  { id: 5, name: 'Tariq Mahmood', designation: 'QA Engineer', department: 'Quality Assurance' },
];

function MainApp() {
  const { currentUser, userRole, logout, isFirebaseConfigured } = useAuth();
  
  const [activeTab, setActiveTab] = useState('mark'); // 'mark' | 'register' | 'employees'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  // Employee roster
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);

  // New Employee form state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Engineering');

  // Attendance store
  const [attendanceData, setAttendanceData] = useState({
    [new Date().toISOString().split('T')[0]]: {
      1: 'P', 2: 'P', 3: 'L', 4: 'A', 5: 'H'
    }
  });

  const isAdmin = userRole === 'admin';

  // Real-time Firestore sync listeners
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubAttendance = subscribeToAttendance((data) => {
      setAttendanceData(prev => ({ ...prev, ...data }));
    });

    const unsubEmployees = subscribeToEmployees((list) => {
      if (list && list.length > 0) {
        setEmployees(list);
      }
    });

    return () => {
      unsubAttendance();
      unsubEmployees();
    };
  }, [isFirebaseConfigured]);

  // Mark attendance for an employee on selectedDate (Admin Only)
  const handleStatusChange = async (empId, status) => {
    if (!isAdmin) return; // Strict Admin Protection

    setAttendanceData(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [empId]: status
      }
    }));

    // Save to Firestore
    await saveAttendanceRecord(selectedDate, empId, status);
  };

  // Add new employee (Admin Only)
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newEmpName.trim()) return;

    const newEmp = {
      id: Date.now(),
      name: newEmpName.trim(),
      designation: newEmpRole.trim() || 'Team Member',
      department: newEmpDept
    };

    setEmployees(prev => [...prev, newEmp]);
    setNewEmpName('');
    setNewEmpRole('');

    await addEmployeeToFirestore(newEmp);
  };

  // Remove employee (Admin Only)
  const handleRemoveEmployee = async (id) => {
    if (!isAdmin) return;
    setEmployees(prev => prev.filter(e => e.id !== id));
    await deleteEmployeeFromFirestore(id);
  };

  // Calculate daily statistics for selectedDate
  const currentDayRecords = attendanceData[selectedDate] || {};
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalLeave = 0;

  employees.forEach(emp => {
    const st = currentDayRecords[emp.id];
    if (st === 'P') totalPresent++;
    else if (st === 'A') totalAbsent++;
    else if (st === 'L') totalLate++;
    else if (st === 'H') totalLeave++;
  });

  // Helper for Monthly Register days
  const getDaysInMonth = (yearMonthStr) => {
    const [year, month] = yearMonthStr.split('-').map(Number);
    const date = new Date(year, month, 0);
    const daysCount = date.getDate();
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  };

  const daysInMonth = getDaysInMonth(selectedMonth);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* Header Banner */}
      <header className="glass-panel app-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="brand">
          <div className="brand-icon">
            <CheckSquare size={24} />
          </div>
          <div>
            <h1 className="brand-title">Attendance Tracker</h1>
            <p className="brand-subtitle">Firebase Auth & Cloud Firestore Database</p>
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
              <div style={{ fontWeight: '700', lineHeight: 1.2 }}>{currentUser?.displayName || currentUser?.email}</div>
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

      {/* RENDER EMPLOYEE PORTAL IF EMPLOYEE ROLE */}
      {!isAdmin ? (
        <EmployeePortal 
          currentUser={currentUser}
          employees={employees}
          attendanceData={attendanceData}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
        />
      ) : (
        /* RENDER ADMIN CONTROLS IF ADMIN ROLE */
        <>
          {/* Navigation Tabs for Admin */}
          <div className="glass-panel" style={{ padding: '0.5rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button 
              className={`pill-btn ${activeTab === 'mark' ? 'active' : ''}`}
              onClick={() => setActiveTab('mark')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Calendar size={16} /> Mark Attendance
            </button>

            <button 
              className={`pill-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CalendarDays size={16} /> Monthly Register
            </button>

            <button 
              className={`pill-btn ${activeTab === 'employees' ? 'active' : ''}`}
              onClick={() => setActiveTab('employees')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Users size={16} /> Employees ({employees.length})
            </button>
          </div>

      {/* TAB 1: MARK ATTENDANCE */}
      {activeTab === 'mark' && (
        <div>
          <div className="glass-panel controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span className="badge badge-present">Present: {totalPresent}</span>
              <span className="badge badge-late">Late: {totalLate}</span>
              <span className="badge badge-absent">Absent: {totalAbsent}</span>
              <span className="badge badge-leave">Leave: {totalLeave}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)' }}>Total: {employees.length}</span>
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
                {employees.map((emp, index) => {
                  const status = currentDayRecords[emp.id] || '';
                  return (
                    <tr key={emp.id}>
                      <td style={{ color: 'var(--text-dim)', fontWeight: '600' }}>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{emp.name}</div>
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
                            onClick={() => handleStatusChange(emp.id, 'P')}
                          >
                            Present (P)
                          </button>
                          <button 
                            className={`status-btn late ${status === 'L' ? 'active' : ''}`}
                            onClick={() => handleStatusChange(emp.id, 'L')}
                          >
                            Late (L)
                          </button>
                          <button 
                            className={`status-btn absent ${status === 'A' ? 'active' : ''}`}
                            onClick={() => handleStatusChange(emp.id, 'A')}
                          >
                            Absent (A)
                          </button>
                          <button 
                            className={`status-btn leave ${status === 'H' ? 'active' : ''}`}
                            onClick={() => handleStatusChange(emp.id, 'H')}
                          >
                            Leave (H)
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY REGISTER */}
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
                {employees.map(emp => {
                  let monthP = 0;
                  let monthA = 0;

                  return (
                    <tr key={emp.id}>
                      <td style={{ position: 'sticky', left: 0, background: '#121826', zIndex: 1, fontWeight: '700' }}>
                        {emp.name}
                      </td>
                      {daysInMonth.map(day => {
                        const dayStr = `${selectedMonth}-${day < 10 ? '0' + day : day}`;
                        const st = attendanceData[dayStr]?.[emp.id] || '-';
                        
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEES (Admin Only) */}
      {activeTab === 'employees' && isAdmin && (
        <div>
          <div className="glass-panel controls-bar" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem' }}>Add New Employee</h3>
            <form onSubmit={handleAddEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Employee Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ali Raza"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
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

              <button type="submit" className="btn btn-primary" style={{ height: '42px', justifyContent: 'center' }}>
                <UserPlus size={16} /> Add Employee
              </button>
            </form>
          </div>

          <div className="glass-panel table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
                  <tr key={emp.id}>
                    <td style={{ color: 'var(--text-dim)', fontWeight: '600' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{emp.name}</td>
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
                        onClick={() => handleRemoveEmployee(emp.id)}
                        title="Remove Employee"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
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
  return currentUser ? <MainApp /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
