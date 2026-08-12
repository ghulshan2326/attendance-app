import React, { useState } from 'react';
import { 
  User, 
  Calendar, 
  CalendarDays, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  Award, 
  Info,
  Building,
  Briefcase
} from 'lucide-react';

export default function EmployeePortal({ 
  currentUser, 
  employees, 
  attendanceData, 
  selectedMonth, 
  setSelectedMonth 
}) {
  // Find current employee record matching user displayName or email, default to first employee
  const currentEmployee = employees.find(emp => 
    (emp.name && currentUser?.displayName && emp.name.toLowerCase() === currentUser.displayName.toLowerCase()) ||
    (emp.email && currentUser?.email && emp.email.toLowerCase() === currentUser.email.toLowerCase())
  ) || employees[0] || { id: 1, name: currentUser?.displayName || 'Employee', designation: 'Team Member', department: 'General' };

  // Calculate monthly days
  const getDaysInMonth = (yearMonthStr) => {
    const [year, month] = yearMonthStr.split('-').map(Number);
    const date = new Date(year, month, 0);
    const daysCount = date.getDate();
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(year, month - 1, i + 1);
      return {
        dayNum: i + 1,
        dateStr: `${yearMonthStr}-${(i + 1) < 10 ? '0' + (i + 1) : (i + 1)}`,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' })
      };
    });
  };

  const monthDays = getDaysInMonth(selectedMonth);

  // Calculate stats for the current employee
  let totalRecorded = 0;
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let leaveCount = 0;

  // Search through all dates in attendanceData for this employee
  Object.keys(attendanceData).forEach(dateStr => {
    const status = attendanceData[dateStr]?.[currentEmployee.id];
    if (status) {
      totalRecorded++;
      if (status === 'P') presentCount++;
      else if (status === 'L') lateCount++;
      else if (status === 'A') absentCount++;
      else if (status === 'H') leaveCount++;
    }
  });

  // Calculate attendance percentage: (P + 0.75*L + 0.5*H) / totalRecorded * 100
  const attendancePercentage = totalRecorded > 0 
    ? Math.min(100, Math.round(((presentCount + (lateCount * 0.75) + (leaveCount * 0.5)) / totalRecorded) * 100))
    : 100;

  // Get status color and badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'P':
        return (
          <span className="badge badge-present" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={13} /> Present
          </span>
        );
      case 'L':
        return (
          <span className="badge badge-late" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock size={13} /> Late Arrival
          </span>
        );
      case 'A':
        return (
          <span className="badge badge-absent" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <XCircle size={13} /> Absent
          </span>
        );
      case 'H':
        return (
          <span className="badge badge-leave" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <AlertCircle size={13} /> Half Day / Leave
          </span>
        );
      default:
        return (
          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
            Not Marked
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Read-Only Notice Banner */}
      <div style={{ 
        background: 'rgba(99, 102, 241, 0.1)', 
        border: '1px solid rgba(99, 102, 241, 0.25)', 
        borderRadius: '12px', 
        padding: '0.85rem 1.1rem',
        fontSize: '0.85rem',
        color: 'var(--text-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={20} color="#818cf8" />
          <span>
            <strong>Employee View Portal:</strong> You are viewing your personal attendance record in <strong>Strictly View-Only Mode</strong>. Attendance modifications are reserved for Admins.
          </span>
        </div>
        <span className="badge" style={{ background: 'rgba(129, 140, 248, 0.2)', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🔒 Read-Only
        </span>
      </div>

      {/* Employee Profile Header Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
          }}>
            <User size={30} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
              {currentEmployee.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Briefcase size={14} color="#818cf8" /> {currentEmployee.designation}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building size={14} color="#3b82f6" /> {currentEmployee.department}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Score Highlights */}
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', textAlign: 'center', minWidth: '180px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Overall Attendance Rate
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: attendancePercentage >= 85 ? '#10b981' : attendancePercentage >= 70 ? '#f59e0b' : '#ef4444', margin: '0.2rem 0' }}>
            {attendancePercentage}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            {attendancePercentage >= 90 ? '🌟 Excellent' : attendancePercentage >= 75 ? '👍 Good' : '⚠️ Below Target'}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600' }}>Days Tracked</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--text-main)' }}>{totalRecorded}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', textAlign: 'center', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-present)', fontWeight: '700' }}>Present</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--status-present)' }}>{presentCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', textAlign: 'center', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-late)', fontWeight: '700' }}>Late</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--status-late)' }}>{lateCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', textAlign: 'center', borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-absent)', fontWeight: '700' }}>Absent</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--status-absent)' }}>{absentCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', textAlign: 'center', borderLeft: '3px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-leave)', fontWeight: '700' }}>Leave / Half Day</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--status-leave)' }}>{leaveCount}</div>
        </div>
      </div>

      {/* Monthly Attendance Log Table (Display-Only) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={20} color="#818cf8" /> My Attendance History
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              View-only register for your account ({currentEmployee.name})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select Month:</label>
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--bg-card-border)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Read-Only Table */}
        <div className="table-container">
          <table className="attendance-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Access Level</th>
              </tr>
            </thead>
            <tbody>
              {monthDays.map(({ dayNum, dateStr, dayName }) => {
                const status = attendanceData[dateStr]?.[currentEmployee.id] || '';
                const isWeekend = dayName === 'Sat' || dayName === 'Sun';

                return (
                  <tr key={dateStr} style={{ opacity: isWeekend && !status ? 0.6 : 1 }}>
                    <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                      {dateStr}
                    </td>
                    <td style={{ color: isWeekend ? '#f59e0b' : 'var(--text-muted)', fontWeight: isWeekend ? '700' : '400' }}>
                      {dayName} {isWeekend && '(Weekend)'}
                    </td>
                    <td>
                      {getStatusBadge(status)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', opacity: 0.7 }}>
                        🔒 Read-Only
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
