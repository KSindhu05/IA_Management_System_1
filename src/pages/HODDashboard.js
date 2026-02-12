import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';
import DashboardLayout from '../components/DashboardLayout';
import {
    LayoutDashboard, Users, FileText, CheckCircle, TrendingUp, BarChart2,
    AlertTriangle, Briefcase, Bell, Activity, Clock, Award,
    Edit, Save, LogOut, ShieldAlert, X, BookOpen, Layers, Megaphone, Calendar, MapPin, PenTool, Download, Mail
} from 'lucide-react';
import {
    departments, subjectsByDept, getStudentsByDept, englishMarks, mathsMarks,
    departmentStats, facultySubjects, facultyProfiles
} from '../utils/mockData';
import styles from './HODDashboard.module.css';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import logo from '../assets/college_logo.png';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, PointElement, LineElement, Filler
);

// Local fallbacks for removed mock data
const hodTrendData = { labels: ['2022', '2023', '2024'], datasets: [{ label: 'Pass %', data: [75, 80, 85], borderColor: '#3b82f6', fill: false }] };
const atRiskStudents = [];
const facultyWorkload = [];
const branchPerformanceData = {};
const iaSubmissionStatus = { labels: ['Submitted', 'Pending'], datasets: [{ data: [70, 30], backgroundColor: ['#22c55e', '#ef4444'] }] };
const resourceRequests = [];
const hodData = {};
const hodBranchComparison = {};

const HODDashboard = ({ isSpectator = false, spectatorDept = null }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedDept, setSelectedDept] = useState('CS');
    const [deptStudents, setDeptStudents] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [isMyDept, setIsMyDept] = useState(true);

    // Spectator Mode Effect
    useEffect(() => {
        if (isSpectator && spectatorDept) {
            setSelectedDept(spectatorDept);
            setIsMyDept(true); // Principal can view any dept
        }
    }, [isSpectator, spectatorDept]);

    const [editingMarks, setEditingMarks] = useState({});
    const [viewingSubject, setViewingSubject] = useState(null);

    // Student Profile State
    const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
    const [studentMarksProfile, setStudentMarksProfile] = useState([]);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // API State
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [subjectMarks, setSubjectMarks] = useState({});
    const [analytics, setAnalytics] = useState(null);
    const [subjectMarksData, setSubjectMarksData] = useState({});

    // Announcement State
    const [departmentAnnouncements, setDepartmentAnnouncements] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);

    // CIE Schedule Form State
    const [scheduleForm, setScheduleForm] = useState({
        cieNumber: 1,
    });

    // Pending Approvals State
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [expandedApprovals, setExpandedApprovals] = useState({});

    // Notification State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Overview data (real from API)
    const [departmentAlerts, setDepartmentAlerts] = useState([]);
    const [hodGradeDistribution, setHodGradeDistribution] = useState({
        labels: ['A', 'B', 'C', 'D', 'F'],
        datasets: [{ data: [0, 0, 0, 0, 0], backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'] }]
    });

    const toggleExpansion = (index) => {
        setExpandedApprovals(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // Faculty Management State
    const [viewingFaculty, setViewingFaculty] = useState(null);
    const [messagingFaculty, setMessagingFaculty] = useState(null);
    const [messageText, setMessageText] = useState('');

    const handleViewDashboard = (faculty) => {
        // In a real app, this might navigate to a specific route or fetch detailed stats.
        // For now, we open a summary modal with their subjects and performance.
        setViewingFaculty(faculty);
    };

    const handleMessage = (faculty) => {
        setMessagingFaculty(faculty);
        setMessageText('');
    };

    const sendMessage = () => {
        if (!messageText.trim()) return;
        // Mock sending message
        alert(`Message sent to ${messagingFaculty.fullName || messagingFaculty.username}:\n\n"${messageText}"`);
        setMessagingFaculty(null);
        setMessageText('');
    };

    const menuItems = [
        { label: 'Dashboard Overview', path: '#overview', icon: <LayoutDashboard size={20} />, isActive: activeTab === 'overview', onClick: () => setActiveTab('overview') },
        { label: 'CIE Schedule', path: '#cie-schedule', icon: <Calendar size={20} />, isActive: activeTab === 'cie-schedule', onClick: () => setActiveTab('cie-schedule') },
        { label: 'IA Monitoring', path: '#monitoring', icon: <Activity size={20} />, isActive: activeTab === 'monitoring', onClick: () => setActiveTab('monitoring') },
        { label: 'Student Performance', path: '#performance', icon: <TrendingUp size={20} />, isActive: activeTab === 'performance', onClick: () => setActiveTab('performance') },
        { label: 'Faculty Management', path: '#faculty', icon: <Briefcase size={20} />, isActive: activeTab === 'faculty', onClick: () => setActiveTab('faculty') },
        { label: 'All Students', path: '#all-students', icon: <Users size={20} />, isActive: activeTab === 'all-students', onClick: () => setActiveTab('all-students') },
        { label: 'IA Approval Panel', path: '#approvals', icon: <CheckCircle size={20} />, isActive: activeTab === 'approvals', onClick: () => setActiveTab('approvals') },
        { label: 'Update Marks', path: '#marks', icon: <PenTool size={20} />, isActive: activeTab === 'update-marks', onClick: () => setActiveTab('update-marks') },
        { label: 'Notifications', path: '#notifications', icon: <Bell size={20} />, isActive: activeTab === 'notifications', onClick: () => setActiveTab('notifications') },
    ];


    const API_BASE = `${API_BASE_URL}/marks`;

    const handleAddFaculty = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.department = selectedDept;

        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const baseUrl = API_BASE.replace('/marks', '/hod');

            const response = await fetch(`${API_BASE_URL}/hod/faculty`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Faculty added successfully!');
                setShowAddFacultyModal(false);
                window.location.reload();
            } else {
                const err = await response.text();
                alert('Failed to add faculty: ' + err);
            }
        } catch (error) {
            console.error(error);
            alert('Error adding faculty');
        }
    };

    // Fetch faculty list on mount (needed for overview stat card)
    useEffect(() => {
        if (isMyDept && selectedDept && user?.token) {
            const fetchFaculty = async () => {
                try {
                    const headers = { 'Authorization': `Bearer ${user.token}` };
                    const response = await fetch(`${API_BASE_URL}/hod/faculty?department=${selectedDept}`, { headers });
                    if (response.ok) {
                        const data = await response.json();
                        setFacultyList(data);
                    }
                } catch (e) {
                    console.error("Failed to fetch faculty list", e);
                }
            };
            fetchFaculty();
        }
    }, [isMyDept, selectedDept, user]);

    // Fetch overview data (real alerts, grade distribution)
    useEffect(() => {
        if (isMyDept && selectedDept && user?.token) {
            const fetchOverview = async () => {
                try {
                    const headers = { 'Authorization': `Bearer ${user.token}` };
                    const response = await fetch(`${API_BASE_URL}/hod/overview?department=${selectedDept}`, { headers });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.alerts) setDepartmentAlerts(data.alerts);
                        if (data.gradeDistribution) {
                            setHodGradeDistribution({
                                labels: data.gradeDistribution.labels,
                                datasets: [{
                                    data: data.gradeDistribution.data,
                                    backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280']
                                }]
                            });
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch overview data", e);
                }
            };
            fetchOverview();
        }
    }, [isMyDept, selectedDept, user]);

    // Fetch Subject Marks Data for IA Monitoring
    useEffect(() => {
        if ((activeTab === 'monitoring' || activeTab === 'faculty') && isMyDept && subjects.length > 0 && deptStudents.length > 0) {
            const fetchSubjectMarks = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const marksDataBySubject = {};

                    for (const subject of subjects) {
                        try {
                            const response = await fetch(`${API_BASE_URL}/marks/subject/${subject.id}`, { headers });
                            if (response.ok) {
                                const marksData = await response.json();
                                marksDataBySubject[subject.name] = marksData;
                            }
                        } catch (e) {
                            console.error(`Failed to fetch marks for ${subject.name}`, e);
                        }
                    }
                    setSubjectMarksData(marksDataBySubject);
                } catch (e) {
                    console.error("Failed to fetch subject marks", e);
                }
            };
            fetchSubjectMarks();
        }
    }, [activeTab, isMyDept, subjects, deptStudents]);

    // Fetch Notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = user?.token;
                if (!token) return;
                const headers = { 'Authorization': `Bearer ${token}` };
                const response = await fetch(`${API_BASE_URL}/api/cie/hod/notifications`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    setNotifications(data);
                    setUnreadCount(data.filter(n => !n.isRead).length);
                }
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }
        };
        fetchNotifications();
    }, [user]);

    // Fetch pending approvals when tab is active
    useEffect(() => {
        if (activeTab === 'approvals' && isMyDept) {
            const fetchPendingApprovals = async () => {
                setApprovalLoading(true);
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const response = await fetch(`${API_BASE_URL}/marks/pending?department=${selectedDept}`, { headers });
                    if (response.ok) {
                        const data = await response.json();
                        setPendingApprovals(data);
                    }
                } catch (e) {
                    console.error("Failed to fetch pending approvals", e);
                } finally {
                    setApprovalLoading(false);
                }
            };
            fetchPendingApprovals();
        }
    }, [activeTab, isMyDept, selectedDept]);

    useEffect(() => {
        const userDept = 'CS'; // TODO: Get from user profile if strictly enforcing
        const isAuthorized = selectedDept === userDept; // For now assuming admin/HOD access
        setIsMyDept(true); // Allow viewing specific departments

        const fetchStudents = async () => {
            try {
                const token = user?.token;
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const response = await fetch(`${API_BASE_URL}/student/all?department=${selectedDept}`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    setDeptStudents(data);
                    setStudents(data);
                } else {
                    setDeptStudents([]);
                    setStudents([]);
                }
            } catch (e) {
                console.error("Failed to fetch students", e);
            }
        };

        if (selectedDept) {
            fetchStudents();
        } else {
            setDeptStudents([]); setStudents([]); setSubjects([]); setSelectedSubject(null);
        }
    }, [selectedDept, user]);

    useEffect(() => {
        if (isMyDept && selectedDept) {
            const fetchAnalytics = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const res = await fetch(`${API_BASE_URL}/analytics/department/${selectedDept}/stats`, { headers });
                    if (res.ok) { setAnalytics(await res.json()); }
                } catch (e) { console.error("Failed to fetch analytics", e); }
            };
            fetchAnalytics();
        }
    }, [isMyDept, selectedDept]);

    useEffect(() => {
        if (selectedSubject && selectedSubject.id) {
            const fetchMarks = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const response = await fetch(`${API_BASE_URL}/marks/subject/${selectedSubject.id}`, { headers });

                    if (response.ok) {
                        const marksData = await response.json();
                        console.log('Fetched Marks for Subject ' + selectedSubject.id, marksData);
                        const marksMap = {};

                        // Populate editingMarks from DB data
                        marksData.forEach(m => {
                            if (!marksMap[m.studentId]) marksMap[m.studentId] = {};
                            if (m.cieType === 'CIE1') marksMap[m.studentId].cie1 = m.marks;
                            if (m.cieType === 'CIE2') marksMap[m.studentId].cie2 = m.marks;
                            if (m.cieType === 'CIE3') marksMap[m.studentId].cie3 = m.marks;
                            if (m.cieType === 'CIE4') marksMap[m.studentId].cie4 = m.marks;
                            if (m.cieType === 'CIE5') marksMap[m.studentId].cie5 = m.marks;
                        });
                        setEditingMarks(marksMap);
                    }
                } catch (e) {
                    console.error("Failed to fetch marks for editing", e);
                }
            };
            fetchMarks();
        }
    }, [selectedSubject]);

    useEffect(() => {
        if (isMyDept && selectedDept === 'CS') {
            const fetchAnnouncements = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const response = await fetch(`${API_BASE_URL}/cie/hod/announcements`, { headers });
                    if (response.ok) { setDepartmentAnnouncements(await response.json()); }
                    else {
                        setDepartmentAnnouncements([{ id: 1, cieNumber: '1', scheduledDate: '2025-03-10', subject: { name: 'Python', code: '20CS31' }, faculty: { username: 'Wahida Banu' }, status: 'SCHEDULED' }]);
                    }
                } catch (e) { console.error("Failed to fetch announcements", e); }
            };
            fetchAnnouncements();
        }
    }, [isMyDept, selectedDept]);

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.cieNumber = scheduleForm.cieNumber;

        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const baseUrl = API_BASE.replace('/marks', '/hod');

            const response = await fetch(`${API_BASE_URL}/cie/announcements?subjectId=${data.subjectId}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('CIE Schedule Published Successfully!');
                setActiveTab('cie-schedule');
                window.location.reload();
            } else { alert('Failed to publish schedule'); }
        } catch (error) { console.error(error); alert('Error publishing schedule'); }
    };

    useEffect(() => {
        if (isMyDept) {
            const fetchSubjects = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    // Removed unused localhost URL
                    const response = await fetch(`${API_BASE_URL}/subjects/department/${selectedDept}`, { headers });
                    if (response.ok) { setSubjects(await response.json()); }
                } catch (e) { console.error("Failed to fetch subjects", e); }
            };
            fetchSubjects();
        }
    }, [activeTab, isMyDept, selectedDept]);

    const commonOptions = { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }, maintainAspectRatio: false };
    const doughnutOptions = { responsive: true, plugins: { legend: { position: 'right' } }, maintainAspectRatio: false };

    const handleLogout = () => { window.location.href = '/'; };

    const handleMarkChange = (studentId, field, value) => {
        let numValue = parseInt(value, 10);
        if (value === '') numValue = 0; else if (isNaN(numValue)) return;
        const max = 50; // Each CIE has max 50 marks
        if (numValue < 0) numValue = 0; if (numValue > max) numValue = max;
        setEditingMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: numValue } }));
    };

    const saveMarks = async () => {
        if (!selectedSubject) return;

        const payload = [];
        Object.keys(editingMarks).forEach(studentId => {
            const marks = editingMarks[studentId];
            if (marks.cie1 !== undefined) payload.push({ studentId, subjectId: selectedSubject.id, iaType: 'CIE1', co1: marks.cie1 });
            if (marks.cie2 !== undefined) payload.push({ studentId, subjectId: selectedSubject.id, iaType: 'CIE2', co1: marks.cie2 });
            if (marks.cie3 !== undefined) payload.push({ studentId, subjectId: selectedSubject.id, iaType: 'CIE3', co1: marks.cie3 });
            if (marks.cie4 !== undefined) payload.push({ studentId, subjectId: selectedSubject.id, iaType: 'CIE4', co1: marks.cie4 });
            if (marks.cie5 !== undefined) payload.push({ studentId, subjectId: selectedSubject.id, iaType: 'CIE5', co1: marks.cie5 });
        });

        if (payload.length === 0) {
            alert("No changes to save.");
            return;
        }

        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const response = await fetch(`${API_BASE_URL}/marks/update/batch`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Marks updated successfully!');
            } else {
                const err = await response.text();
                alert('Failed to update marks: ' + err);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating marks');
        }
    };

    const handleApproveMarks = async (subjectId, iaType) => {
        if (!window.confirm(`Are you sure you want to APPROVE marks for ${iaType}? This will lock these marks.`)) return;
        try {
            const token = user?.token;
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_BASE_URL}/marks/approve?subjectId=${subjectId}&iaType=${iaType}`, {
                method: 'POST',
                headers
            });
            if (response.ok) {
                alert('Marks approved successfully!');
                setPendingApprovals(prev => prev.filter(p => !(p.subjectId === subjectId && p.iaType === iaType)));
            } else {
                const err = await response.text();
                alert('Failed to approve: ' + err);
            }
        } catch (e) {
            console.error(e);
            alert('Error approving marks');
        }
    };

    const handleRejectMarks = async (subjectId, iaType) => {
        if (!window.confirm(`Are you sure you want to REJECT marks for ${iaType}? Faculty will need to resubmit.`)) return;
        try {
            const token = user?.token;
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_BASE_URL}/marks/reject?subjectId=${subjectId}&iaType=${iaType}`, {
                method: 'POST',
                headers
            });
            if (response.ok) {
                alert('Marks rejected. Faculty has been notified.');
                setPendingApprovals(prev => prev.filter(p => !(p.subjectId === subjectId && p.iaType === iaType)));
            } else {
                const err = await response.text();
                alert('Failed to reject: ' + err);
            }
        } catch (e) {
            console.error(e);
            alert('Error rejecting marks');
        }
    };

    const handleUnlockMarks = async (subjectId, iaType, subjectName) => {
        const reason = prompt(`Why are you unlocking ${subjectName} ${iaType} marks?\n(Optional - press OK to skip)`);

        if (reason === null) return; // User clicked Cancel

        if (!window.confirm(`Are you sure you want to UNLOCK ${subjectName} ${iaType} marks?\n\nThis will change the status from APPROVED to PENDING, allowing faculty to edit them again.`)) {
            return;
        }

        try {
            const token = user?.token;
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const response = await fetch(`${API_BASE_URL}/marks/unlock`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    subjectId,
                    iaType,
                    reason: reason || null
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Success: ${result.message || 'Marks unlocked successfully!'}\n\nFaculty can now edit these marks.`);
                // Reload page to show updated status
                window.location.reload();
            } else {
                const err = await response.json();
                console.error('Unlock failed response:', err);
                alert(`Failed to unlock: ${err.message || 'Unknown error'} (Status: ${response.status})`);
            }
        } catch (e) {
            console.error('Unlock error:', e);
            alert(`Error unlocking marks: ${e.message}. Check console for details.`);
        }
    };


    const AccessDeniedView = () => (
        <div className={styles.accessDeniedContainer}>
            <div className={styles.deniedContent}>
                <ShieldAlert size={64} className={styles.deniedIcon} />
                <h2>Restricted Access</h2>
                <p>You are not authorized to view or modify data for the <strong>{departments.find(d => d.id === selectedDept)?.name}</strong> department.</p>
                <div className={styles.warningNote}>
                    <AlertTriangle size={16} />
                    <span>This action has been logged. Please switch back to your assigned department (Computer Science).</span>
                </div>
                <button className={styles.backBtn} onClick={() => setSelectedDept('CS')}>Return to My Department</button>
            </div>
        </div>
    );

    const fetchStudentProfile = async (student) => {
        try {
            setSelectedStudentProfile(student);
            setStudentMarksProfile([]);
            setShowProfileModal(true);

            const token = user?.token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await fetch(`${API_BASE_URL}/marks/student/${student.id}`, { headers });

            if (response.ok) {
                const data = await response.json();
                setStudentMarksProfile(data);
            }
        } catch (e) {
            console.error("Failed to fetch student profile marks", e);
        }
    };

    const renderAllStudents = () => (
        <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader} style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className={styles.sectionTitle} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>All Students ({deptStudents.length})</h2>
                <div className={styles.headerActions}>
                    <button className={styles.primaryBtn} onClick={() => alert("Export Feature Coming Soon")}>
                        <Download size={18} /> Export List
                    </button>
                </div>
            </div>
            <div className={styles.tableContainer} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>Sl. No</th>
                            <th>Reg No</th>
                            <th>Student Name</th>
                            <th>Sem / Sec</th>
                            <th>Parent Phone</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deptStudents.map((std, index) => (
                            <tr key={std.id}>
                                <td style={{ color: '#64748b' }}>{index + 1}</td>
                                <td style={{ fontWeight: 600, color: '#1e293b' }}>{std.regNo}</td>
                                <td>{std.name}</td>
                                <td>{std.semester} - {std.section || 'A'}</td>
                                <td>{std.parentPhone || '-'}</td>
                                <td>
                                    <button
                                        className={styles.secondaryBtn}
                                        onClick={() => fetchStudentProfile(std)}
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Users size={14} /> View Profile
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderStudentProfileModal = () => {
        if (!showProfileModal || !selectedStudentProfile) return null;

        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }}>
                    <div className={styles.modalHeader}>
                        <div>
                            <h3 className={styles.modalTitle}>{selectedStudentProfile.name}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                {selectedStudentProfile.regNo} | {selectedStudentProfile.semester} Sem | Section {selectedStudentProfile.section || 'A'}
                            </p>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                Parent Contact: <strong>{selectedStudentProfile.parentPhone || 'Not Available'}</strong>
                            </p>
                        </div>
                        <button className={styles.closeBtn} onClick={() => setShowProfileModal(false)}>
                            <X size={24} />
                        </button>
                    </div>
                    <div className={styles.modalBody}>
                        <h4 style={{ marginBottom: '1rem', color: '#334155' }}>CIE Marks Overview</h4>
                        {studentMarksProfile.length > 0 ? (
                            <table className={styles.table} style={{ border: '1px solid #e2e8f0' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th>Subject</th>
                                        <th>CIE Type</th>
                                        <th>Marks Obtained</th>
                                        <th>Max Marks</th>
                                        <th>Attendance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentMarksProfile.map((mark, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{mark.subjectName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{mark.subjectCode}</div>
                                            </td>
                                            <td><span className={styles.statusBadge} style={{ background: '#e0f2fe', color: '#0369a1' }}>{mark.cieType}</span></td>
                                            <td style={{ fontWeight: 600 }}>{mark.marks}</td>
                                            <td style={{ color: '#64748b' }}>{mark.maxMarks}</td>
                                            <td>{mark.attendance}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                                No marks found for this student.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };


    // Extracted tab-rendering content into a reusable function
    const renderContent = () => (
        <>
            {activeTab === 'announcements' && (<div className={styles.announcementContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Department IA Schedule</h3><div style={{ display: 'flex', gap: '10px' }}><button className={styles.secondaryBtn}><Calendar size={16} /> Sync to Calendar</button><button className={styles.quickBtn} style={{ background: '#fef3c7', color: '#d97706' }}><ShieldAlert size={16} /> Check Conflicts</button></div></div><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Subject</th><th>CIE Round</th><th>Faculty</th><th>Scheduled Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{departmentAnnouncements.length > 0 ? departmentAnnouncements.map((ann, idx) => (<tr key={idx}><td style={{ fontWeight: 600 }}>{ann.subject?.name}</td><td><span className={styles.tag}>CIE-{ann.cieNumber}</span></td><td>{ann.faculty?.username}</td><td>{ann.scheduledDate}</td><td><span className={`${styles.statusBadge} ${styles.approved}`}>{ann.status || 'SCHEDULED'}</span></td><td><button className={styles.secondaryBtn} onClick={() => alert('Viewing details...')}>View</button></td></tr>)) : (<tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No announcements found.</td></tr>)}</tbody></table></div></div></div>)}
            {activeTab === 'notifications' && (<div className={styles.card}><h2 className={styles.cardTitle}>All Notifications</h2><div className={styles.notificationsList}>{notifications.length > 0 ? notifications.map(notif => (<div key={notif.id} className={`${styles.notifItem} ${!notif.isRead ? styles.unread : ''}`}><div className={styles.notifIcon}>{notif.type === 'INFO' ? <Bell size={20} /> : <AlertTriangle size={20} />}</div><div className={styles.notifContent}><p className={styles.notifMessage}>{notif.message}</p><span className={styles.notifTime}>{new Date(notif.createdAt).toLocaleString()}</span>{notif.category && <span className={styles.notifCategory}>{notif.category}</span>}</div></div>)) : (<div className={styles.emptyState}><Bell size={48} /><p>No notifications yet</p></div>)}</div></div>)}
            {activeTab === 'all-students' && renderAllStudents()}
            {activeTab === 'overview' && (<div className={styles.overviewContainer}><div className={styles.statsRow}><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.blue}`}><Users size={24} /></div><div className={styles.statInfo}><p>Total Students</p><h3>{deptStudents.length || 0}</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.green}`}><Briefcase size={24} /></div><div className={styles.statInfo}><p>Faculty Members</p><h3>{facultyList.length || 0}</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.purple}`}><FileText size={24} /></div><div className={styles.statInfo}><p>Dept. Average</p><h3>{analytics ? analytics.average : '-'}</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.orange}`}><Activity size={24} /></div><div className={styles.statInfo}><p>Pass Percentage</p><h3>{analytics ? analytics.passPercentage : '-'}%</h3></div></div></div><div className={styles.card} style={{ marginBottom: '1.5rem', padding: '1rem' }}><div className={styles.quickActions}><button className={styles.quickBtn} onClick={() => alert('Broadcasting message to all faculty...')}><Bell size={20} className={styles.textBlue} /><span>Broadcast Message</span></button><button className={styles.quickBtn} onClick={() => alert('Scheduling dept meeting...')}><Clock size={20} className={styles.textPurple} /><span>Schedule Meeting</span></button><button className={styles.quickBtn} onClick={() => alert('Downloading monthly report...')}><FileText size={20} className={styles.textGreen} /><span>Monthly Report</span></button><button className={styles.quickBtn} onClick={() => setActiveTab('update-marks')}><Edit size={20} className={styles.textOrange} /><span>Update Marks</span></button></div></div><div className={styles.gridTwoOne}><div className={styles.leftColumn}><div className={styles.card} style={{ marginBottom: '1.5rem' }}><div className={styles.cardHeader}><h3>Department Performance (Avg IA Score)</h3></div><div className={styles.circlesContainer}><div className={styles.circlesContainer}>{analytics ? [{ label: 'Avg Percentage', value: Math.round(((analytics.average || 0) / 50) * 100) }, { label: 'Pass Rate', value: analytics.passPercentage || 0 }, { label: 'Risk Factor', value: (analytics.totalStudents || deptStudents.length) > 0 ? Math.round(((analytics.atRiskCount || 0) / (analytics.totalStudents || deptStudents.length)) * 100) : 0 }].map((metric, index) => { const data = { labels: ['Metric', 'Remaining'], datasets: [{ data: [metric.value, 100 - metric.value], backgroundColor: ['#8b5cf6', '#f3f4f6'], borderWidth: 0, cutout: '70%' }] }; return (<div key={index} className={styles.circleItem}><div style={{ height: '120px', width: '120px', position: 'relative' }}><Doughnut data={data} options={{ ...doughnutOptions, plugins: { legend: { display: false }, tooltip: { enabled: false } } }} /><div className={styles.circleLabel}><span className={styles.circleValue}>{metric.value}%</span></div></div><p className={styles.circleName}>{metric.label}</p></div>); }) : <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading Analytics...</p>}</div></div></div></div><div className={styles.rightColumn}><div className={styles.card}><div className={styles.cardHeader}><h3>Recent Alerts</h3></div><div className={styles.alertList}>{departmentAlerts.map(alert => (<div key={alert.id} className={`${styles.alertItem} ${styles[alert.type]}`}><AlertTriangle size={16} /><div><p>{alert.message}</p><span>{alert.date}</span></div></div>))}</div></div></div></div></div>)}
            {activeTab === 'update-marks' && (<div className={styles.updateMarksContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Modify Student Marks</h3><div className={styles.filterGroup}><select className={styles.deptSelect} value={selectedSubject?.id || ''} onChange={(e) => { const sub = subjects.find(s => s.id === parseInt(e.target.value)); setSelectedSubject(sub); }}>{subjects.filter(sub => sub.name !== 'IC').map(sub => (<option key={sub.id} value={sub.id}>{sub.name}</option>))}</select><button className={styles.saveBtn} onClick={saveMarks}><Save size={16} /> Save Changes</button></div></div><p className={styles.helperText}>Edit marks directly in the table. Changes are tracked locally until saved. Max Marks: CIE-1 to CIE-5 (50 each) - Total (250)</p><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Sl. No.</th><th>Reg No</th><th>Student Name</th><th>Sem/Sec</th><th>CIE-1 (50)</th><th>CIE-2 (50)</th><th>CIE-3 (50)</th><th>CIE-4 (50)</th><th>CIE-5 (50)</th><th>Total (250)</th></tr></thead><tbody>{students.map((student, index) => { const editMark = editingMarks[student.id] || {}; const valCIE1 = editMark.cie1 !== undefined ? editMark.cie1 : ''; const valCIE2 = editMark.cie2 !== undefined ? editMark.cie2 : ''; const valCIE3 = editMark.cie3 !== undefined ? editMark.cie3 : ''; const valCIE4 = editMark.cie4 !== undefined ? editMark.cie4 : ''; const valCIE5 = editMark.cie5 !== undefined ? editMark.cie5 : ''; const total = (Number(valCIE1) || 0) + (Number(valCIE2) || 0) + (Number(valCIE3) || 0) + (Number(valCIE4) || 0) + (Number(valCIE5) || 0); return (<tr key={student.id}><td>{index + 1}</td><td>{student.regNo}</td><td>{student.name}</td><td>{student.semester} - {student.section}</td><td><input type="number" className={styles.markInput} value={valCIE1} max={50} onChange={(e) => handleMarkChange(student.id, 'cie1', e.target.value)} /></td><td><input type="number" className={styles.markInput} value={valCIE2} max={50} onChange={(e) => handleMarkChange(student.id, 'cie2', e.target.value)} /></td><td><input type="number" className={styles.markInput} value={valCIE3} max={50} onChange={(e) => handleMarkChange(student.id, 'cie3', e.target.value)} /></td><td><input type="number" className={styles.markInput} value={valCIE4} max={50} onChange={(e) => handleMarkChange(student.id, 'cie4', e.target.value)} /></td><td><input type="number" className={styles.markInput} value={valCIE5} max={50} onChange={(e) => handleMarkChange(student.id, 'cie5', e.target.value)} /></td><td style={{ fontWeight: 'bold' }}>{Math.min(total, 250)}</td></tr>); })}</tbody></table></div></div></div>)}
            {activeTab === 'monitoring' && (<div className={styles.monitoringContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Subject-wise IA Submission Status</h3><div className={styles.filterGroup}><select className={styles.deptSelect} style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}><option>All Semesters</option><option>2nd Semester</option><option>4th Semester</option></select></div></div><table className={styles.table}><thead><tr><th>Subject Name</th><th>Faculty</th><th>Status</th><th>Pending Count</th><th>Action</th></tr></thead><tbody>{subjects.filter(sub => sub.name !== 'IC' && sub.instructorName).map((subject, idx) => { const subjectMarks = subjectMarksData[subject.name] || []; const totalStudents = deptStudents.length; const studentsWithMarks = subjectMarks.filter(mark => mark.cie1Score !== null || mark.cie2Score !== null || mark.cie3Score !== null).length; const pendingCount = totalStudents - studentsWithMarks; let status = 'Pending'; if (pendingCount === 0) { status = 'Approved'; } else if (studentsWithMarks > 0) { status = 'Submitted'; } const facultyName = subject.instructorName || 'Not Assigned'; const facultyInitial = facultyName.charAt(0); return (<tr key={subject.id} style={{ transition: 'background 0.2s' }}><td style={{ fontWeight: 500 }}>{subject.name}</td><td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>{facultyInitial}</div><span>{facultyName}</span></div></td><td><span className={`${styles.statusBadge} ${status === 'Approved' ? styles.approved : status === 'Submitted' ? styles.submitted : styles.pending}`}>{status}</span></td><td>{pendingCount > 0 ? (<span style={{ color: '#ef4444', fontWeight: 500 }}>{pendingCount} Students</span>) : (<span style={{ color: '#94a3b8' }}>-</span>)}</td><td><button className={styles.secondaryBtn} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => setViewingSubject({ name: subject.name, subjectId: subject.id, faculty: facultyName, status: status, pendingCount: pendingCount })}>View</button></td></tr>); })}</tbody></table></div>{viewingSubject && (<div className={styles.modalOverlay} onClick={() => setViewingSubject(null)}><div className={styles.modalContent} onClick={e => e.stopPropagation()}><div className={styles.modalHeader}><h2>{viewingSubject.name}</h2><button className={styles.closeBtn} onClick={() => setViewingSubject(null)}><X size={24} /></button></div><div className={styles.modalBody}><p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>Faculty: <span style={{ color: '#111827', fontWeight: 600 }}>{viewingSubject.faculty}</span> <span className={`${styles.statusBadge} ${viewingSubject.status === 'Approved' ? styles.approved : viewingSubject.status === 'Submitted' ? styles.submitted : styles.pending}`} style={{ marginLeft: '10px' }}>{viewingSubject.status}</span></p><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Sl. No.</th><th>Reg No</th><th>Student Name</th><th>CIE-1</th><th>CIE-2</th><th>CIE-3</th><th>CIE-4</th><th>CIE-5</th><th>Total</th></tr></thead><tbody>{(() => { const subjectMarks = subjectMarksData[viewingSubject.name] || []; const studentsToShow = viewingSubject.status === 'Pending' ? deptStudents.filter(student => { const studentMark = subjectMarks.find(m => m.student?.regNo === student.regNo); return !studentMark || (studentMark.cie1Score === null && studentMark.cie2Score === null && studentMark.cie3Score === null); }) : deptStudents; return studentsToShow.map((student, index) => { const studentMark = subjectMarks.find(m => m.student?.regNo === student.regNo); const cie1 = studentMark?.cie1Score ?? '-'; const cie2 = studentMark?.cie2Score ?? '-'; const cie3 = studentMark?.cie3Score ?? '-'; const cie4 = studentMark?.cie4Score ?? '-'; const cie5 = studentMark?.cie5Score ?? '-'; const total = (studentMark?.cie1Score || 0) + (studentMark?.cie2Score || 0) + (studentMark?.cie3Score || 0) + (studentMark?.cie4Score || 0) + (studentMark?.cie5Score || 0); return (<tr key={student.id}><td>{index + 1}</td><td>{student.regNo}</td><td>{student.name}</td><td>{cie1}</td><td>{cie2}</td><td>{cie3}</td><td>{cie4}</td><td>{cie5}</td><td style={{ fontWeight: 'bold' }}>{studentMark ? total : '-'}</td></tr>); }); })()}</tbody></table></div></div></div></div>)}</div>)}
            {activeTab === 'performance' && (<div className={styles.performanceContainer}><div className={styles.statsRow}><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.blue}`}><Users size={24} /></div><div className={styles.statInfo}><p>Total Students</p><h3>{deptStudents.length || 0}</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.green}`}><TrendingUp size={24} /></div><div className={styles.statInfo}><p>Class Average</p><h3>{analytics?.average || 0}/50</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.purple}`}><Award size={24} /></div><div className={styles.statInfo}><p>Pass Rate</p><h3>{analytics?.passPercentage || 0}%</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.orange}`}><AlertTriangle size={24} /></div><div className={styles.statInfo}><p>At Risk</p><h3>{analytics?.atRiskCount || 0}</h3></div></div></div><div className={styles.gridTwo}><div className={styles.card}><div className={styles.cardHeader}><h3>CIE Performance Trend</h3><select className={styles.deptSelect} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}><option>All Subjects</option>{subjects.filter(s => s.name !== 'IC').map(s => (<option key={s.id}>{s.name}</option>))}</select></div><div className={styles.chartContainer}><Bar data={{ labels: ['CIE-1', 'CIE-2', 'CIE-3', 'CIE-4', 'CIE-5'], datasets: [{ label: 'Class Average', data: [38, 42, 35, 40, 44], backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'], borderRadius: 8 }] }} options={{ ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 50 } } }} /></div></div><div className={styles.card}><div className={styles.cardHeader}><h3>Grade Distribution</h3></div><div className={styles.doughnutContainer}><Doughnut data={hodGradeDistribution} options={doughnutOptions} /></div></div></div><div className={styles.card} style={{ marginTop: '1.5rem' }}><div className={styles.cardHeader}><h3>Subject-wise Performance</h3></div><table className={styles.table}><thead><tr><th>Subject</th><th>CIE-1 Avg</th><th>CIE-2 Avg</th><th>CIE-3 Avg</th><th>CIE-4 Avg</th><th>CIE-5 Avg</th><th>Overall</th><th>Pass %</th></tr></thead><tbody>{subjects.filter(s => s.name !== 'IC').slice(0, 5).map((sub, idx) => { const cieAvgs = [38, 42, 35, 40, 44].map(v => v + (idx * 2 - 4)); const overall = Math.round(cieAvgs.reduce((a, b) => a + b, 0) / 5); const passRate = 75 + (idx * 3); return (<tr key={sub.id}><td style={{ fontWeight: 600 }}>{sub.name}</td>{cieAvgs.map((avg, i) => (<td key={i}><span style={{ color: avg >= 40 ? '#16a34a' : avg >= 30 ? '#ca8a04' : '#dc2626', fontWeight: 500 }}>{avg}/50</span></td>))}<td style={{ fontWeight: 700 }}>{overall}/50</td><td><span className={`${styles.statusBadge} ${passRate >= 80 ? styles.approved : passRate >= 60 ? styles.submitted : styles.pending}`}>{passRate}%</span></td></tr>); })}</tbody></table></div><div className={styles.card} style={{ marginTop: '1.5rem' }}><div className={styles.cardHeader}><h3 style={{ color: '#dc2626' }}>⚠️ At-Risk Students (Action Required)</h3><button className={styles.secondaryBtn} style={{ fontSize: '0.85rem' }}><Download size={14} /> Export List</button></div><table className={styles.table}><thead><tr><th>Reg No</th><th>Student Name</th><th>Attendance</th><th>CIE Average</th><th>Issue</th><th>Action</th></tr></thead><tbody>{atRiskStudents.map((student) => (<tr key={student.id}><td>{student.rollNo}</td><td style={{ fontWeight: 500 }}>{student.name}</td><td><span style={{ color: student.attendance < 75 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{student.attendance}%</span></td><td><span style={{ color: student.avgMarks < 20 ? '#dc2626' : '#ca8a04', fontWeight: 600 }}>{student.avgMarks}/50</span></td><td><span className={styles.issueTag}>{student.issue}</span></td><td><div style={{ display: 'flex', gap: '0.5rem' }}><button className={styles.secondaryBtn} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => alert(`Sending notification to ${student.name}`)}>Notify</button><button className={styles.secondaryBtn} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => alert(`Scheduling meeting with ${student.name}`)}>Meet</button></div></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'faculty' && (<div className={styles.facultyContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Department Faculty ({facultyList.length})</h3><button className={styles.primaryBtn} onClick={() => setShowAddFacultyModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={16} /> Add New Faculty</button></div><div className={styles.facultyList} style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.5rem' }}>{facultyList.length > 0 ? facultyList.map(fac => (<div key={fac.id} className={styles.facultyItem} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', background: 'white', display: 'flex', flexDirection: 'column' }}><div className={styles.facProfile} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}><div className={styles.avatarSm} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{fac.fullName ? fac.fullName.charAt(0) : fac.username.charAt(0)}</div><div><p className={styles.facName} style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1e293b', margin: 0 }}>{fac.fullName || fac.username}</p><small className={styles.facStatus} style={{ color: '#64748b' }}>{fac.designation || 'Faculty Member'}</small></div></div><div style={{ marginBottom: '1rem', flex: 1 }}><span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Subjects ({fac.subjects?.length || 0})</span><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>{fac.subjects && fac.subjects.length > 0 ? fac.subjects.map((sub, i) => (<span key={i} style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#475569' }}>{sub}</span>)) : (<span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>No active subjects assigned</span>)}</div></div><div className={styles.facActions}><button className={styles.viewBtn} onClick={() => handleViewDashboard(fac)}><LayoutDashboard size={16} /> View Dashboard</button><button className={styles.msgBtn} onClick={() => handleMessage(fac)}><Mail size={16} /> Message</button></div></div>)) : (<div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#64748b' }}><Users size={48} style={{ marginBottom: '1rem', color: '#cbd5e1' }} /><p>No faculty members found for this department.</p></div>)}</div></div>{showAddFacultyModal && (<div className={styles.modalOverlay}><div className={styles.modalContent} style={{ maxWidth: '500px' }}><div className={styles.modalHeader}><h3>Add New Faculty</h3><button className={styles.closeBtn} onClick={() => setShowAddFacultyModal(false)}><X size={24} /></button></div><div className={styles.modalBody}><form onSubmit={handleAddFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}><div className={styles.formGroup}><label>Full Name</label><input name="fullName" required placeholder="e.g. Dr. John Doe" className={styles.input} /></div><div className={styles.formGroup}><label>Username</label><input name="username" required placeholder="jdoe" className={styles.input} /></div><div className={styles.formGroup}><label>Email</label><input name="email" type="email" required placeholder="john@college.edu" className={styles.input} /></div><div className={styles.formGroup}><label>Temporary Password</label><input name="password" required defaultValue="password123" className={styles.input} /></div><div className={styles.formGroup}><label>Designation</label><select name="designation" className={styles.input}><option>Assistant Professor</option><option>Associate Professor</option><option>Professor</option><option>Guest Faculty</option></select></div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}><button type="button" className={styles.secondaryBtn} onClick={() => setShowAddFacultyModal(false)}>Cancel</button><button type="submit" className={styles.primaryBtn} style={{ background: '#2563eb', color: 'white' }}>Create Account</button></div></form></div></div></div>)}{viewingFaculty && (<div className={styles.modalOverlay} onClick={() => setViewingFaculty(null)}><div className={styles.modalContent} style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}><div className={styles.modalHeader}><div><h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{viewingFaculty.fullName || viewingFaculty.username}</h2><span className={styles.badge} style={{ position: 'static', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', fontWeight: 500, fontSize: '0.85rem' }}>Dashboard Overview</span></div><button className={styles.closeBtn} onClick={() => setViewingFaculty(null)}><X size={24} /></button></div><div className={styles.modalBody}>{(() => {
                let totalAvg = 0;
                let evaluatedCount = 0;
                const subStats = (viewingFaculty.subjects || []).map(subName => {
                    const marks = subjectMarksData[subName] || [];
                    const validMarks = marks.filter(m => m.cie1Score !== null || m.cie2Score !== null || m.cie3Score !== null || m.cie4Score !== null || m.cie5Score !== null);
                    const avg = validMarks.length > 0 ? Math.round(validMarks.reduce((acc, m) => {
                        const scores = [m.cie1Score, m.cie2Score, m.cie3Score, m.cie4Score, m.cie5Score].filter(x => x !== null && x !== undefined);
                        const studentAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                        return acc + studentAvg;
                    }, 0) / validMarks.length) : 0;

                    if (validMarks.length > 0) evaluatedCount += validMarks.length;
                    totalAvg += avg;
                    return { name: subName, avg, count: validMarks.length };
                });
                const overall = subStats.length > 0 ? Math.round(totalAvg / subStats.length) : 0;

                return (<><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}><div className={styles.statCard} style={{ background: '#f8fafc', border: 'none' }}><div className={`${styles.iconBox} ${styles.blue}`}><TrendingUp size={20} /></div><div><p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Avg Class Score</p><h3 style={{ margin: 0, fontSize: '1.25rem' }}>{overall > 0 ? overall : '-'}/50</h3></div></div><div className={styles.statCard} style={{ background: '#f8fafc', border: 'none' }}><div className={`${styles.iconBox} ${styles.green}`}><CheckCircle size={20} /></div><div><p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Students Evaluated</p><h3 style={{ margin: 0, fontSize: '1.25rem' }}>{evaluatedCount}</h3></div></div></div><div><h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Assigned Subjects Performance</h4><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Subject</th><th>Avg Score</th><th>Status</th></tr></thead><tbody>{subStats.length > 0 ? subStats.map((s, i) => (<tr key={i}><td style={{ fontWeight: 500 }}>{s.name}</td><td>{s.avg || '-'}</td><td><span style={{ color: s.avg >= 35 ? '#16a34a' : s.avg >= 20 ? '#ca8a04' : '#dc2626', fontWeight: 600 }}>{s.avg >= 35 ? 'Good' : s.avg >= 20 ? 'Average' : 'Need Improvement'}</span></td></tr>)) : (<tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>No subjects found</td></tr>)}</tbody></table></div></div></>);
            })()}</div></div></div>)}{messagingFaculty && (<div className={styles.modalOverlay} onClick={() => setMessagingFaculty(null)}><div className={styles.modalContent} style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}><div className={styles.modalHeader}><h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={20} /> Message {messagingFaculty.username}</h3><button className={styles.closeBtn} onClick={() => setMessagingFaculty(null)}><X size={24} /></button></div><div className={styles.modalBody}><div className={styles.formGroup}><label>Message Content</label><textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your message here..." className={styles.input} style={{ minHeight: '120px', resize: 'vertical' }} autoFocus></textarea></div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}><button className={styles.secondaryBtn} onClick={() => setMessagingFaculty(null)}>Cancel</button><button className={styles.primaryBtn} onClick={sendMessage} disabled={!messageText.trim()} style={{ opacity: !messageText.trim() ? 0.6 : 1 }}>Send Message</button></div></div></div></div>)}</div>)}
            {activeTab === 'approvals' && (<div className={styles.approvalsContainer}><div className={styles.infoBanner}><CheckCircle size={20} /><p>You have <strong>{pendingApprovals.length}</strong> IA Bundles pending for final approval.</p></div>{approvalLoading ? (<div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading pending submissions...</div>) : pendingApprovals.length === 0 ? (<div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}><CheckCircle size={48} style={{ marginBottom: '1rem', color: '#10b981' }} /><p>No pending submissions. All marks have been reviewed!</p></div>) : (pendingApprovals.map((approval, idx) => (<div key={idx} className={styles.approvalCard}><div className={styles.approvalHeader}><div><h4>{approval.subjectName}</h4><span>{approval.iaType} Marks | Faculty: {approval.facultyName} | {approval.studentCount} students</span></div><div className={styles.approvlActions}><button className={styles.rejectBtn} onClick={() => handleRejectMarks(approval.subjectId, approval.iaType)}>Reject</button><button className={styles.approveBtn} onClick={() => handleApproveMarks(approval.subjectId, approval.iaType)}>Approve & Lock</button></div></div><table className={styles.miniTable}><thead><tr><th>Reg No</th><th>Student</th><th>Marks</th></tr></thead><tbody>{(expandedApprovals[idx] ? approval.marks : approval.marks?.slice(0, 3)).map(st => (<tr key={st.studentId}><td>{st.regNo}</td><td>{st.studentName}</td><td>{st.totalScore}/50</td></tr>))}{approval.marks?.length > 3 && (<tr onClick={() => toggleExpansion(idx)} style={{ cursor: 'pointer', background: '#f8fafc' }}><td colSpan="3" style={{ textAlign: 'center', color: '#2563eb', fontWeight: 500 }}>{expandedApprovals[idx] ? 'Show Less' : `+ ${approval.marks.length - 3} more records (Click to expand)`}</td></tr>)}</tbody></table></div>)))}<div className={styles.card} style={{ marginTop: '1.5rem' }}><div className={styles.cardHeader}><h3>🔓 Unlock Approved Marks</h3><p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>Unlock approved marks to allow faculty to make corrections</p></div><div style={{ padding: '1.5rem' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}><div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Subject</label><select className={styles.select} id="unlockSubject" style={{ width: '100%', padding: '0.6rem' }}><option value="">Select Subject</option>{subjects.filter(s => s.name !== 'IC').map(subject => (<option key={subject.id} value={subject.id}>{subject.name} - {subject.instructorName}</option>))}</select></div><div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>CIE Type</label><select className={styles.select} id="unlockCIE" style={{ width: '100%', padding: '0.6rem' }}><option value="CIE1">CIE-1</option><option value="CIE2">CIE-2</option><option value="CIE3">CIE-3</option><option value="CIE4">CIE-4</option><option value="CIE5">CIE-5</option></select></div><button className={styles.dangerBtn} onClick={() => { const subjectId = document.getElementById('unlockSubject').value; const cieType = document.getElementById('unlockCIE').value; if (!subjectId) { alert('Please select a subject'); return; } const subject = subjects.find(s => s.id === parseInt(subjectId)); handleUnlockMarks(subjectId, cieType, subject?.name || 'Selected Subject'); }} style={{ padding: '0.6rem 1.5rem' }}>Unlock Marks</button></div><div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', fontSize: '0.85rem' }}><strong>⚠️ Warning:</strong> Unlocking marks will change their status from APPROVED to PENDING, allowing faculty to edit them again.</div></div></div></div>)}
            {activeTab === 'analytics' && (<div className={styles.analyticsContainer}><div className={styles.gridTwo}><div className={styles.card}><h3>IA Submission Status</h3><div className={styles.doughnutContainer}><Pie data={iaSubmissionStatus} options={doughnutOptions} /></div></div><div className={styles.card}><h3>Year-on-Year Improvement</h3><div className={styles.chartContainer}><Line data={hodTrendData} options={commonOptions} /></div></div></div><div className={styles.card} style={{ marginTop: '1.5rem' }}><h3>Download Reports</h3><div className={styles.downloadOptions}><button className={styles.downloadBtn}><FileText size={16} /> Department IA Report (PDF)</button><button className={styles.downloadBtn}><FileText size={16} /> Consolidated Marks Sheet (Excel)</button><button className={styles.downloadBtn}><FileText size={16} /> Low Performers List (CSV)</button></div></div></div>)}
            {activeTab === 'lesson-plans' && (<div className={styles.lessonPlansContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Department Syllabus Progress</h3></div><div className={styles.gridContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(350px,1fr))', gap: '1.5rem', marginTop: '1rem' }}>{subjectsByDept[selectedDept]?.map((subName, idx) => { const subId = idx + 1; const realSub = subjects.find(s => s.name === subName); const idToUse = realSub ? realSub.id : subId; const savedTracker = localStorage.getItem('syllabusTracker'); const progress = savedTracker ? (JSON.parse(savedTracker)[idToUse] || {}) : {}; const savedStructure = localStorage.getItem('syllabusStructure'); const structure = savedStructure ? (JSON.parse(savedStructure)[idToUse] || []) : []; const savedCie = localStorage.getItem('cieSelector'); const cieSelector = savedCie ? (JSON.parse(savedCie)[idToUse] || {}) : {}; const units = structure.length > 0 ? structure : [{ id: 'u1', name: 'Unit 1: Introduction' }, { id: 'u2', name: 'Unit 2: Core Concepts' }, { id: 'u3', name: 'Unit 3: Advanced Topics' }, { id: 'u4', name: 'Unit 4: Application' }, { id: 'u5', name: 'Unit 5: Case Studies' }]; const completedCount = units.filter(u => progress[u.id]).length; const totalUnits = units.length; const percent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0; return (<div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}><div><h4 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#111827' }}>{subName}</h4><span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Faculty: {facultyWorkload[idx % facultyWorkload.length]?.name || 'Unknown'}</span></div><div style={{ textAlign: 'right' }}><span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: percent === 100 ? '#10b981' : '#3b82f6' }}>{percent}%</span></div></div><div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}><div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? '#10b981' : '#3b82f6', transition: 'width 0.5s ease' }}></div></div><div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{units.slice(0, 3).map(u => (<div key={u.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: progress[u.id] ? '#374151' : '#9ca3af' }}><div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid', borderColor: progress[u.id] ? '#10b981' : '#d1d5db', background: progress[u.id] ? '#10b981' : 'transparent', marginRight: '8px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{progress[u.id] && <CheckCircle size={10} color="white" />}</div><span style={{ textDecoration: progress[u.id] ? 'line-through' : 'none', marginRight: '8px' }}>{u.name}</span>{cieSelector[u.id] && (<span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7c3aed', backgroundColor: '#f5f3ff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #7c3aed', marginLeft: 'auto' }}>CIE</span>)}</div>))}{units.length > 3 && (<div style={{ fontSize: '0.8rem', color: '#6b7280', paddingLeft: '24px' }}>+ {units.length - 3} more topics</div>)}</div></div>); })}</div></div></div>)}
            {activeTab === 'cie-schedule' && (<div className={styles.cieScheduleContainer}><div className={styles.gridTwo}><div className={styles.card}><h3>Schedule New CIE Exam</h3><form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}><div className={styles.formGroup}><label>Select Subject</label><select name="subjectId" required className={styles.deptSelect} style={{ width: '100%' }}><option value="">-- Choose Subject --</option>{subjects.map(sub => (<option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>))}</select></div><div className={styles.formGroup}><label>CIE Number</label><div style={{ display: 'flex', gap: '0.5rem' }}>{[1, 2, 3, 4, 5].map(num => (<label key={num} style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: scheduleForm.cieNumber === num ? '#eff6ff' : 'white', borderColor: scheduleForm.cieNumber === num ? '#3b82f6' : '#cbd5e1', color: scheduleForm.cieNumber === num ? '#2563eb' : '#64748b', fontWeight: scheduleForm.cieNumber === num ? '600' : '400' }}><input type="radio" name="cieNumber" value={num} checked={scheduleForm.cieNumber === num} onChange={() => setScheduleForm({ ...scheduleForm, cieNumber: num })} style={{ display: 'none' }} />CIE-{num}</label>))}</div></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}><div className={styles.formGroup}><label>Date</label><input type="date" name="scheduledDate" required className={styles.input} /></div><div className={styles.formGroup}><label>Time</label><input type="time" name="startTime" required className={styles.input} /></div></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}><div className={styles.formGroup}><label>Duration (mins)</label><input type="number" name="durationMinutes" defaultValue="60" className={styles.input} /></div><div className={styles.formGroup}><label>Room / Hall</label><input name="examRoom" placeholder="e.g. LH-201" className={styles.input} /></div></div><div className={styles.formGroup}><label>Integration Instructions (Optional)</label><textarea name="instructions" placeholder="Special instructions for faculty/students..." className={styles.input} style={{ minHeight: '80px', resize: 'vertical' }}></textarea></div><button type="submit" className={styles.primaryBtn} style={{ marginTop: '0.5rem', justifyContent: 'center' }}><Megaphone size={18} /> Publish Schedule</button></form></div><div className={styles.card}><h3>Upcoming Scheduled Exams</h3><div className={styles.alertList}>{departmentAnnouncements.length > 0 ? departmentAnnouncements.map(ann => (<div key={ann.id} className={`${styles.alertItem} ${styles.info}`} style={{ alignItems: 'center' }}><div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', minWidth: '60px' }}><span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>{new Date(ann.scheduledDate).getDate()}</span><span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>{new Date(ann.scheduledDate).toLocaleString('default', { month: 'short' })}</span></div><div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#1e293b' }}>{ann.subject ? ann.subject.name : 'Unknown Subject'} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>({ann.subject?.code})</span></h4><span className={styles.statusBadge} style={{ background: '#dbeafe', color: '#1e40af' }}>CIE-{ann.cieNumber}</span></div><p style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: '#475569', fontSize: '0.85rem' }}><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {ann.startTime || '10:00 AM'} ({ann.durationMinutes}m)</span>{ann.examRoom && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {ann.examRoom}</span>}</p></div></div>)) : (<div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No exams scheduled yet.</div>)}</div></div></div></div>)}
            {activeTab === 'reports' && (<div className={styles.sectionContainer}><h2 className={styles.sectionTitle}>Reports & Archives</h2><div className={styles.cardsGrid}><div className={styles.card}><div className={styles.cardHeader}><h3 className={styles.cardTitle}>IA Marks Report</h3></div><div style={{ padding: '1rem', color: '#666' }}><p>Download comprehensive PDF report of IA marks for all subjects in {selectedDept}.</p><button className={styles.primaryBtn} style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={() => window.open(`${API_BASE_URL}/reports/marks/${selectedDept}/pdf`, '_blank')}><Download size={18} /> Download PDF</button></div></div></div></div>)}
        </>
    );


    if (isSpectator) {
        // Spectator mode (embedded from PrincipalDashboard) - no DashboardLayout
        return (
            <div style={{ padding: '1rem', height: 'auto', overflow: 'visible' }}>
                <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{departments.find(d => d.id === selectedDept)?.name} Console</h2>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>Read-Only Mode</span>
                    </div>
                    <nav style={{ display: 'flex', gap: '10px' }}>
                        {menuItems.filter(m => ['overview', 'monitoring', 'performance', 'all-students'].includes(m.path.replace('#', ''))).map((item, index) => (
                            <button key={index}
                                onClick={() => setActiveTab(item.path.replace('#', ''))}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                    background: activeTab === item.path.replace('#', '') ? '#3b82f6' : 'transparent',
                                    color: activeTab === item.path.replace('#', '') ? 'white' : '#64748b',
                                    cursor: 'pointer', fontWeight: 500
                                }}>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </header>
                <div>
                    {!isMyDept ? (<AccessDeniedView />) : renderContent()}
                </div>
                {renderStudentProfileModal()}
            </div>
        );
    }

    return (
        <DashboardLayout menuItems={menuItems}>
            {/* Faculty-style Header */}
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className={styles.welcomeTextBig}>Hello, {user?.fullName || user?.username}</h1>
                        <p className={styles.subtitle}>Head of {departments.find(d => d.id === selectedDept)?.name} | HOD</p>
                    </div>
                </div>
            </header>
            <div className={styles.scrollableContent}>
                {!isMyDept ? (<AccessDeniedView />) : renderContent()}
            </div>
            {renderStudentProfileModal()}
        </DashboardLayout>
    );
};

export default HODDashboard;
